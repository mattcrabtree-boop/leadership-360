"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("This report site has not been connected to Supabase yet.");
  client = createClient(url, key, {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
        // The callback page handles both PKCE codes and implicit-flow tokens.
        // Keeping this off avoids a race between Supabase's automatic URL parsing
        // and the explicit, user-facing callback flow.
        detectSessionInUrl: false,
    },
  });
  return client;
}

export async function sendMagicLink(email: string, redirectTo: string) {
  const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (error) throw new Error("We could not send a sign-in link. Please try again or contact the report administrator.");
}
