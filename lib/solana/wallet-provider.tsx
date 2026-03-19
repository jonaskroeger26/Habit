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

  async function signLoginChallenge(walletPublicKey: string) {
    if (typeof window === 'undefined' || !window.solana?.signMessage) return;

    // Discord-like "login" UX: require user to sign a short challenge.
    const nonce = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const message = `Habit Breaker login nonce: ${nonce}`;

    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
    const signatureB64 = Buffer.from(signedMessage.signature).toString('base64');

    localStorage.setItem('wallet_login_nonce', nonce);
    localStorage.setItem('wallet_login_signature', signatureB64);
    localStorage.setItem('wallet_login_address', walletPublicKey);
  }

  async function ensureLoggedIn(walletPublicKey: string) {
    if (typeof window === 'undefined') return;

    const storedAddress = localStorage.getItem('wallet_login_address');
    const storedSignature = localStorage.getItem('wallet_login_signature');

    // If we already have a signature proof for this wallet, don't ask the user again.
    if (storedAddress === walletPublicKey && storedSignature) return;

    await signLoginChallenge(walletPublicKey);
  }

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
            const pk = response.publicKey.toString();
            setPublicKey(pk);
            setConnected(true);

            // Best-effort: signature is just a proof-of-intent for the app UI.
            // If it fails, we still keep the wallet connected.
            try {
              await ensureLoggedIn(pk);
            } catch (e) {
              console.warn('Login signature failed:', e);
            }
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
        const pk = response.publicKey.toString();
        setPublicKey(pk);
        setConnected(true);

        try {
          await ensureLoggedIn(pk);
        } catch (e) {
          console.warn('Login signature failed:', e);
        }
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
    localStorage.removeItem('wallet_login_nonce');
    localStorage.removeItem('wallet_login_signature');
    localStorage.removeItem('wallet_login_address');
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
