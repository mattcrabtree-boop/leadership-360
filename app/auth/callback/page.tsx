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
        ? restoreImplicitSession(accessToken, refreshToken, fragment)
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

async function restoreImplicitSession(
  accessToken: string,
  refreshToken: string,
  fragment: URLSearchParams,
) {
  try {
    const expiresAt = Number(fragment.get("expires_at"));
    if (!expiresAt) throw new Error("Invalid token payload");

    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      expires_in: Number(fragment.get("expires_in") ?? Math.max(0, expiresAt - Date.now() / 1000)),
      token_type: fragment.get("token_type") ?? "bearer",
      user: {},
    };
    window.sessionStorage.setItem("leadership-360-auth", JSON.stringify(session));

    return { data: { session }, error: null };
  } catch {
    return { data: { session: null }, error: new Error("Invalid sign-in token") };
  }
}
