"use client";

import { Heart, Play } from "lucide-react";
import Link from "next/link";
import { Landscape } from "@/components/art/landscape";
import { usePlayer } from "@/components/player/player-provider";
import { contentMinutes, KIND_LABEL } from "@/lib/content/catalog";
import { useApp } from "@/lib/store/app-store";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Large artwork card used in rails and grids. Tapping opens details; the play button starts it. */
export function ContentCard({ item, size = "md", className }: { item: ContentItem; size?: "sm" | "md" | "lg"; className?: string }) {
  const player = usePlayer();
  const isFav = useApp((s) => s.favourites.includes(item.id));
  const dims = { sm: "w-40", md: "w-52", lg: "w-full" }[size];
  const href = item.source === "generated" ? null : `/explore/${item.id}`;
  const body = (
    <>
      <div className={cn("relative overflow-hidden rounded-[22px]", size === "lg" ? "aspect-[16/10]" : "aspect-[4/5]")}>
        <Landscape spec={item.artwork} seed={item.id} />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950/80 via-transparent to-transparent" />
        {isFav && <Heart className="absolute right-3 top-3 h-4 w-4 fill-peach-300 text-peach-300" aria-label="Favourite" />}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            {KIND_LABEL[item.kind]} · {contentMinutes(item)} min
          </p>
          <p className="mt-0.5 font-display text-[17px] leading-tight text-white">{item.title}</p>
        </div>
      </div>
    </>
  );
  return (
    <div className={cn("group relative shrink-0", dims, className)}>
      {href ? (
        <Link href={href} className="block transition-transform duration-300 group-hover:-translate-y-1">
          {body}
        </Link>
      ) : (
        <button onClick={() => player.play(item)} className="block w-full text-left">
          {body}
        </button>
      )}
      <button
        onClick={() => player.play(item)}
        aria-label={`Play ${item.title}`}
        className="absolute bottom-[14px] right-3 hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 text-night-900 shadow-lg transition group-hover:flex sm:flex sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Play className="ml-0.5 h-4 w-4" />
      </button>
    </div>
  );
}

export function ContentRail({ items, size = "md" }: { items: ContentItem[]; size?: "sm" | "md" }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6">
      {items.map((i) => (
        <ContentCard key={i.id} item={i} size={size} className="snap-start" />
      ))}
    </div>
  );
}

/** Compact horizontal row, used inside chat and lists. */
export function ContentRow({ item, onPlay, trailing }: { item: ContentItem; onPlay?: () => void; trailing?: React.ReactNode }) {
  const player = usePlayer();
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-white/6 p-2 pr-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
        <Landscape spec={item.artwork} seed={item.id} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.title}</p>
        <p className="truncate text-xs text-white/60">
          {KIND_LABEL[item.kind]} · {contentMinutes(item)} min
        </p>
      </div>
      {trailing}
      <button
        onClick={onPlay ?? (() => player.play(item))}
        aria-label={`Play ${item.title}`}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-night-900 transition active:scale-95"
      >
        <Play className="ml-0.5 h-4 w-4" />
      </button>
    </div>
  );
}
