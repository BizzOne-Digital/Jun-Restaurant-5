"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { suggestEmailTypo } from "@/lib/email-validation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const emailSuggestion = React.useMemo(() => suggestEmailTypo(email), [email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Please enter your name (minimum 2 characters).");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Registration failed");
      if (data.emailSuggestion) {
        toast.message(`Did you mean ${data.emailSuggestion}?`);
      }
      return;
    }
    toast.success("Account created. Please check your email to verify your account.");
    await signIn("credentials", { email, password, redirect: false });
    router.push("/account");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <h1 className="font-display text-3xl text-rice-50">Create account</h1>
      <p className="mt-2 text-sm text-rice-400">Join ONO for faster reorders and exclusive drops.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Name
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Email
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {emailSuggestion ? (
          <p className="text-xs text-mango-300">Did you mean {emailSuggestion}?</p>
        ) : null}
        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Password (min 8)
          <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Register"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-rice-400">
        Already have an account?{" "}
        <Link className="text-mango-300 hover:underline" href="/account/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
