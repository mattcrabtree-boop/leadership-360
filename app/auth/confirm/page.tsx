"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ConfirmMagicLinkPage() {
  const [status, setStatus] = useState<"ready" | "checking" | "error">("ready");
  const [message, setMessage] = useState("");

  async function continueToReport() {
    const { tokenHash, next } = readConfirmationDetails();
    if (!tokenHash) {
      setStatus("error");
      setMessage("This sign-in link is incomplete. Please request a new link.");
      return;
    }

    setStatus("checking");
    const { data, error } = await getSupabaseBrowserClient().auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (error || !data.session) {
      setStatus("error");
      setMessage("This sign-in link is invalid or has expired. Please request a new link.");
      return;
    }

    window.location.replace(next);
  }

  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Leadership 360</p><h1>Your report is ready</h1><p>For your security, confirm that you want to open your private feedback report.</p><button className="primary-button" type="button" disabled={status === "checking"} onClick={continueToReport}>{status === "checking" ? "Opening report…" : "Open my report"}</button>{message ? <p className="auth-message auth-message-error" role="status">{message}</p> : null}</section></main>;
}

function readConfirmationDetails() {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect_to");
  const next = safeNextPath(redirectTo);
  return { tokenHash: params.get("token_hash"), next };
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
