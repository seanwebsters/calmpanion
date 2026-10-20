"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Square, Vibrate, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Chip, PageHeader } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getAudioEngine } from "@/lib/audio/engine";
import { phaseAt, phasesFor, totalCycles, type PhaseName } from "@/lib/breathing";
import { BREATHING_PATTERNS, CATALOG } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import type { BreathingPatternId } from "@/lib/types";

type Status = "setup" | "running" | "paused" | "done";

const SCALE: Record<PhaseName, number> = { inhale: 1, hold: 1, exhale: 0.55, holdAfter: 0.55 };
const CUE_PITCH: Record<PhaseName, number> = { inhale: 528, hold: 660, exhale: 396, holdAfter: 440 };

export default function BreathePage() {
  const prefs = useApp((s) => s.preferences);
  const updatePreferences = useApp((s) => s.updatePreferences);
  // A launch handed over by the companion sets the initial exercise (and may start it).
  const [launch] = useState(() => {
    const l = useApp.getState().pendingLaunch;
    return l?.type === "breathing" ? l : null;
  });
  const [patternId, setPatternId] = useState<BreathingPatternId>(launch?.pattern ?? "gentle");
  const [custom, setCustom] = useState(launch?.custom ?? { inhale: 4, hold: 2, exhale: 6, holdAfter: 0 });
  const [minutes, setMinutes] = useState(launch?.minutes ?? 3);
  const [status, setStatus] = useState<Status>(launch?.autostart ? "running" : "setup");
  const [elapsed, setElapsed] = useState(0);
  const [guide, setGuide] = useState<"orb" | "nimbus">("orb");
  const lastTick = useRef<number | null>(null);
  const lastPhase = useRef<number>(-1);
  const sessionId = useRef<string | null>(null);

  const base = BREATHING_PATTERNS.find((p) => p.id === patternId)!;
  const pattern = patternId === "custom" ? { ...base, ...custom } : base;
  const cycles = totalCycles(pattern, minutes);
  const cycleLen = pattern.inhale + pattern.hold + pattern.exhale + pattern.holdAfter;
  const totalSecs = cycles * cycleLen;
  const now = phaseAt(pattern, Math.min(elapsed, totalSecs - 0.001));
  const live = useRef({ totalSecs, cues: prefs.breathingSoundCues });
  useEffect(() => {
    live.current = { totalSecs, cues: prefs.breathingSoundCues };
  });

  useEffect(() => {
    if (launch) useApp.getState().setPendingLaunch(null);
  }, [launch]);

  const start = useCallback(() => {
    void getAudioEngine().unlock();
    setElapsed(0);
    lastPhase.current = -1;
    sessionId.current = null;
    setStatus("running");
  }, []);

  // Session bookkeeping whenever a run begins.
  useEffect(() => {
    if (status === "running" && !sessionId.current) {
      const item = CATALOG.find((c) => c.kind === "breathing" && c.breathingPatternId === patternId) ?? CATALOG.find((c) => c.kind === "breathing")!;
      sessionId.current = useApp.getState().startSession({ ...item, title: `${pattern.name} breathing` }, minutes);
    }
  }, [status, patternId, pattern.name, minutes]);

  // Clock; completion is detected inside the frame callback.
  useEffect(() => {
    if (status !== "running") {
      lastTick.current = null;
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      if (lastTick.current !== null) {
        const dt = (t - lastTick.current) / 1000;
        setElapsed((e) => {
          const next = e + dt;
          if (next >= live.current.totalSecs) {
            setStatus("done");
            if (sessionId.current) useApp.getState().updateSession(sessionId.current, { progress: 1, completedAt: new Date().toISOString() });
            sessionId.current = null;
            if (live.current.cues) void getAudioEngine().chime(528, 0.15, 3.5);
          }
          return next;
        });
      }
      lastTick.current = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  // Phase changes: gentle sound and haptic cues.
  useEffect(() => {
    if (status !== "running") return;
    const key = now.cycles * 10 + now.index;
    if (key !== lastPhase.current) {
      lastPhase.current = key;
      if (prefs.hapticsEnabled && "vibrate" in navigator) navigator.vibrate(now.phase.name === "inhale" ? 40 : now.phase.name === "exhale" ? [20, 60, 20] : 15);
      if (prefs.breathingSoundCues) void getAudioEngine().chime(CUE_PITCH[now.phase.name], 0.07, 1.6);
    }
  }, [now, status, prefs.breathingSoundCues, prefs.hapticsEnabled]);

  const stop = () => {
    setStatus("setup");
    setElapsed(0);
    if (sessionId.current) useApp.getState().updateSession(sessionId.current, { progress: Math.min(1, elapsed / totalSecs) });
    sessionId.current = null;
  };

  const active = status === "running" || status === "paused";

  return (
    <>
      <Atmosphere dim={0.5} />
      <Page>
        <PageHeader title="Breathe" subtitle="Follow the orb, or breathe along with Nimbus. Go at a pace that feels comfortable." />

        <div className="flex flex-col items-center">
          <div className="relative flex h-[300px] w-[300px] items-center justify-center sm:h-[340px] sm:w-[340px]">
            {[1.25, 1.1].map((s, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-white/10"
                animate={{ scale: active ? SCALE[now.phase.name] * s : 0.8 * s, opacity: active ? 0.6 : 0.3 }}
                transition={{ duration: active ? now.phase.seconds : 1.5, ease: "easeInOut" }}
              />
            ))}
            {guide === "nimbus" ? (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: status === "running" ? SCALE[now.phase.name] : status === "paused" ? undefined : 0.75 }}
                transition={{ duration: status === "running" ? now.remaining : 1.5, ease: "easeInOut" }}
              >
                <Mascot
                  size={290}
                  still
                  state={status === "done" ? "happy" : !active ? "idle" : now.phase.name === "exhale" || now.phase.name === "holdAfter" ? "sleeping" : "listening"}
                  label="Nimbus breathing with you"
                />
              </motion.div>
            ) : (
            <motion.div
              className="absolute inset-[6%] rounded-full"
              style={{ background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #e6dcff 25%, #b4a0f4 55%, #7fbfff 85%, rgba(127,191,255,0.2) 100%)", boxShadow: "0 0 80px rgba(180,160,244,0.55)" }}
              animate={{ scale: status === "running" ? SCALE[now.phase.name] : status === "paused" ? undefined : 0.75 }}
              transition={{ duration: status === "running" ? now.remaining : 1.5, ease: "easeInOut" }}
            />
            )}
            <div className={guide === "nimbus" ? "hidden" : "relative text-center text-night-900"}>
              <AnimatePresence mode="wait">
                {status === "done" ? (
                  <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Mascot state="happy" size={110} still />
                  </motion.div>
                ) : active ? (
                  <motion.div key={now.phase.name + now.cycles} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <p className="font-display text-2xl">{status === "paused" ? "Paused" : now.phase.label}</p>
                    <p className="text-4xl font-bold tabular-nums">{Math.ceil(now.remaining)}</p>
                  </motion.div>
                ) : (
                  <motion.p key="ready" className="mx-auto max-w-[170px] font-display text-xl leading-snug" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Ready when you are
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {guide === "nimbus" && active && (
            <div className="text-center" aria-live="polite">
              <p className="font-display text-3xl">{status === "paused" ? "Paused" : now.phase.label}</p>
              <p className="text-3xl font-bold tabular-nums">{Math.ceil(now.remaining)}</p>
            </div>
          )}
          <div className="mt-3 flex gap-2" role="group" aria-label="Breathing guide">
            <Chip active={guide === "orb"} onClick={() => setGuide("orb")}>
              Glowing orb
            </Chip>
            <Chip active={guide === "nimbus"} onClick={() => setGuide("nimbus")}>
              Breathe with Nimbus
            </Chip>
          </div>
          {active && (
            <p className="mt-2 text-sm text-white/70">
              Breath {Math.min(cycles, now.cycles + 1)} of {cycles}
            </p>
          )}

          {status === "done" ? (
            <div className="mt-4 text-center">
              <h2 className="font-display text-3xl">Well done</h2>
              <p className="mt-1 text-white/70">Notice how you feel now. There&apos;s no right answer.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="primary" onClick={start}>
                  Go again
                </Button>
                <Button variant="glass" onClick={() => setStatus("setup")}>
                  Change exercise
                </Button>
              </div>
            </div>
          ) : active ? (
            <div className="mt-6 flex gap-3">
              <Button size="icon-lg" variant="primary" onClick={() => setStatus(status === "running" ? "paused" : "running")} aria-label={status === "running" ? "Pause" : "Resume"}>
                {status === "running" ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
              </Button>
              <Button size="icon-lg" variant="glass" onClick={stop} aria-label="Stop">
                <Square className="h-6 w-6" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 w-full space-y-6">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BREATHING_PATTERNS.map((p) => (
                  <button key={p.id} onClick={() => setPatternId(p.id)} aria-pressed={patternId === p.id} className={`rounded-[20px] border p-3 text-left transition ${patternId === p.id ? "border-lilac-200 bg-lilac-200/20" : "glass"}`}>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-[11px] leading-snug text-white/60">{p.id === "custom" ? "Your own rhythm" : phasesFor(p).map((x) => x.seconds).join(" · ")}</p>
                  </button>
                ))}
              </div>
              <p className="text-sm text-white/70">{base.description}</p>

              {patternId === "custom" && (
                <div className="glass space-y-4 rounded-[24px] p-5">
                  {(["inhale", "hold", "exhale", "holdAfter"] as const).map((k) => (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{{ inhale: "Breathe in", hold: "Hold", exhale: "Breathe out", holdAfter: "Rest" }[k]}</span>
                        <span className="tabular-nums text-white/70">{custom[k]}s</span>
                      </div>
                      <Slider value={[custom[k]]} min={k === "inhale" || k === "exhale" ? 2 : 0} max={k === "exhale" ? 12 : 10} step={1} onValueChange={([v]) => setCustom((c) => ({ ...c, [k]: v }))} aria-label={k} />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">Duration</p>
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((m) => (
                    <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                      {m} min
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="glass divide-y divide-white/10 rounded-[24px]">
                <label className="flex items-center justify-between p-4">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Volume2 className="h-4 w-4" /> Soft sound cues
                  </span>
                  <Switch checked={prefs.breathingSoundCues} onCheckedChange={(v) => updatePreferences({ breathingSoundCues: v })} aria-label="Sound cues" />
                </label>
                <label className="flex items-center justify-between p-4">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Vibrate className="h-4 w-4" /> Haptic cues <span className="font-normal text-white/50">(where supported)</span>
                  </span>
                  <Switch checked={prefs.hapticsEnabled} onCheckedChange={(v) => updatePreferences({ hapticsEnabled: v })} aria-label="Haptics" />
                </label>
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={start}>
                Begin · {cycles} breaths
              </Button>
              <p className="text-center text-xs text-white/50">If you feel lightheaded or uncomfortable, stop and return to your natural breath. This is a relaxation exercise, not medical treatment.</p>
            </div>
          )}
        </div>
      </Page>
    </>
  );
}
