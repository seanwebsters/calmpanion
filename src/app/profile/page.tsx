"use client";

import { ArrowRight, Cloud, Database, LifeBuoy, LogOut, Mic, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, Chip, Field, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useClientValue } from "@/hooks/use-client-value";
import { useHydrated } from "@/hooks/use-hydrated";
import { deviceSpeechAvailable } from "@/lib/audio/narrator";
import { useApp } from "@/lib/store/app-store";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import type { ContentLength, Tone, VoiceStyle } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const caps = useCapabilities();
  const speechOk = useClientValue(deviceSpeechAvailable, false);
  const { configured, user } = useAuth();
  const prefs = useApp((s) => s.preferences);
  const update = useApp((s) => s.updatePreferences);

  if (!hydrated) return <Page><PageHeader title="Profile" /><div className="skeleton h-60 rounded-[28px]" /></Page>;

  return (
    <>
      <Atmosphere dim={0.55} />
      <Page>
        <PageHeader title="Profile" subtitle="Make your companion feel like yours." />

        <Card className="flex items-center gap-4">
          <Mascot size={72} still />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl">{prefs.userName || "Friend"}</p>
            <p className="truncate text-sm text-white/65">{user ? `Signed in as ${user.email}` : configured ? "Not signed in · data stays on this device" : "Demo mode · data stays on this device"}</p>
          </div>
          {configured &&
            (user ? (
              <Button size="sm" variant="ghost" onClick={() => getSupabase()?.auth.signOut()}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            ) : (
              <Button asChild size="sm" variant="primary">
                <Link href="/auth">Sign in</Link>
              </Button>
            ))}
        </Card>

        <section className="mt-9">
          <SectionHeader title="Your companion" />
          <Card className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Companion's name">
                <input className={inputClass} value={prefs.companionName} maxLength={30} onChange={(e) => update({ companionName: e.target.value })} />
              </Field>
              <Field label="Your name">
                <input className={inputClass} value={prefs.userName} maxLength={40} onChange={(e) => update({ userName: e.target.value })} placeholder="Optional" />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Voice</p>
              <div className="flex gap-2">
                {(["warm", "bright", "deep"] as VoiceStyle[]).map((v) => (
                  <Chip key={v} active={prefs.voice === v} onClick={() => update({ voice: v })} className="capitalize">
                    {v}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Tone</p>
              <div className="flex gap-2">
                {(["gentle", "playful", "minimal"] as Tone[]).map((t) => (
                  <Chip key={t} active={prefs.tone === t} onClick={() => update({ tone: t })} className="capitalize">
                    {t}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bedtime">
                <input type="time" className={inputClass} value={prefs.bedtime} onChange={(e) => update({ bedtime: e.target.value })} />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Session length</p>
                <div className="flex gap-2">
                  {(["short", "medium", "long"] as ContentLength[]).map((l) => (
                    <Chip key={l} active={prefs.contentLength === l} onClick={() => update({ contentLength: l })} className="capitalize">
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold">Spoken replies in voice mode</span>
              <Switch checked={prefs.voiceReplies} onCheckedChange={(v) => update({ voiceReplies: v })} aria-label="Spoken replies" />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm">
                <span className="font-semibold">I&apos;d like reminders when available</span>
                <span className="block text-xs text-white/55">Reminders aren&apos;t built yet. Nothing will be sent and no permission is requested.</span>
              </span>
              <Switch checked={prefs.notificationsWanted} onCheckedChange={(v) => update({ notificationsWanted: v })} aria-label="Reminders when available" />
            </label>
          </Card>
        </section>

        <section className="mt-9 space-y-3">
          <Link href="/profile/privacy" className="glass flex items-center gap-4 rounded-[22px] p-4 transition hover:bg-white/15">
            <ShieldCheck className="h-6 w-6 text-lilac-200" />
            <div className="flex-1">
              <p className="font-semibold">Memory &amp; Privacy</p>
              <p className="text-sm text-white/60">See, edit and delete what your companion remembers</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/50" />
          </Link>
          <Link href="/support" className="glass flex items-center gap-4 rounded-[22px] p-4 transition hover:bg-white/15">
            <LifeBuoy className="h-6 w-6 text-peach-200" />
            <div className="flex-1">
              <p className="font-semibold">Support &amp; crisis resources</p>
              <p className="text-sm text-white/60">Real people who can help, any time</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/50" />
          </Link>
        </section>

        <section id="about" className="mt-9 scroll-mt-6">
          <SectionHeader title="About this app" />
          <Card className="space-y-4 text-sm">
            <Row icon={Sparkles} label="Companion intelligence" value={caps ? (caps.ai === "anthropic" ? "Claude (Anthropic)" : "Demo engine (no AI key configured)") : "…"} tone={caps?.ai === "anthropic" ? "ai" : "demo"} />
            <Row icon={Mic} label="Voice output" value={caps?.tts === "elevenlabs" ? "ElevenLabs natural voice" : speechOk ? "Device voice (built-in)" : "Not available in this browser"} tone={caps?.tts ? "ai" : "demo"} />
            <Row icon={Database} label="Storage" value={user ? "Your account (Supabase) + this device" : "This device only"} tone="default" />
            <Row icon={Cloud} label="Sounds" value="Generated live with Web Audio" tone="default" />
            <p className="border-t border-white/10 pt-4 text-white/65">
              {prefs.companionName} is an AI companion for everyday wellbeing. It isn&apos;t a therapist or medical service, can make mistakes, and doesn&apos;t replace the people in your life or professional care. Stories and meditations here are original demo content written for this app. AI-written stories are always labelled.
            </p>
          </Card>
        </section>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              useApp.setState({ onboarded: false });
              router.push("/onboarding");
            }}
          >
            Replay onboarding
          </Button>
        </div>
      </Page>
    </>
  );
}

function Row({ icon: Icon, label, value, tone }: { icon: typeof Sparkles; label: string; value: string; tone: "ai" | "demo" | "default" }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-white/60" />
      <span className="flex-1 font-semibold">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
