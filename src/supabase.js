// src/supabase.js
// Single Supabase client for the whole app. Reads URL + anon key
// from Vite environment variables. If the envs aren't set (e.g. on
// a local dev machine without .env.local), export `null` so callers
// can degrade gracefully instead of crashing on import.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // handle Google OAuth redirect callback
        },
      })
    : null;

export const isAuthConfigured = () => Boolean(supabase);