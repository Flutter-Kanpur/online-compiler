import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True once a real project is configured. Until then every page that needs
// data shows a "connect Supabase" prompt instead of crashing on a null client.
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("YOUR-PROJECT-REF")
);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;
