"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestEmailTypo } from "@/lib/email-validation";

export function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState("Verifying your email...");
  const [email, setEmail] = React.useState("");
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState("");
  const emailSuggestion = React.useMemo(() => suggestEmailTypo(email), [email]);

  React.useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing verification token.");
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!ok) {
          setState("error");
          setMessage(data.error || "Verification failed.");
          return;
        }
        setState("success");
        setMessage("Your email is verified. You can now use your ONO account.");
      })
      .catch(() => {
        setState("error");
        setMessage("Unable to verify right now. Please try again.");
      });
  }, [token]);

  const resend = async () => {
    setResending(true);
    setResendMessage("");
    const normalizedEmail = (emailSuggestion || email).trim().toLowerCase();
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    const data = await res.json().catch(() => ({}));
    setResending(false);
    if (!res.ok) {
      setResendMessage(data.error || "Unable to send verification email right now.");
      return;
    }
    setResendMessage("Verification email sent. Please check your inbox.");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <div className="glass-panel rounded-3xl p-8 text-center">
        <h1 className="font-display text-3xl text-rice-50">Email Verification</h1>
        <p className="mt-3 text-sm text-rice-300">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/account/login">
            <Button variant={state === "success" ? "primary" : "outline"}>Go to Login</Button>
          </Link>
          <Link href="/account">
            <Button variant="outline">Open Account</Button>
          </Link>
        </div>
        {state === "error" ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-charcoal-900/50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-rice-400">Resend verification email</p>
            <Input
              className="mt-2"
              type="email"
              placeholder="Enter your account email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailSuggestion ? (
              <button
                type="button"
                className="mt-2 text-xs text-mango-300 hover:underline"
                onClick={() => setEmail(emailSuggestion)}
              >
                Did you mean {emailSuggestion}?
              </button>
            ) : null}
            <div className="mt-3">
              <Button type="button" variant="outline" onClick={resend} disabled={resending || !email.trim()}>
                {resending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
            {resendMessage ? <p className="mt-2 text-xs text-rice-300">{resendMessage}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
