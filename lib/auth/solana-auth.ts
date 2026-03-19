import { createClient } from '@/lib/supabase/client';

export async function signUpWithSolana(
  walletAddress: string,
  displayName: string,
  avatarUrl?: string
) {
  const supabase = createClient();

  try {
    // Sign up with wallet address as the "email" (must be unique in Supabase)
    const { data, error } = await supabase.auth.signUp({
      email: `${walletAddress.toLowerCase()}@solana.local`,
      password: walletAddress,
      options: {
        data: {
          wallet_address: walletAddress,
          display_name: displayName,
          avatar_url: avatarUrl || null,
        },
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signInWithSolana(walletAddress: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${walletAddress.toLowerCase()}@solana.local`,
      password: walletAddress,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCurrentUser() {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signOut() {
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function updateUserProfile(
  displayName: string,
  avatarUrl?: string
) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}
