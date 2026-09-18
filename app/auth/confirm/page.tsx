"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ConfirmMagicLinkPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"ready" | "checking" | "error">("ready");
  const [message, setMessage] = useState("");

  async function continueToReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { next } = readConfirmationDetails();
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.replace(/\s/g, "");

    if (!cleanEmail || !cleanToken) {
      setStatus("error");
      setMessage("Enter the email address and security code from your email.");
      return;
    }

    setStatus("checking");
    setMessage("");
    const { data, error } = await getSupabaseBrowserClient().auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email",
    });

    if (error || !data.session) {
      setStatus("error");
      setMessage("That security code is invalid or has expired. Please request a new email.");
      return;
    }

    window.location.replace(next);
  }

  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Leadership 360</p><h1>Your report is ready</h1><p>Enter the security code in your email to open your private feedback report.</p><form onSubmit={continueToReport}><label className="auth-label" htmlFor="email">Email address</label><input className="auth-input" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><label className="auth-label" htmlFor="security-code">Security code</label><input className="auth-input" id="security-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={token} onChange={(event) => setToken(event.target.value)} required /><button className="primary-button" type="submit" disabled={status === "checking"}>{status === "checking" ? "Opening report…" : "Open my report"}</button></form>{message ? <p className="auth-message auth-message-error" role="status">{message}</p> : null}</section></main>;
}

function readConfirmationDetails() {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect_to");
  return {
    next: safeNextPath(redirectTo),
  };
}

function safeNextPath(redirectTo: string | null) {
  if (!redirectTo) return "/";
  try {
    const url = new URL(redirectTo, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    const next = url.searchParams.get("next") || "/";
    return next.startsWith("/") && !next.startsWith("//") ? next : "/";
  } catch {
    return "/";
  }
}
