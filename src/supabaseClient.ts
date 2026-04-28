import { createClient } from '@supabase/supabase-js';

// Using environment variables for Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance;
try {
  const safeSupabaseUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
  const safeSupabaseKey = SUPABASE_PUBLIC_KEY || 'placeholder_key';
  supabaseInstance = createClient(safeSupabaseUrl, safeSupabaseKey);
} catch (err) {
  console.error("Critical: Supabase client failed to initialize:", err);
  // Return a proxy/mock to avoid crashes downstream
  supabaseInstance = { auth: { getSession: async () => ({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signOut: async () => {} } } as any;
}

export const supabase = supabaseInstance;
