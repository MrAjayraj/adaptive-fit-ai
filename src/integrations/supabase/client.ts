import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Support VITE_SUPABASE_ANON_KEY (preferred) with fallback to legacy name
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPABASE_ANON_KEY =
  ((import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined) ?? '';

const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!SUPABASE_CONFIGURED) {
  console.error(
    '[FitPulse] Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your deployment environment.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Use placeholder values when env vars are absent so createClient doesn't
// throw at module-import time (which would crash the app before React mounts).
export const supabase = createClient<Database>(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export { SUPABASE_CONFIGURED };