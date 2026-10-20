"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Landscape } from "@/components/art/landscape";
import { Mascot } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/misc";
import { useApp } from "@/lib/store/app-store";
import type { ContentItem } from "@/lib/types";
import { uid } from "@/lib/utils";
import { ActivityComplete, ActivityShell, cue, useActivitySession } from "./activity-shell";

interface Bubble {
  id: string;
  x: number;
  size: number;
  duration: number;
  hue: string;
}
interface Pop {
  id: string;
  x: number;
  y: number;
  hue: string;
}

const HUES = ["#a9d6ff", "#cdbcfb", "#ffc9b0", "#bde3c0"];
const NOTES = [392, 440, 523, 587, 659, 784];
const LINES = ["Breathe in as a bubble rises…", "…and pop it as you breathe out.", "No rush. There will always be another.", "Notice the colours as they float by.", "Slow is the whole point."];

export function CalmBubbles({ item }: { item: ContentItem }) {
  const session = useActivitySession(item);
  const prefs = useApp((s) => s.preferences);
  const [minutes, setMinutes] = useState(2);
  const [status, setStatus] = useState<"intro" | "running" | "done">("intro");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [popped, setPopped] = useState(0);
  const [left, setLeft] = useState(0);
  const [line, setLine] = useState(0);
  const field = useRef<HTMLDivElement>(null);

  // Spawn bubbles, run the clock and rotate the gentle prompts.
  useEffect(() => {
    if (status !== "running") return;
    const endsAt = performance.now() + minutes * 60_000;
    const spawn = setInterval(() => {
      setBubbles((b) => [...b.slice(-14), { id: uid(), x: 8 + Math.random() * 84, size: 48 + Math.random() * 46, duration: 9 + Math.random() * 6, hue: HUES[Math.floor(Math.random() * HUES.length)] }]);
    }, 1300);
    const clock = setInterval(() => {
      const ms = endsAt - performance.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0) {
        setStatus("done");
        setBubbles([]);
        session.complete();
      }
    }, 250);
    const words = setInterval(() => setLine((l) => (l + 1) % LINES.length), 7000);
    return () => {
      clearInterval(spawn);
      clearInterval(clock);
      clearInterval(words);
    };
  }, [status, minutes, session]);

  const pop = (b: Bubble, e: React.MouseEvent | React.PointerEvent) => {
    const rect = field.current?.getBoundingClientRect();
    if (rect) setPops((p) => [...p.slice(-6), { id: b.id, x: e.clientX - rect.left, y: e.clientY - rect.top, hue: b.hue }]);
    setBubbles((all) => all.filter((x) => x.id !== b.id));
    setPopped((n) => n + 1);
    cue(NOTES[(popped * 3) % NOTES.length], 0.05, 12);
  };

  const begin = () => {
    setPopped(0);
    setBubbles([]);
    setLeft(minutes * 60);
    session.start();
    setStatus("running");
  };

  if (status === "done")
    return (
      <ActivityShell item={item} atmosphere="afternoon">
        <ActivityComplete item={item} onRestart={() => setStatus("intro")} headline={popped ? `${popped} bubbles, popped slowly` : "Time's up"} detail="No score to beat. Just a few minutes of doing one gentle thing at a time." />
      </ActivityShell>
    );

  if (status === "intro")
    return (
      <ActivityShell item={item} atmosphere="afternoon">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Mascot state="happy" size={150} />
          <h2 className="mt-3 font-display text-3xl">Pop, slowly</h2>
          <p className="mt-2 max-w-sm text-white/75">Bubbles will drift up. Tap one as you breathe out. There&apos;s no score and no way to lose.</p>
          <div className="mt-6 flex gap-2">
            {[1, 2, 5].map((m) => (
              <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                {m} min
              </Chip>
            ))}
          </div>
          <Button variant="primary" size="lg" className="mt-6 w-full max-w-xs" onClick={begin}>
            Start
          </Button>
          {!prefs.breathingSoundCues && <p className="mt-3 text-xs text-white/50">Sound cues are off (Breathe → settings).</p>}
        </div>
      </ActivityShell>
    );

  return (
    <ActivityShell item={item} atmosphere="afternoon" progress={1 - left / (minutes * 60)}>
      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between text-sm">
          <AnimatePresence mode="wait">
            <motion.p key={line} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-white/75">
              {LINES[line]}
            </motion.p>
          </AnimatePresence>
          <span className="tabular-nums text-white/60">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        </div>
        <div ref={field} className="relative min-h-[58vh] flex-1 touch-manipulation overflow-hidden rounded-[28px] border border-white/10" aria-label="Bubble field">
          <div className="absolute inset-0">
            <Landscape spec={item.artwork} seed="bubbles" animated />
            <div className="absolute inset-0 bg-night-950/30" />
          </div>
          <AnimatePresence>
            {bubbles.map((b) => (
              <motion.button
                key={b.id}
                aria-label="Pop bubble"
                onPointerDown={(e) => pop(b, e)}
                initial={{ top: "105%", opacity: 0 }}
                animate={{ top: "-25%", opacity: [0, 1, 1, 0.9], x: [0, 12, -10, 8, 0] }}
                exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
                transition={{ duration: b.duration, ease: "linear", x: { duration: b.duration, ease: "easeInOut" } }}
                onAnimationComplete={() => setBubbles((all) => all.filter((x) => x.id !== b.id))}
                className="absolute rounded-full"
                style={{
                  left: `${b.x}%`,
                  width: b.size,
                  height: b.size,
                  marginLeft: -b.size / 2,
                  background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0 8%, rgba(255,255,255,0.15) 22%, ${b.hue}55 60%, ${b.hue}aa 100%)`,
                  boxShadow: `inset 0 0 12px rgba(255,255,255,0.45), 0 0 18px ${b.hue}66`,
                }}
              />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {pops.map((p) => (
              <motion.div key={p.id} className="pointer-events-none absolute" style={{ left: p.x, top: p.y }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} onAnimationComplete={() => setPops((all) => all.filter((x) => x.id !== p.id))}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute h-2 w-2 rounded-full"
                    style={{ background: p.hue }}
                    initial={{ x: 0, y: 0 }}
                    animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 28, y: Math.sin((i / 6) * Math.PI * 2) * 28 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-white/60">{popped} popped</p>
          <Button
            size="sm"
            variant="glass"
            onClick={() => {
              setStatus("done");
              session.complete();
            }}
          >
            Finish
          </Button>
        </div>
      </div>
    </ActivityShell>
  );
}
