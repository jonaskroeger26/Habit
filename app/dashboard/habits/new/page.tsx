'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Flame, ArrowLeft } from 'lucide-react';
import { useWallet } from '@/lib/solana/wallet-provider';

const PRESET_CATEGORIES = [
  { id: 'smoking', name: 'Smoking', icon: '🚬' },
  { id: 'alcohol', name: 'Alcohol', icon: '🍷' },
  { id: 'social-media', name: 'Social Media', icon: '📱' },
  { id: 'sugar', name: 'Sugar', icon: '🍫' },
  { id: 'caffeine', name: 'Caffeine', icon: '☕' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'junk-food', name: 'Junk Food', icon: '🍔' },
  { id: 'procrastination', name: 'Procrastination', icon: '⏰' },
];

export default function NewHabitPage() {
  const { publicKey, initialized } = useWallet();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('habit_categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    }
  };

  const handleCreateHabit = async () => {
    if (!publicKey) return;
    if (!selectedCategory || !customName.trim()) {
      alert('Please select a category and enter a habit name');
      return;
    }

    setLoading(true);

    try {
      // Wallet-based user mapping (same approach as Dashboard)
      const { data: existingUser, error: userSelectError } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('wallet_address', publicKey)
        .maybeSingle();

      if (userSelectError) throw userSelectError;

      let userId: string;

      if (existingUser?.display_name) {
        userId = existingUser.id;
      } else {
        const fallbackName = publicKey.slice(0, 8);
        const { data: newUser, error: userInsertError } = await supabase
          .from('users')
          .insert({
            wallet_address: publicKey,
            display_name: fallbackName,
            current_streak: 0,
            best_streak: 0,
          })
          .select('id, display_name')
          .single();

        if (userInsertError) throw userInsertError;
        if (!newUser?.id) throw new Error('Failed to create user');
        userId = newUser.id;
      }

      const { data, error } = await supabase
        .from('user_habits')
        .insert({
          user_id: userId,
          category_id: selectedCategory,
          name: customName.trim(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating habit:', error);
        alert('Failed to create habit. Please try again.');
        return;
      }

      // This app does not have a habit detail route yet.
      // Redirect back to dashboard so the new habit appears.
      router.push('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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

  if (!publicKey) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold text-foreground">Habit Breaker</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Start Breaking a Habit
        </h1>
        <p className="text-muted-foreground mb-8">
          Begin your journey to a better version of yourself
        </p>

        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm p-8">
          {/* Category Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground mb-4">
              Select a Category
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCategory === category.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border/40 bg-card/50 hover:border-accent/40'
                  }`}
                >
                  <div className="text-lg font-semibold text-foreground">
                    {category.name}
                  </div>
                  {category.description && (
                    <div className="text-xs text-muted-foreground">
                      {category.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Habit Name
            </label>
            <input
              type="text"
              placeholder="e.g., No cigarettes after work"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent/40"
            />
          </div>

          {/* Reason */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Why do you want to quit? (Optional)
            </label>
            <textarea
              placeholder="Share your motivation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-background border border-border/40 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent/40 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-accent hover:bg-accent/90"
              onClick={handleCreateHabit}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Start Tracking'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
