'use client';

import { useWallet } from '@/lib/solana/wallet-provider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletButton() {
  const { publicKey, connected, connecting, connect, disconnect } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (connected && publicKey) {
      handleWalletAuth();
    }
  }, [connected, publicKey]);

  const handleWalletAuth = async () => {
    if (!publicKey) return;

    setIsAuthenticating(true);
    try {
      // Store wallet in localStorage for now (will be replaced with Supabase)
      localStorage.setItem('walletAddress', publicKey);
      router.push('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{formatAddress(publicKey)}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          disabled={isAuthenticating}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={connecting}
      className="gap-2"
    >
      {connecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}
