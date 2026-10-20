"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Heart, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Mascot } from "@/components/companion/mascot";
import { Page } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/misc";
import { getAudioEngine } from "@/lib/audio/engine";
import { contentMinutes } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import { useUI } from "@/lib/store/ui-store";
import type { ContentItem, TimeOfDay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Logs an activity in listening history so it shows up in My Calm, streaks and routines. */
export function useActivitySession(item: ContentItem) {
  const id = useRef<string | null>(null);
  const start = useCallback(() => {
    void getAudioEngine().unlock();
    id.current = useApp.getState().startSession(item, contentMinutes(item));
  }, [item]);
  const complete = useCallback(() => {
    if (!id.current) id.current = useApp.getState().startSession(item, contentMinutes(item));
    useApp.getState().updateSession(id.current, { progress: 1, completedAt: new Date().toISOString() });
    id.current = null;
  }, [item]);
  const progress = useCallback((p: number) => {
    if (id.current) useApp.getState().updateSession(id.current, { progress: Math.round(p * 100) / 100 });
  }, []);
  return useMemo(() => ({ start, complete, progress }), [start, complete, progress]);
}

/** Soft feedback for taps and phase changes: a chime and, where supported, a tiny vibration. */
export function cue(pitch = 528, volume = 0.08, vibrate: number | number[] = 20) {
  const prefs = useApp.getState().preferences;
  if (prefs.breathingSoundCues) void getAudioEngine().chime(pitch, volume, 1.4);
  if (prefs.hapticsEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(vibrate);
}

export function ActivityShell({
  item,
  atmosphere,
  children,
  progress,
}: {
  item: ContentItem;
  atmosphere?: TimeOfDay;
  children: React.ReactNode;
  /** 0..1, shown as a thin bar under the header */
  progress?: number;
}) {
  const router = useRouter();
  return (
    <>
      <Atmosphere override={atmosphere} dim={0.5} />
      <Page className="flex min-h-[calc(100dvh-9rem)] flex-col">
        <header className="flex items-center gap-3 pb-3 pt-[max(env(safe-area-inset-top),16px)]">
          <Button size="icon" variant="glass" onClick={() => router.push("/activities")} aria-label="Back to activities">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Activity · {contentMinutes(item)} min</p>
            <h1 className="truncate font-display text-2xl leading-tight">{item.title}</h1>
          </div>
        </header>
        {progress !== undefined && (
          <div className="h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-300 via-lilac-300 to-peach-300" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        )}
        <div className="flex flex-1 flex-col pt-4">{children}</div>
      </Page>
    </>
  );
}

const FEELINGS = [
  { id: "calmer", label: "Calmer" },
  { id: "same", label: "About the same" },
  { id: "worse", label: "Not great" },
] as const;

export function ActivityComplete({ item, onRestart, headline, detail, extra }: { item: ContentItem; onRestart: () => void; headline?: string; detail?: string; extra?: React.ReactNode }) {
  const isFav = useApp((s) => s.favourites.includes(item.id));
  const toggleFavourite = useApp((s) => s.toggleFavourite);
  const setSupportOpen = useUI((s) => s.setSupportOpen);
  const [feeling, setFeeling] = useState<(typeof FEELINGS)[number]["id"] | null>(null);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center py-6 text-center">
      <Mascot state="happy" size={150} />
      <h2 className="mt-3 font-display text-3xl">{headline ?? "Nicely done"}</h2>
      <p className="mt-2 max-w-sm text-white/75">{detail ?? "Take a moment to notice how you feel now. There's no right answer."}</p>
      <p className="mt-6 text-sm font-semibold text-white/80">How do you feel?</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {FEELINGS.map((f) => (
          <Chip key={f.id} active={feeling === f.id} onClick={() => setFeeling(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>
      {feeling && (
        <p className="mt-3 max-w-sm text-sm text-white/70" aria-live="polite">
          {feeling === "calmer" ? "Lovely. You can come back to this any time." : feeling === "same" ? "That's okay. Sometimes it takes a couple of tries, or a different activity." : (
            <>
              Thanks for being honest. Maybe try something different, or talk to someone you trust.{" "}
              <button className="font-semibold text-lilac-200 underline" onClick={() => setSupportOpen(true)}>
                Support options
              </button>
            </>
          )}
        </p>
      )}
      {extra && <div className="mt-5 w-full max-w-xs">{extra}</div>}
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <Button variant="primary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" /> Do it again
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="glass" className="flex-1">
            <Link href="/activities">More activities</Link>
          </Button>
          <Button variant="glass" size="icon" onClick={() => toggleFavourite(item.id)} aria-label={isFav ? "Remove favourite" : "Add favourite"}>
            <Heart className={cn("h-5 w-5", isFav && "fill-peach-300 text-peach-300")} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
