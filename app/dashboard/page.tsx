'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/lib/solana/wallet-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Flame, Plus, MessageCircle, TrendingUp } from 'lucide-react';

interface UserHabit {
  id: string;
  name: string;
  current_streak: number;
  best_streak?: number | null;
  last_checkin: string | null;
}

export default function DashboardPage() {
  const { publicKey, disconnect, initialized } = useWallet();
  const supabase = createClient();
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    // Wait for wallet to initialize before checking
    if (!initialized) return;
    
    if (!publicKey) {
      window.location.href = '/';
      return;
    }

    loadUserData();
  }, [publicKey, initialized]);

  // Keep countdown UI updated.
  useEffect(() => {
    if (!initialized) return;
    const t = window.setInterval(() => setNowTs(Date.now()), 10_000);
    return () => window.clearInterval(t);
  }, [initialized]);

  const loadUserData = async () => {
    setLoading(true);
    setDashboardError(null);
    setUserId(null);
    try {
      if (!publicKey) return;
      if (!supabase) throw new Error('Supabase is not configured (missing env vars).');

      // Get or create user profile by wallet address
      const { data: userData, error: userSelectError } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('wallet_address', publicKey)
        .maybeSingle();

      if (userSelectError) throw userSelectError;

      let userId: string;

      if (userData?.display_name) {
        setUserName(userData.display_name);
        userId = userData.id;
        setUserId(userId);
      } else {
        // Create user if doesn't exist
        const displayName = publicKey.slice(0, 8);
        const { data: newUser, error: userInsertError } = await supabase
          .from('users')
          .insert({
            wallet_address: publicKey,
            display_name: displayName,
            current_streak: 0,
            best_streak: 0,
          })
          .select()
          .single();

        if (userInsertError) throw userInsertError;
        
        if (newUser) {
          userId = newUser.id;
          setUserName(displayName);
          setUserId(userId);
        } else {
          setUserName(publicKey.slice(0, 8));
          setLoading(false);
          return;
        }
      }

      // Load user's habits
      const { data: habitsData, error: habitsSelectError } = await supabase
        .from('user_habits')
        .select('id, name, current_streak, best_streak, last_checkin')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (habitsSelectError) throw habitsSelectError;

      if (habitsData) {
        setHabits(habitsData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setDashboardError((error as any)?.message || String(error));
      setUserName(publicKey?.slice(0, 8) || 'User');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await disconnect();
    window.location.href = '/';
  };

  const habitsRef = useRef<UserHabit[]>([]);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const syncInProgressRef = useRef(false);

  const dayMs = 86400000;

  const computeCleanDays = (lastCheckin: string | null, nowMillis: number) => {
    if (!lastCheckin) return 0;
    const t = new Date(lastCheckin).getTime();
    if (Number.isNaN(t)) return 0;
    const diff = nowMillis - t;
    if (diff < 0) return 0;
    return Math.floor(diff / dayMs);
  };

  const computeTimeToNextCleanDay = (lastCheckin: string | null, nowMillis: number) => {
    if (!lastCheckin) return dayMs;
    const t = new Date(lastCheckin).getTime();
    if (Number.isNaN(t)) return dayMs;
    const diff = nowMillis - t;
    if (diff < 0) return dayMs;
    const mod = diff % dayMs;
    return mod === 0 ? 0 : dayMs - mod;
  };

  const startStopping = async (habitId: string) => {
    setCheckInMessage(null);
    if (!userId) return;

    const habit = habitsRef.current.find((h) => h.id === habitId);
    if (!habit) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    try {
      // Start/Restart: record when the user started being "clean".
      await supabase
        .from('user_habits')
        .update({
          last_checkin: nowIso,
          current_streak: 0, // will count up after 24h
          best_streak: habit.best_streak || 0, // keep best as-is
        })
        .eq('id', habitId);

      // Update local immediately for UI responsiveness.
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? {
                ...h,
                last_checkin: nowIso,
                current_streak: 0,
              }
            : h,
        ),
      );

      // Sync users streak to max across habits.
      const allHabits = habitsRef.current.map((h) =>
        h.id === habitId ? { ...h, last_checkin: nowIso } : h,
      );
      const maxCurrent = Math.max(
        ...allHabits.map((h) => computeCleanDays(h.last_checkin, now)),
        0,
      );
      const maxBest = Math.max(
        ...allHabits.map((h) => {
          const d = computeCleanDays(h.last_checkin, now);
          return Math.max(h.best_streak || 0, d);
        }),
        0,
      );

      await supabase
        .from('users')
        .update({
          current_streak: maxCurrent,
          best_streak: Math.max(maxBest, maxCurrent),
        })
        .eq('id', userId);

      setCheckInMessage('Countdown started!');
    } catch (error) {
      console.error('Error starting countdown:', error);
      setCheckInMessage((error as any)?.message || 'Failed to start countdown.');
    }
  };

  // Every ~20s, auto-advance streak when 24h boundaries pass.
  useEffect(() => {
    if (!userId) return;

    const syncOnce = async () => {
      if (syncInProgressRef.current) return;
      const now = Date.now();
      const currentHabits = habitsRef.current;

      const habitToSync = currentHabits.find((h) => {
        const daysClean = computeCleanDays(h.last_checkin, now);
        return daysClean > (h.current_streak || 0);
      });

      if (!habitToSync) return;

      syncInProgressRef.current = true;
      try {
        const daysClean = computeCleanDays(habitToSync.last_checkin, now);
        const nextBest = Math.max(habitToSync.best_streak || 0, daysClean);

        await supabase
          .from('user_habits')
          .update({
            current_streak: daysClean,
            best_streak: nextBest,
          })
          .eq('id', habitToSync.id);

        const allHabitsAfterUpdate = currentHabits.map((h) =>
          h.id === habitToSync.id
            ? { ...h, current_streak: daysClean, best_streak: nextBest }
            : h,
        );

        const maxCurrent = Math.max(
          ...allHabitsAfterUpdate.map((h) => computeCleanDays(h.last_checkin, now)),
          0,
        );
        const maxBest = Math.max(
          ...allHabitsAfterUpdate.map((h) => Math.max(h.best_streak || 0, computeCleanDays(h.last_checkin, now))),
          0,
        );

        await supabase
          .from('users')
          .update({
            current_streak: maxCurrent,
            best_streak: Math.max(maxBest, maxCurrent),
          })
          .eq('id', userId);

        // Update local state to prevent repeated sync calls.
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitToSync.id
              ? { ...h, current_streak: daysClean, best_streak: nextBest }
              : h,
          ),
        );
      } catch (error) {
        console.error('Error syncing clean streak:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Sync immediately, then keep updating.
    syncOnce();
    const t = window.setInterval(syncOnce, 20_000);
    return () => window.clearInterval(t);
  }, [userId]);

  // Show loading while wallet initializes
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-card to-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <Flame className="w-8 h-8 text-accent" />
          </div>
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold text-foreground">Habit Breaker</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">{userName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {dashboardError ? (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {dashboardError}
          </div>
        ) : null}

        {checkInMessage ? (
          <div className="mb-6 rounded-lg border border-border/40 bg-card/50 p-3 text-sm">
            {checkInMessage}
          </div>
        ) : null}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Track your habits and stay motivated</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div
            onClick={() => window.location.href = '/dashboard/habits/new'}
            className="bg-card/50 border border-dashed border-border/40 rounded-lg p-6 hover:border-accent/40 hover:bg-card/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
          >
            <Plus className="w-8 h-8 text-accent mb-2" />
            <div className="font-semibold text-foreground">Add Habit</div>
            <div className="text-xs text-muted-foreground">Start tracking</div>
          </div>

          <div className="bg-card/50 border border-border/40 rounded-lg p-6">
            <Flame className="w-8 h-8 text-accent mb-2" />
            <div className="text-2xl font-bold text-foreground">{habits.length}</div>
            <div className="text-xs text-muted-foreground">Habits Tracked</div>
          </div>

          <div
            onClick={() => window.location.href = '/community/chat'}
            className="bg-card/50 border border-border/40 rounded-lg p-6 hover:border-accent/40 hover:bg-card/80 transition-all cursor-pointer"
          >
            <MessageCircle className="w-8 h-8 text-accent mb-2" />
            <div className="font-semibold text-foreground text-sm">Community</div>
            <div className="text-xs text-muted-foreground">Get support</div>
          </div>

          <div
            onClick={() => window.location.href = '/leaderboard'}
            className="bg-card/50 border border-border/40 rounded-lg p-6 hover:border-accent/40 hover:bg-card/80 transition-all cursor-pointer"
          >
            <TrendingUp className="w-8 h-8 text-accent mb-2" />
            <div className="font-semibold text-foreground text-sm">Leaderboard</div>
            <div className="text-xs text-muted-foreground">View rankings</div>
          </div>
        </div>

        {/* Habits */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin mb-4">
                <Flame className="w-8 h-8 text-accent" />
              </div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : habits.length === 0 ? (
          <div className="bg-card/50 border border-dashed border-border/40 rounded-lg p-12 text-center">
            <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No habits yet</h3>
            <p className="text-muted-foreground mb-6">Start your journey by tracking your first habit</p>
            <Button
              className="bg-accent hover:bg-accent/90"
              onClick={() => window.location.href = '/dashboard/habits/new'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Habit
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="bg-card/50 border border-border/40 rounded-lg p-6 hover:border-accent/40 hover:bg-card/80 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{habit.name}</h3>
                  <Flame className="w-5 h-5 text-accent" />
                </div>

                {(() => {
                  const daysClean = computeCleanDays(habit.last_checkin, nowTs);
                  const timeToNextMs = computeTimeToNextCleanDay(habit.last_checkin, nowTs);
                  const totalSeconds = Math.max(0, Math.floor(timeToNextMs / 1000));
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;

                  const nextLabel = habit.last_checkin
                    ? daysClean >= 1
                      ? `Next clean day in ${hours}h ${minutes}m ${seconds}s`
                      : `Next clean day in ${hours}h ${minutes}m ${seconds}s`
                    : 'Start when you begin being clean';

                  return (
                    <>
                      <div className="mb-6">
                        <div className="text-3xl font-bold text-accent">
                          {daysClean}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Days clean
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {nextLabel}
                        </div>
                      </div>

                      <Button
                        onClick={() => startStopping(habit.id)}
                        className="w-full bg-accent hover:bg-accent/90"
                      >
                        {habit.last_checkin ? 'Restart countdown' : 'Stop habit (start)'}
                      </Button>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
