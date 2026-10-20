"use client";

import { Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { Chip, inputClass, PageHeader } from "@/components/ui/misc";
import { getAudioEngine } from "@/lib/audio/engine";
import { getContent } from "@/lib/content/catalog";
import { getPreset } from "@/lib/content/sounds";
import { useApp } from "@/lib/store/app-store";
import { formatClock } from "@/lib/utils";

const FOCUS_PRESETS = ["deep-focus", "rainy-window", "morning-meadow", "lakeside", "ocean-drift"];

type Status = "setup" | "running" | "paused" | "done";

export default function FocusPage() {
  const player = usePlayer();
  // A launch handed over by the companion sets up (and may start) the session.
  const [launch] = useState(() => {
    const l = useApp.getState().pendingLaunch;
    return l?.type === "focus" ? l : null;
  });
  const [minutes, setMinutes] = useState(launch?.minutes ?? 25);
  const [presetId, setPresetId] = useState<string | null>(launch ? (launch.presetId ?? null) : "deep-focus");
  const [intention, setIntention] = useState(launch?.intention ?? "");
  const [status, setStatus] = useState<Status>(launch?.autostart ? "running" : "setup");
  const [remaining, setRemaining] = useState((launch?.minutes ?? 25) * 60);
  const endsAt = useRef<number | null>(null);
  const sessionId = useRef<string | null>(null);

  const begin = () => {
    void getAudioEngine().unlock();
    setRemaining(minutes * 60);
    endsAt.current = null;
    sessionId.current = null;
    setStatus("running");
  };

  useEffect(() => {
    if (launch) useApp.getState().setPendingLaunch(null);
  }, [launch]);

  // Starting a session: sounds + history entry (once per run).
  useEffect(() => {
    if (status !== "running" || sessionId.current) return;
    const p = presetId ? getPreset(presetId) : undefined;
    if (p) void getAudioEngine().setMix(p.layers);
    const item = getContent(minutes >= 40 ? "focus-50" : "focus-25")!;
    sessionId.current = useApp.getState().startSession({ ...item, title: `Focus · ${minutes} min` }, minutes);
  }, [status, presetId, minutes]);

  useEffect(() => {
    if (status !== "running") return;
    endsAt.current ??= Date.now() + remaining * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round(((endsAt.current ?? Date.now()) - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setStatus("done");
        getAudioEngine().fadeOutAndStop(6);
        void getAudioEngine().chime(528, 0.2, 4);
        if (sessionId.current) useApp.getState().updateSession(sessionId.current, { progress: 1, completedAt: new Date().toISOString() });
        sessionId.current = null;
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const pause = () => {
    setStatus("paused");
    endsAt.current = null;
  };
  const resume = () => {
    endsAt.current = null;
    setStatus("running");
  };
  const stop = () => {
    setStatus("setup");
    getAudioEngine().stopAll();
    if (sessionId.current) useApp.getState().updateSession(sessionId.current, { progress: 1 - remaining / (minutes * 60) });
    sessionId.current = null;
  };

  const total = minutes * 60;
  const pct = status === "setup" ? 0 : 1 - remaining / total;

  return (
    <>
      <Atmosphere override="afternoon" dim={0.45} />
      <Page>
        <PageHeader title="Focus" subtitle="One clear block of attention, with soft sound." />
        <div className="flex flex-col items-center">
          <div className="relative h-72 w-72">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#fg)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct * 282.7} 282.7`} className="transition-[stroke-dasharray] duration-500" />
              <defs>
                <linearGradient id="fg">
                  <stop offset="0%" stopColor="#a9d6ff" />
                  <stop offset="100%" stopColor="#cdbcfb" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {status === "done" ? (
                <Mascot state="happy" size={120} still />
              ) : (
                <>
                  <p className="font-display text-6xl tabular-nums">{formatClock(status === "setup" ? total : remaining)}</p>
                  {intention && status !== "setup" && <p className="mt-2 max-w-[180px] text-sm text-white/70">{intention}</p>}
                </>
              )}
            </div>
          </div>

          {status === "done" ? (
            <div className="mt-4 text-center">
              <h2 className="font-display text-3xl">Focus block complete</h2>
              <p className="mt-1 text-white/70">Stand up, stretch, maybe grab some water.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={() => player.play("sixty-second-reset")}>
                  One-minute reset
                </Button>
                <Button variant="glass" onClick={() => setStatus("setup")}>
                  Another block
                </Button>
              </div>
            </div>
          ) : status === "setup" ? (
            <div className="mt-6 w-full space-y-6">
              <input className={inputClass} placeholder="What would you like to focus on? (optional)" value={intention} maxLength={140} onChange={(e) => setIntention(e.target.value)} aria-label="Intention" />
              <div>
                <p className="mb-2 text-sm font-semibold">Length</p>
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 25, 45, 50].map((m) => (
                    <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                      {m} min
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Sound</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={presetId === null} onClick={() => setPresetId(null)}>
                    Silence
                  </Chip>
                  {FOCUS_PRESETS.map((id) => (
                    <Chip key={id} active={presetId === id} onClick={() => setPresetId(id)}>
                      {getPreset(id)?.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={begin}>
                Start focusing
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex gap-3">
              <Button size="icon-lg" variant="primary" onClick={status === "running" ? pause : resume} aria-label={status === "running" ? "Pause" : "Resume"}>
                {status === "running" ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
              </Button>
              <Button size="icon-lg" variant="glass" onClick={stop} aria-label="Stop">
                <Square className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
      </Page>
    </>
  );
}
