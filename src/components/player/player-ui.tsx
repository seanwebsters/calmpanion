"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Heart, Moon, Pause, Play, SkipBack, SkipForward, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Landscape } from "@/components/art/landscape";
import { Mascot } from "@/components/companion/mascot";
import { Button } from "@/components/ui/button";
import { Badge, Chip } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { KIND_LABEL } from "@/lib/content/catalog";
import { useNow } from "@/hooks/use-now";
import { useApp } from "@/lib/store/app-store";
import type { MemoryCategory } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";
import { usePlayer } from "./player-provider";

const BACKEND_LABEL = { elevenlabs: "Natural voice", device: "Device voice", none: "Read-along" } as const;

export function SourceBadge({ source, generatedBy }: { source: string; generatedBy?: string }) {
  if (source === "generated")
    return (
      <Badge tone="ai">
        <Sparkles className="h-3 w-3" /> {generatedBy === "demo-template" ? "Generated · demo template" : "AI-written"}
      </Badge>
    );
  if (source === "licensed") return <Badge>Licensed</Badge>;
  return <Badge tone="demo">Original demo</Badge>;
}

export function MiniPlayer() {
  const p = usePlayer();
  const pathname = usePathname();
  const hidden = !p.item || p.expanded || pathname.startsWith("/onboarding") || pathname.startsWith("/companion/voice");
  return (
    <AnimatePresence>
      {!hidden && p.item && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-3 bottom-[88px] z-30 mx-auto max-w-xl sm:bottom-6"
        >
          <div className="glass-strong flex items-center gap-3 rounded-[24px] p-2 pr-3">
            <button onClick={() => p.setExpanded(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Open player">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl">
                <Landscape spec={p.item.artwork} seed={p.item.id} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{p.item.title}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full bg-lilac-300 transition-all" style={{ width: `${p.duration ? (p.elapsed / p.duration) * 100 : 0}%` }} />
                </div>
              </div>
            </button>
            <Button size="icon" variant="ghost" onClick={p.toggle} aria-label={p.status === "playing" ? "Pause" : "Play"}>
              {p.status === "playing" || p.status === "loading" ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={p.stop} aria-label="Close player">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FullPlayer() {
  const p = usePlayer();
  const favourites = useApp((s) => s.favourites);
  const toggleFavourite = useApp((s) => s.toggleFavourite);
  const [showText, setShowText] = useState(true);
  const [timerOpen, setTimerOpen] = useState(false);
  const item = p.item;
  const isFav = item ? favourites.includes(item.id) : false;
  const playing = p.status === "playing" || p.status === "loading";
  const now = useNow(15_000, Boolean(p.sleepTimerEndsAt));

  return (
    <AnimatePresence>
      {item && p.expanded && (
        <motion.div
          key="player"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 240 }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-night-950"
          role="dialog"
          aria-label={`Now playing: ${item.title}`}
        >
          <div className="absolute inset-0">
            <Landscape spec={item.artwork} seed={item.id} animated detail="high" />
            <div className="absolute inset-0 bg-gradient-to-b from-night-950/30 via-night-950/40 to-night-950/95" />
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-xl flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),16px)]">
            <div className="flex items-center justify-between">
              <Button size="icon" variant="ghost" onClick={() => p.setExpanded(false)} aria-label="Minimise player">
                <ChevronDown className="h-6 w-6" />
              </Button>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{KIND_LABEL[item.kind]}</span>
              <Button size="icon" variant="ghost" onClick={p.stop} aria-label="Stop and close">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {p.status === "ended" ? (
              <Completion />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <Mascot state={playing ? (item.kind === "story" ? "sleeping" : "idle") : "idle"} size={120} />
                <h2 className="mt-4 font-display text-3xl leading-tight text-glow">{item.title}</h2>
                <p className="mt-1 text-white/75">{item.subtitle}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <SourceBadge source={item.source} generatedBy={(item as { generatedBy?: string }).generatedBy} />
                  <Badge>{BACKEND_LABEL[p.backend]}</Badge>
                </div>
                {showText && (
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={p.segIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.6 }}
                      className="mt-6 max-h-[28vh] overflow-y-auto font-display text-lg leading-relaxed text-white/90"
                      aria-live="polite"
                    >
                      {item.script[p.segIndex]?.text}
                    </motion.p>
                  </AnimatePresence>
                )}
                {p.notice && <p className="mt-4 rounded-2xl bg-amber-200/10 px-4 py-2 text-sm text-amber-100">{p.notice}</p>}
              </div>
            )}

            {p.status !== "ended" && (
              <div className="space-y-5">
                <div>
                  <div className="flex gap-1" role="group" aria-label="Story sections">
                    {item.script.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => p.seekSegment(i)}
                        aria-label={`Jump to part ${i + 1}`}
                        className={cn("h-1.5 flex-1 rounded-full transition-colors", i < p.segIndex ? "bg-lilac-300" : i === p.segIndex ? "bg-lilac-200" : "bg-white/20")}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs tabular-nums text-white/60">
                    <span>{formatClock(p.elapsed)}</span>
                    <span>≈ {formatClock(p.duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <Button size="icon" variant="ghost" onClick={() => p.seekSegment(p.segIndex - 1)} aria-label="Previous part">
                    <SkipBack className="h-6 w-6" />
                  </Button>
                  <Button size="icon-lg" variant="primary" onClick={p.toggle} aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => p.seekSegment(p.segIndex + 1)} aria-label="Next part">
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Chip onClick={() => p.setSpeed(p.speed === 1 ? 0.85 : p.speed === 0.85 ? 1.15 : 1)} aria-label="Change speed">
                    {p.speed}×
                  </Chip>
                  <Chip active={Boolean(p.sleepTimerEndsAt)} onClick={() => setTimerOpen((v) => !v)}>
                    <Moon className="h-4 w-4" />
                    {p.sleepTimerEndsAt ? `${Math.max(1, Math.round((p.sleepTimerEndsAt - now) / 60000))}m` : "Timer"}
                  </Chip>
                  <Chip active={isFav} onClick={() => toggleFavourite(item.id)} aria-label={isFav ? "Remove favourite" : "Add favourite"}>
                    <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                  </Chip>
                  <Chip active={showText} onClick={() => setShowText((v) => !v)}>
                    Text
                  </Chip>
                  {item.ambiencePresetId && (
                    <Chip active={p.ambienceOn} onClick={() => p.setAmbience(!p.ambienceOn)} aria-label="Background sounds">
                      {p.ambienceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      Sounds
                    </Chip>
                  )}
                </div>

                {timerOpen && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {[null, 10, 20, 30, 45].map((m) => (
                      <Chip
                        key={String(m)}
                        onClick={() => {
                          p.setSleepTimer(m);
                          setTimerOpen(false);
                        }}
                      >
                        {m ? `${m} min` : "Off"}
                      </Chip>
                    ))}
                  </div>
                )}

                {item.ambiencePresetId && p.ambienceOn && (
                  <div className="mx-auto flex max-w-xs items-center gap-3">
                    <VolumeX className="h-4 w-4 text-white/50" />
                    <Slider value={[p.ambienceVolume]} min={0} max={1} step={0.05} onValueChange={([v]) => p.setAmbienceVolume(v)} aria-label="Background volume" />
                    <Volume2 className="h-4 w-4 text-white/50" />
                  </div>
                )}

                {p.availableBackends.length > 1 && (
                  <div className="flex justify-center gap-2">
                    {p.availableBackends.map((b) => (
                      <button key={b} onClick={() => p.setBackend(b)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", p.backend === b ? "bg-white/20 text-white" : "text-white/55 hover:text-white")}>
                        {BACKEND_LABEL[b]}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-center text-[11px] text-white/45">
                  {p.backend === "device" ? "Narrated by your device's built-in voice. Playback may pause when your screen locks on some phones." : p.backend === "none" ? "No voice available here: the text advances at a gentle reading pace." : "Natural voice by your configured speech provider."}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Completion() {
  const p = usePlayer();
  const item = p.item!;
  const memoryEnabled = useApp((s) => s.preferences.memoryEnabled);
  const addMemory = useApp((s) => s.addMemory);
  const favourites = useApp((s) => s.favourites);
  const toggleFavourite = useApp((s) => s.toggleFavourite);
  const [saved, setSaved] = useState<string | null>(null);
  const isFav = favourites.includes(item.id);

  const prefText = item.kind === "story" ? `Enjoys sleep stories like "${item.title}" (${item.tags.slice(0, 3).join(", ")})` : `Enjoys ${item.subtitle.toLowerCase()} sessions like "${item.title}"`;
  const category: MemoryCategory = item.kind === "story" ? "favourite_genre" : "other";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
      <Mascot state="happy" size={150} />
      <h2 className="mt-4 font-display text-3xl">Nicely done</h2>
      <p className="mt-2 max-w-xs text-white/75">You finished &ldquo;{item.title}&rdquo;. Take a moment before you move on.</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <Button variant={isFav ? "glass" : "primary"} onClick={() => toggleFavourite(item.id)}>
          <Heart className={cn("h-4 w-4", isFav && "fill-current")} /> {isFav ? "In your favourites" : "Add to favourites"}
        </Button>
        {memoryEnabled ? (
          <Button
            variant="glass"
            disabled={Boolean(saved)}
            onClick={() => {
              const m = addMemory(category, prefText, "user");
              setSaved(m ? m.text : null);
            }}
          >
            <Sparkles className="h-4 w-4" /> {saved ? "Saved to memory" : "Remember I like this"}
          </Button>
        ) : (
          <p className="text-xs text-white/55">Turn on memory in Profile → Memory &amp; Privacy if you&apos;d like your companion to remember favourites.</p>
        )}
        <Button variant="ghost" onClick={p.stop}>
          Close
        </Button>
      </div>
    </motion.div>
  );
}
