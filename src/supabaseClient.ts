import { createClient } from '@supabase/supabase-js';

// Replace these variables with your actual Supabase project URL and anon/public key.
const SUPABASE_URL = "https://odovkeromveftlkoxuck.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_2xaWPquq_qbvMgmLpZEodQ_0EIkvKvw";

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
