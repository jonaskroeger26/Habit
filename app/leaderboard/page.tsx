'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/solana/wallet-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Flame, Medal, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  display_name: string;
  current_streak: number;
  best_streak: number;
}

export default function LeaderboardPage() {
  const { publicKey, disconnect, initialized } = useWallet();
  const supabase = createClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!initialized) return;
    
    if (!publicKey) {
      window.location.href = '/';
      return;
    }

    loadUserData();
    loadLeaderboard();
  }, [publicKey, initialized]);

  const loadUserData = async () => {
    try {
      if (!publicKey) return;

      const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('wallet_address', publicKey)
        .single();

      if (userData?.display_name) {
        setUserName(userData.display_name);
      } else {
        setUserName(publicKey.slice(0, 8));
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUserName(publicKey?.slice(0, 8) || 'User');
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, current_streak, best_streak')
        .order('current_streak', { ascending: false })
        .limit(100);

      if (data) {
        setEntries(data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await disconnect();
    window.location.href = '/';
  };

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
            >
              Dashboard
            </Button>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Medal className="w-8 h-8 text-accent" />
            <h1 className="text-4xl font-bold text-foreground">Leaderboard</h1>
            <Medal className="w-8 h-8 text-accent" />
          </div>
          <p className="text-muted-foreground">
            Compete with others and stay motivated on your habit-breaking journey
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card/50 border border-border/40 rounded-lg p-6 text-center">
            <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{entries.length}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="bg-card/50 border border-border/40 rounded-lg p-6 text-center">
            <Flame className="w-8 h-8 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {entries[0]?.current_streak || 0}
            </div>
            <div className="text-sm text-muted-foreground">Highest Streak</div>
          </div>
          <div className="bg-card/50 border border-border/40 rounded-lg p-6 text-center">
            <Medal className="w-8 h-8 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {entries.reduce((sum, e) => sum + (e.current_streak || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Days Clean</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-card/50 border border-border/40 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin mb-4">
                <Flame className="w-8 h-8 text-accent" />
              </div>
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No users yet. Be the first!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-background/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Current Streak</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Best Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/20 hover:bg-background/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Medal className="w-5 h-5 text-yellow-500" />}
                          {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                          {index === 2 && <Medal className="w-5 h-5 text-orange-600" />}
                          <span className="font-bold text-foreground">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{entry.display_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-accent" />
                          <span className="text-foreground font-semibold">{entry.current_streak || 0} days</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">{entry.best_streak || 0} days</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
