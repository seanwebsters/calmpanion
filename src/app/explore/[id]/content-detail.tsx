"use client";

import { ChevronLeft, Clock, Heart, Play, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Landscape } from "@/components/art/landscape";
import { ContentRail } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { SourceBadge } from "@/components/player/player-ui";
import { Button } from "@/components/ui/button";
import { Badge, SectionHeader } from "@/components/ui/misc";
import { CATALOG, contentMinutes, getCategory, getContent, KIND_LABEL } from "@/lib/content/catalog";
import { getPreset } from "@/lib/content/sounds";
import { useApp } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

export function ContentDetail({ id }: { id: string }) {
  const item = getContent(id)!;
  const router = useRouter();
  const player = usePlayer();
  const isFav = useApp((s) => s.favourites.includes(id));
  const toggleFavourite = useApp((s) => s.toggleFavourite);
  const sessions = useApp((s) => s.sessions);
  const plays = sessions.filter((s) => s.contentId === id);
  const inProgress = plays.find((s) => !s.completedAt && s.progress > 0.05 && s.progress < 0.95);
  const related = CATALOG.filter((c) => c.id !== id && c.kind === item.kind && c.needs.some((n) => item.needs.includes(n))).slice(0, 6);
  const preset = item.ambiencePresetId ? getPreset(item.ambiencePresetId) : undefined;

  return (
    <div className="relative">
      <div className="relative h-[52vh] min-h-[340px] overflow-hidden">
        <Landscape spec={item.artwork} seed={item.id} animated detail="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-night-950/30 via-transparent to-night-950" />
        <Button size="icon" variant="glass" className="absolute left-4 top-[max(env(safe-area-inset-top),16px)]" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>
      <Page className="-mt-28 relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{KIND_LABEL[item.kind]}</p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-glow">{item.title}</h1>
        <p className="mt-1 text-white/80">{item.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> ≈ {contentMinutes(item)} min
          </span>
          <span className="inline-flex items-center gap-1">
            <User className="h-4 w-4" /> {item.narrator}
          </span>
          <SourceBadge source={item.source} />
          {plays.some((p) => p.completedAt) && <Badge>Completed</Badge>}
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="primary" size="lg" className="flex-1" onClick={() => player.play(item, inProgress ? { fromSegment: Math.floor(inProgress.progress * item.script.length) } : undefined)}>
            <Play className="h-5 w-5" /> {inProgress ? "Resume" : "Play"}
          </Button>
          <Button size="lg" variant="glass" onClick={() => toggleFavourite(item.id)} aria-label={isFav ? "Remove from favourites" : "Add to favourites"}>
            <Heart className={cn("h-5 w-5", isFav && "fill-peach-300 text-peach-300")} />
          </Button>
        </div>

        <p className="mt-6 leading-relaxed text-white/85">{item.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.categoryIds.map((c) => getCategory(c)).filter(Boolean).map((c) => (
            <Badge key={c!.id}>{c!.name}</Badge>
          ))}
          {preset && <Badge>Sounds: {preset.name}</Badge>}
        </div>

        {item.script.length > 0 && (
          <details className="glass mt-6 rounded-[24px] p-5">
            <summary className="cursor-pointer font-semibold">Read the script</summary>
            <div className="mt-3 space-y-3 font-display leading-relaxed text-white/80">
              {item.script.map((s, i) => (
                <p key={i}>{s.text}</p>
              ))}
            </div>
          </details>
        )}

        <p className="mt-6 text-xs text-white/50">
          Original demo content written for Calm Companion. Narration uses a configured speech provider or your device&apos;s voice.
        </p>

        {related.length > 0 && (
          <section className="mt-10">
            <SectionHeader title="You might also like" />
            <ContentRail items={related} size="sm" />
          </section>
        )}
      </Page>
    </div>
  );
}
