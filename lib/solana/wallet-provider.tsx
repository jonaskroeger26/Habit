'use client';

// Custom Solana wallet context - connects to Phantom wallet
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  initialized: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a SolanaWalletProvider');
  }
  return context;
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: () => void) => void;
      off: (event: string, callback: () => void) => void;
    };
  }
}

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      // If the user explicitly clicked "logout", don't auto-connect again.
      // Phantom can keep the last session around, and this app re-connects on mount.
      if (localStorage.getItem('wallet_disconnected') === 'true') {
        setInitialized(true);
        return;
      }

      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        try {
          const response = await window.solana.connect();
          if (response.publicKey) {
            setPublicKey(response.publicKey.toString());
            setConnected(true);
          }
        } catch {
          // User hasn't connected yet, that's fine
        }
      }
      setInitialized(true);
    };
    checkConnection();
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Re-enable auto-connect after an intentional connect.
    localStorage.setItem('wallet_disconnected', 'false');
    setConnecting(true);
    try {
      // Check for Phantom wallet
      if (window.solana?.isPhantom) {
        const response = await window.solana.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
      } else {
        // No wallet found, open Phantom website
        window.open('https://phantom.app/', '_blank');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined' && window.solana) {
      window.solana.disconnect();
    }
    // Prevent the auto-connect-on-mount behavior after logout.
    localStorage.setItem('wallet_disconnected', 'true');
    setPublicKey(null);
    setConnected(false);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (typeof window === 'undefined' || !window.solana) return null;
    
    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
      return Buffer.from(signedMessage.signature).toString('base64');
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        initialized,
        publicKey,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
