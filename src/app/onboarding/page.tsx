"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Brain, ChevronLeft, Feather, Heart, Leaf, Moon, Shield, Smile, Sparkles, Sprout, Volume2, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot, type MascotState } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/misc";
import { useClientValue } from "@/hooks/use-client-value";
import { Switch } from "@/components/ui/switch";
import { deviceSpeechAvailable, pickDeviceVoice } from "@/lib/audio/narrator";
import { DEFAULT_PREFERENCES, useApp } from "@/lib/store/app-store";
import type { CompanionPreferences, ContentLength, Goal, Tone, VoiceStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOALS: { id: Goal; label: string; icon: typeof Moon }[] = [
  { id: "sleep", label: "Sleep better", icon: Moon },
  { id: "stress", label: "Feel less stressed", icon: Waves },
  { id: "relax", label: "Relax", icon: Feather },
  { id: "focus", label: "Improve focus", icon: Brain },
  { id: "habits", label: "Build healthy habits", icon: Sprout },
  { id: "happiness", label: "Feel happier", icon: Smile },
  { id: "mindfulness", label: "Explore mindfulness", icon: Leaf },
];

const VOICES: { id: VoiceStyle; label: string; line: string }[] = [
  { id: "warm", label: "Warm", line: "Soft and soothing" },
  { id: "bright", label: "Bright", line: "Light and friendly" },
  { id: "deep", label: "Deep", line: "Low and grounding" },
];

const TONES: { id: Tone; label: string; sample: string }[] = [
  { id: "gentle", label: "Gentle", sample: "Let's take this slowly together. There's no rush." },
  { id: "playful", label: "Playful", sample: "Ooh, a cosy evening plan? I'm floating with excitement." },
  { id: "minimal", label: "Minimal", sample: "Breathing or story?" },
];

const LENGTHS: { id: ContentLength; label: string; hint: string }[] = [
  { id: "short", label: "Short", hint: "Under 5 min" },
  { id: "medium", label: "Medium", hint: "5 to 15 min" },
  { id: "long", label: "Long", hint: "15 min +" },
];

const STEPS = ["meet", "goals", "voice", "rhythm", "reminders", "privacy", "done"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const complete = useApp((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [awake, setAwake] = useState(false);
  const [prefs, setPrefs] = useState<CompanionPreferences>(DEFAULT_PREFERENCES);
  const set = <K extends keyof CompanionPreferences>(k: K, v: CompanionPreferences[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const current = STEPS[step];
  const speechOk = useClientValue(deviceSpeechAvailable, false);

  const finish = (destination: string) => {
    complete({ ...prefs, companionName: prefs.companionName.trim() || "Nimbus", userName: prefs.userName.trim() });
    router.replace(destination);
  };

  const preview = (voice: VoiceStyle) => {
    if (!deviceSpeechAvailable()) return;
    const u = new SpeechSynthesisUtterance(`Hi, I'm ${prefs.companionName || "Nimbus"}. It's lovely to meet you.`);
    const v = pickDeviceVoice(voice);
    if (v) u.voice = v;
    u.rate = 0.9;
    u.pitch = voice === "deep" ? 0.85 : voice === "bright" ? 1.1 : 0.98;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const mascotState: MascotState = !awake ? "sleeping" : current === "done" ? "happy" : current === "meet" ? "waving" : current === "voice" ? "speaking" : "idle";

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Atmosphere override={awake ? "evening" : "night"} dim={0.15} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),20px)]">
        <div className="flex h-12 items-center justify-between">
          {step > 0 && current !== "done" ? (
            <Button size="icon" variant="ghost" onClick={back} aria-label="Back">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          ) : (
            <span />
          )}
          {awake && current !== "done" && (
            <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.slice(0, -1).map((s, i) => (
                <span key={s} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-white" : i < step ? "w-1.5 bg-white/70" : "w-1.5 bg-white/25")} />
              ))}
            </div>
          )}
          {step > 0 && !["done", "privacy"].includes(current) ? (
            <Button variant="ghost" size="sm" onClick={next}>
              Skip
            </Button>
          ) : (
            <span className="w-12" />
          )}
        </div>

        <div className="flex justify-center pt-2">
          <motion.div layout>
            <Mascot state={mascotState} size={current === "meet" ? 220 : 130} label={prefs.companionName} />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={awake ? current : "sleep"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col"
          >
            {!awake && (
              <div className="flex flex-1 flex-col items-center text-center">
                <h1 className="mt-4 font-display text-4xl leading-tight text-glow">Someone&apos;s been waiting for you</h1>
                <p className="mt-3 max-w-xs text-white/75">A small cloud is dozing under the stars. Give it a gentle tap to say hello.</p>
                <div className="mt-auto w-full">
                  <Button variant="primary" size="lg" className="w-full" onClick={() => setAwake(true)}>
                    Wake gently
                  </Button>
                </div>
              </div>
            )}

            {awake && current === "meet" && (
              <div className="flex flex-1 flex-col">
                <div className="text-center">
                  <h1 className="mt-2 font-display text-[34px] leading-tight text-glow">Oh! Hello there.</h1>
                  <p className="mx-auto mt-3 max-w-sm text-white/80">
                    I&apos;m a little cloud who helps people rest, breathe and feel a bit lighter. I&apos;m an AI companion, not a person or a therapist, but I&apos;ll always be here when you open the app.
                  </p>
                </div>
                <div className="mt-6 space-y-4">
                  <Field label="What would you like to call me?">
                    <input className={inputClass} value={prefs.companionName} maxLength={30} onChange={(e) => set("companionName", e.target.value)} />
                  </Field>
                  <Field label="And what should I call you?" hint="Optional">
                    <input className={inputClass} value={prefs.userName} maxLength={40} placeholder="Your first name" onChange={(e) => set("userName", e.target.value)} />
                  </Field>
                </div>
                <Button variant="primary" size="lg" className="mt-auto w-full" onClick={next}>
                  Nice to meet you
                </Button>
              </div>
            )}

            {awake && current === "goals" && (
              <div className="flex flex-1 flex-col">
                <h1 className="mt-4 text-center font-display text-3xl">What brings you to Calm?</h1>
                <p className="mt-2 text-center text-white/70">Pick as many as you like. I&apos;ll use this to suggest things.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {GOALS.map(({ id, label, icon: Icon }) => {
                    const on = prefs.goals.includes(id);
                    return (
                      <button
                        key={id}
                        aria-pressed={on}
                        onClick={() => set("goals", on ? prefs.goals.filter((g) => g !== id) : [...prefs.goals, id])}
                        className={cn("flex items-center gap-3 rounded-[22px] border p-4 text-left text-sm font-semibold transition active:scale-[0.98]", on ? "border-lilac-200 bg-lilac-200/20 shadow-glow" : "glass")}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0", on ? "text-lilac-200" : "text-white/70")} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <Button variant="primary" size="lg" className="mt-auto w-full" onClick={next}>
                  Continue
                </Button>
              </div>
            )}

            {awake && current === "voice" && (
              <div className="flex flex-1 flex-col">
                <h1 className="mt-4 text-center font-display text-3xl">How should I sound?</h1>
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold text-white/80">Voice</p>
                  <div className="grid grid-cols-3 gap-2">
                    {VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          set("voice", v.id);
                          preview(v.id);
                        }}
                        aria-pressed={prefs.voice === v.id}
                        className={cn("rounded-[20px] border p-3 text-center transition", prefs.voice === v.id ? "border-lilac-200 bg-lilac-200/20" : "glass")}
                      >
                        <Volume2 className="mx-auto h-5 w-5" />
                        <p className="mt-1 font-semibold">{v.label}</p>
                        <p className="text-[11px] text-white/60">{v.line}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/50">
                    {speechOk ? "Tap to preview with your device's voice. A natural voice is used when a speech provider is configured." : "Voice preview isn't available in this browser."}
                  </p>
                  <p className="pt-3 text-sm font-semibold text-white/80">Tone</p>
                  <div className="space-y-2">
                    {TONES.map((t) => (
                      <button key={t.id} onClick={() => set("tone", t.id)} aria-pressed={prefs.tone === t.id} className={cn("w-full rounded-[20px] border p-4 text-left transition", prefs.tone === t.id ? "border-lilac-200 bg-lilac-200/20" : "glass")}>
                        <p className="font-semibold">{t.label}</p>
                        <p className="text-sm italic text-white/65">&ldquo;{t.sample}&rdquo;</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="primary" size="lg" className="mt-6 w-full" onClick={next}>
                  Continue
                </Button>
              </div>
            )}

            {awake && current === "rhythm" && (
              <div className="flex flex-1 flex-col">
                <h1 className="mt-4 text-center font-display text-3xl">Your rhythm</h1>
                <p className="mt-2 text-center text-white/70">So I can suggest the right thing at the right time.</p>
                <div className="mt-6 space-y-6">
                  <Field label="Usual bedtime">
                    <input type="time" className={inputClass} value={prefs.bedtime} onChange={(e) => set("bedtime", e.target.value)} />
                  </Field>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-white/90">Preferred session length</p>
                    <div className="grid grid-cols-3 gap-2">
                      {LENGTHS.map((l) => (
                        <button key={l.id} onClick={() => set("contentLength", l.id)} aria-pressed={prefs.contentLength === l.id} className={cn("rounded-[20px] border p-3 text-center transition", prefs.contentLength === l.id ? "border-lilac-200 bg-lilac-200/20" : "glass")}>
                          <p className="font-semibold">{l.label}</p>
                          <p className="text-[11px] text-white/60">{l.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="primary" size="lg" className="mt-auto w-full" onClick={next}>
                  Continue
                </Button>
              </div>
            )}

            {awake && current === "reminders" && (
              <div className="flex flex-1 flex-col">
                <h1 className="mt-4 text-center font-display text-3xl">Gentle reminders</h1>
                <div className="glass mt-6 rounded-[24px] p-5">
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-5 w-5 text-lilac-200" />
                    <div>
                      <p className="font-semibold">Reminders aren&apos;t switched on in this version yet</p>
                      <p className="mt-1 text-sm text-white/70">We won&apos;t ask for notification permission or send you anything. If you&apos;d like a nudge at bedtime later, let us know and we&apos;ll ask properly once reminders are ready.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/8 p-4">
                    <span className="text-sm font-semibold">I&apos;d like reminders when available</span>
                    <Switch checked={prefs.notificationsWanted} onCheckedChange={(v) => set("notificationsWanted", v)} aria-label="Reminders when available" />
                  </div>
                </div>
                <Button variant="primary" size="lg" className="mt-auto w-full" onClick={next}>
                  Continue
                </Button>
              </div>
            )}

            {awake && current === "privacy" && (
              <div className="flex flex-1 flex-col">
                <h1 className="mt-4 text-center font-display text-3xl">Memory &amp; privacy</h1>
                <p className="mt-2 text-center text-sm text-white/70">You&apos;re in charge of what I keep. You can change any of this later.</p>
                <div className="mt-5 space-y-3">
                  <PrivacyToggle
                    icon={Sparkles}
                    title="Remember my preferences"
                    body="Simple things like favourite story settings or session length, so I can suggest better. Never health details or private conversations. Off unless you turn it on."
                    checked={prefs.memoryEnabled}
                    onChange={(v) => set("memoryEnabled", v)}
                  />
                  <PrivacyToggle icon={Heart} title="Keep conversation history" body="Stored on this device (and your account if you sign in) so you can scroll back. Separate from memory." checked={prefs.saveConversations} onChange={(v) => set("saveConversations", v)} />
                  <PrivacyToggle icon={Smile} title="Keep mood check-ins" body="To show you gentle trends over time. Never used to diagnose anything." checked={prefs.storeCheckIns} onChange={(v) => set("storeCheckIns", v)} />
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/6 p-3 text-xs text-white/65">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                  Your journal is private. It&apos;s only sent to the AI if you explicitly allow it for reflections. Conversations are processed by an AI provider to generate replies.
                </div>
                <Button variant="primary" size="lg" className="mt-6 w-full" onClick={next}>
                  Sounds good
                </Button>
              </div>
            )}

            {awake && current === "done" && (
              <div className="flex flex-1 flex-col text-center">
                <h1 className="mt-4 font-display text-4xl text-glow">We&apos;re all set{prefs.userName ? `, ${prefs.userName}` : ""}</h1>
                <p className="mx-auto mt-3 max-w-xs text-white/75">Whenever you need a pause, a story or just some company, I&apos;ll be here.</p>
                <div className="mt-auto space-y-3">
                  <Button variant="primary" size="lg" className="w-full" onClick={() => finish("/")}>
                    Let&apos;s begin
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => finish("/explore")}>
                    I&apos;d rather browse on my own
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PrivacyToggle({ icon: Icon, title, body, checked, onChange }: { icon: typeof Moon; title: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="glass flex items-start gap-3 rounded-[22px] p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-lilac-200" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/65">{body}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

