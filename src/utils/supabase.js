import { getToken } from "@clerk/react";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // public "anon" / publishable key

/**
 * Single Supabase client authenticated with the Clerk session token
 * ("third-party auth" integration: no JWT template, no shared JWT secret).
 * Supabase verifies the token with Clerk's public keys; RLS policies read
 * auth.jwt() ->> 'sub' (Clerk user id) and auth.jwt() ->> 'user_role'.
 */
const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: async () => (await getToken()) ?? null,
});

export default supabase;
