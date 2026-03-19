'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/solana/wallet-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Flame } from 'lucide-react';

const AVATAR_BUCKET = 'avatars';

export default function SettingsPage() {
  const { publicKey, initialized } = useWallet();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  useEffect(() => {
    if (!initialized || !publicKey) return;
    if (!supabase) return;

    (async () => {
      try {
        const { data: userRow, error } = await supabase
          .from('users')
          .select('id, display_name, wallet_address')
          .eq('wallet_address', publicKey)
          .maybeSingle();

        if (error) throw error;

        const fallbackName = publicKey.slice(0, 8);

        if (userRow?.id) {
          setDisplayName(userRow.display_name || fallbackName);
          setAvatarUrl('');
        } else {
          // Create a minimal profile so settings can be saved.
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              wallet_address: publicKey,
              display_name: fallbackName,
              current_streak: 0,
              best_streak: 0,
            })
            .select('id, display_name')
            .single();

          if (insertError) throw insertError;

          setDisplayName(newUser?.display_name || fallbackName);
          setAvatarUrl('');
        }

        // Best-effort avatar load (skip if `avatar_url` column doesn't exist yet).
        try {
          const { data: avatarData, error: avatarError } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('wallet_address', publicKey)
            .maybeSingle();

          if (!avatarError && avatarData?.avatar_url) {
            setAvatarUrl(avatarData.avatar_url);
          }
        } catch {
          // ignore
        }
      } catch (e) {
        console.error('Error loading settings:', e);
        setMessage('Failed to load profile.');
      }
    })();
  }, [initialized, publicKey, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !publicKey) return;
    setSaving(true);
    setMessage(null);

    try {
      const name = displayName.trim();

      if (!name) {
        setMessage('Username is required.');
        return;
      }

      let nextAvatarUrl = avatarUrl;

      // If user selected a file, upload it to Supabase Storage first.
      if (avatarFile) {
        const fileName = avatarFile.name || 'avatar';
        const ext = (fileName.split('.').pop() || 'png').toLowerCase();
        const path = `${publicKey}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, avatarFile, {
            upsert: true,
            contentType: avatarFile.type || 'image/png',
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        nextAvatarUrl = data?.publicUrl || '';
      }

      const updatePayload: any = {
        display_name: name,
      };

      // Only set avatar_url if we have a value to store.
      if (nextAvatarUrl?.trim()) {
        updatePayload.avatar_url = nextAvatarUrl.trim();
      }

      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('wallet_address', publicKey);

      if (error) throw error;
      setMessage('Saved!');
      // Update local state so the page reflects the saved value immediately.
      if (nextAvatarUrl?.trim()) setAvatarUrl(nextAvatarUrl.trim());
      setAvatarFile(null);

      // Ensure the dashboard/chat reload and pick up the new avatar_url.
      window.setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (e) {
      console.error('Error saving settings:', e);
      const msg = (e as any)?.message || String(e);
      if (msg.toLowerCase().includes('avatar_url') || msg.toLowerCase().includes('column')) {
        setMessage('Failed to save avatar: add `avatar_url` column to `public.users`.');
      } else if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('storage')) {
        setMessage(`Failed to upload avatar. Create a Storage bucket named \`${AVATAR_BUCKET}\` and allow uploads.`);
      } else {
        setMessage('Failed to save.');
      }
    } finally {
      setSaving(false);
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
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Update your username and profile photo URL.
          </p>
        </div>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border border-border/40">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Username</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setAvatarFile(file);
                }}
                className="w-full"
              />

              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreviewUrl}
                  alt="avatar preview"
                  className="w-16 h-16 rounded-full object-cover mt-2"
                />
              ) : avatarUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl.trim()}
                  alt="avatar preview"
                  className="w-16 h-16 rounded-full object-cover mt-2"
                />
              ) : null}
            </div>

            {message ? (
              <div className={message === 'Saved!' ? 'text-sm text-accent' : 'text-sm text-destructive'}>
                {message}
              </div>
            ) : null}

            <Button type="submit" disabled={saving} className="w-full bg-accent hover:bg-accent/90">
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

