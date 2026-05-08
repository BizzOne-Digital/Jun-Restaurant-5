"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner({ email }: { email: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const resend = async () => {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Unable to send verification email right now.");
      return;
    }
    setMsg("Verification email sent. Please check your inbox.");
  };

  return (
    <div className="mt-4 rounded-2xl border border-mango-400/25 bg-mango-400/10 p-4">
      <p className="text-sm font-semibold text-mango-200">Please verify your email address.</p>
      <p className="mt-1 text-xs text-rice-300">This email is not verified. Please check your inbox for the verification code.</p>
      <div className="mt-3">
        <Button type="button" variant="outline" onClick={resend} disabled={loading}>
          {loading ? "Sending..." : "Resend verification email"}
        </Button>
      </div>
      {msg ? <p className="mt-2 text-xs text-rice-200">{msg}</p> : null}
    </div>
  );
}
