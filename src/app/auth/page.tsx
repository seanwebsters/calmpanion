"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, Field, inputClass, PageHeader } from "@/components/ui/misc";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";

export default function AuthPage() {
  const { configured, user } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const send = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setState("sending");
    const { error: err } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/profile` } });
    if (err) {
      setError(err.message);
      setState("error");
    } else setState("sent");
  };

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page>
        <PageHeader title="Sign in" subtitle="Keep your preferences, routines and journal across devices." />
        <div className="flex justify-center pb-4">
          <Mascot size={140} state={state === "sent" ? "happy" : "idle"} />
        </div>
        {!configured ? (
          <Card>
            <p className="font-semibold">Accounts aren&apos;t set up in this demo</p>
            <p className="mt-1 text-sm text-white/70">Everything you do is saved in this browser. To enable accounts, add Supabase keys (see the README).</p>
            <Button asChild variant="glass" className="mt-4">
              <Link href="/">Back home</Link>
            </Button>
          </Card>
        ) : user ? (
          <Card>
            <p className="font-semibold">You&apos;re signed in as {user.email}</p>
            <Button asChild variant="primary" className="mt-4">
              <Link href="/">Continue</Link>
            </Button>
          </Card>
        ) : state === "sent" ? (
          <Card>
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-1 text-sm text-white/70">We sent a sign-in link to {email}.</p>
          </Card>
        ) : (
          <Card className="space-y-4">
            <Field label="Email">
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </Field>
            {state === "error" && <p className="text-sm text-amber-100">{error}</p>}
            <Button variant="primary" className="w-full" disabled={!/^\S+@\S+\.\S+$/.test(email) || state === "sending"} onClick={send}>
              <Mail className="h-4 w-4" /> {state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </Button>
            <p className="text-xs text-white/50">Your local data will be uploaded to your account the first time you sign in.</p>
          </Card>
        )}
      </Page>
    </>
  );
}
