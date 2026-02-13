import { createClient } from '@supabase/supabase-js';

// In Vite, env vars are injected at build time. On some hosting setups they may be missing,
// so we keep a production fallback to avoid breaking the live storefront.
const PRODUCTION_FALLBACK = {
  url: 'https://nkhbmqqvbfmadhfngfvn.supabase.co',
  anonKey: 'sb_publishable_MKhxeHGld_ooVQlANRGvqg_Z3_6emRO',
} as const;

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (!import.meta.env.DEV ? PRODUCTION_FALLBACK.url : '');

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (!import.meta.env.DEV ? PRODUCTION_FALLBACK.anonKey : '');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
