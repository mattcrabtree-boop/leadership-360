"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    const supabase = getSupabaseBrowserClient();
    const code = new URLSearchParams(window.location.search).get("code");
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const session = code
      ? supabase.auth.exchangeCodeForSession(code)
      : accessToken && refreshToken
        ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      : supabase.auth.getSession();
    session.then(({ data, error }) => {
      if (error || !data.session) {
        setMessage("This sign-in link is invalid or has expired. Please request a new link.");
        return;
      }
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
      window.location.replace(next.startsWith("/") ? next : "/");
    });
  }, []);

  return <main className="auth-page"><section className="auth-card"><p>{message}</p></section></main>;
}
