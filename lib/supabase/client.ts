import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Don't crash during Next.js build/prerender when env vars are not set yet.
  // Pages can treat a `null` client as "Supabase not configured".
  if (!url || !anonKey) return null

  return createBrowserClient(url, anonKey)
}
