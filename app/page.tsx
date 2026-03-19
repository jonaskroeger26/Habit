'use client';

import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/solana/wallet-provider';
import { Flame, Users, TrendingUp, MessageSquare } from 'lucide-react';

export default function Home() {
  const { publicKey, connect, connecting } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold text-foreground">Habit Breaker</span>
          </div>
          <div className="flex gap-2">
            {publicKey && (
              <Button variant="outline" className="text-xs">
                {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
              </Button>
            )}
            <Button
              onClick={connect}
              disabled={connecting}
              className="bg-accent hover:bg-accent/90"
            >
              {connecting ? 'Connecting...' : publicKey ? 'Connected' : 'Connect Wallet'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-4 text-balance">
            Break Bad Habits,
            <span className="bg-gradient-to-r from-accent via-accent/80 to-accent/60 bg-clip-text text-transparent">
              {' '}Together
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-balance">
            Join a supportive community, track your progress, and stay motivated on your journey to overcome bad habits.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="group rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/40 hover:bg-card/80 transition-all">
            <TrendingUp className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Track Progress</h3>
            <p className="text-sm text-muted-foreground">Monitor your daily streaks and visualize progress.</p>
          </div>

          <div className="group rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/40 hover:bg-card/80 transition-all">
            <Users className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Community Support</h3>
            <p className="text-sm text-muted-foreground">Connect with others on the same journey.</p>
          </div>

          <div className="group rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/40 hover:bg-card/80 transition-all">
            <MessageSquare className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Real-time Chat</h3>
            <p className="text-sm text-muted-foreground">Get instant support from the community.</p>
          </div>

          <div className="group rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-6 hover:border-accent/40 hover:bg-card/80 transition-all">
            <Flame className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Leaderboards</h3>
            <p className="text-sm text-muted-foreground">Compete and stay motivated.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          {publicKey ? (
            <>
              <p className="text-foreground mb-6 text-lg">You're connected! Ready to start?</p>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">Connect your Solana wallet to get started</p>
              <Button
                size="lg"
                onClick={connect}
                disabled={connecting}
                className="bg-accent hover:bg-accent/90"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
