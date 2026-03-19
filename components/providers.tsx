'use client';

import React from 'react';
import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      {children}
    </SolanaWalletProvider>
  );
}
