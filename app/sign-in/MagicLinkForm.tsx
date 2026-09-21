"use client";

import { FormEvent, useState } from "react";
import { sendMagicLink } from "@/lib/supabase-browser";

export function MagicLinkForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    if (typeof email !== "string") return;
    setStatus("sending");
    try {
      const returnTo = new URLSearchParams(window.location.search).get("next") || "/";
      await sendMagicLink(email.trim().toLowerCase(), `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`);
      setStatus("sent");
      setMessage("Check your email for a six-digit security code. It may take a minute to arrive.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not send a sign-in link.");
    }
  }

  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Leadership 360</p><h1>Access your private report</h1><p>Enter the email address where you received your report invitation. We will send a fresh six-digit security code.</p><form onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" required /></label><button className="primary-button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending code…" : "Email me a fresh code"}</button></form>{message ? <p className={`auth-message auth-message-${status}`} role="status">{message}</p> : null}</section></main>;
}
