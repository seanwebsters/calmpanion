"use client";

import { Brain, Moon, Search, Sparkles, Waves, Wind, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Landscape } from "@/components/art/landscape";
import { ContentCard, ContentRail } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { Chip, EmptyState, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { CATALOG, CATEGORIES, COLLECTIONS, contentMinutes, getContent, KIND_LABEL, searchContent } from "@/lib/content/catalog";
import { resolveContent, useApp } from "@/lib/store/app-store";
import type { ContentKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const TILES = [
  { href: "/sleep", label: "Sleep Stories", icon: Moon, art: CATEGORIES[0].artwork },
  { href: "/meditate", label: "Meditate", icon: Sparkles, art: CATEGORIES[5].artwork },
  { href: "/breathe", label: "Breathe", icon: Wind, art: CATEGORIES[15].artwork },
  { href: "/sounds", label: "Soundscapes", icon: Waves, art: CATEGORIES[16].artwork },
  { href: "/focus", label: "Focus", icon: Brain, art: CATEGORIES[17].artwork },
];

const DURATIONS = [
  { id: "any", label: "Any length" },
  { id: "short", label: "Under 5 min", max: 5 },
  { id: "mid", label: "5–15 min", min: 5, max: 15 },
  { id: "long", label: "15 min +", min: 15 },
] as const;

export default function ExplorePage() {
  const player = usePlayer();
  const favourites = useApp((s) => s.favourites);
  const generated = useApp((s) => s.generatedStories);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ContentKind | "all">("all");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]["id"]>("any");
  const [category, setCategory] = useState<string | null>(null);

  const filtering = query.trim() !== "" || kind !== "all" || duration !== "any" || category !== null;
  const results = useMemo(() => {
    const d = DURATIONS.find((x) => x.id === duration)!;
    let list = searchContent({
      query,
      kind: kind === "all" ? undefined : kind,
      maxMinutes: "max" in d ? d.max : undefined,
      minMinutes: "min" in d ? d.min : undefined,
    });
    if (category) list = list.filter((c) => c.categoryIds.includes(category));
    return list;
  }, [query, kind, duration, category]);

  const featured = getContent("lantern-keepers-harbour")!;
  const favItems = favourites.map((id) => resolveContent(id, generated)).filter((x) => x !== undefined);

  return (
    <>
      <Atmosphere dim={0.55} />
      <Page wide>
        <PageHeader title="Explore" subtitle="Browse everything at your own pace. No chat required." />

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
          <input className={cn(inputClass, "rounded-full pl-12")} placeholder="Search stories, meditations, sounds…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the library" />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/60 hover:bg-white/10" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:-mx-6 sm:px-6">
          {(["all", "story", "meditation", "breathing", "soundscape", "focus"] as const).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? "All" : KIND_LABEL[k]}
            </Chip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-white/15" />
          {DURATIONS.map((d) => (
            <Chip key={d.id} active={duration === d.id} onClick={() => setDuration(d.id)}>
              {d.label}
            </Chip>
          ))}
        </div>

        {filtering ? (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm text-white/70">
                {results.length} result{results.length === 1 ? "" : "s"}
                {category ? ` in ${CATEGORIES.find((c) => c.id === category)?.name}` : ""}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setKind("all");
                  setDuration("any");
                  setCategory(null);
                }}
              >
                Clear filters
              </Button>
            </div>
            {results.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {results.map((item) => (
                  <ContentCard key={item.id} item={item} className="w-full" />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing quite matches" body="Try a different word, or loosen the filters. You could also ask your companion to write a story about it." />
            )}
          </section>
        ) : (
          <div className="mt-6 space-y-9">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {TILES.map(({ href, label, icon: Icon, art }) => (
                <Link key={href} href={href} className="group relative h-24 overflow-hidden rounded-[22px] sm:h-28">
                  <Landscape spec={art} seed={href} />
                  <div className="absolute inset-0 bg-night-950/35 transition group-hover:bg-night-950/20" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 font-semibold">
                    <Icon className="h-5 w-5" /> {label}
                  </div>
                </Link>
              ))}
            </div>

            <section>
              <SectionHeader title="Featured tonight" />
              <div className="relative overflow-hidden rounded-[28px]">
                <div className="aspect-[16/9] sm:aspect-[21/9]">
                  <Landscape spec={featured.artwork} seed={featured.id} animated detail="high" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 via-night-950/20 to-transparent" />
                <div className="absolute bottom-0 p-5 sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Sleep Story · {contentMinutes(featured)} min</p>
                  <h3 className="mt-1 font-display text-3xl">{featured.title}</h3>
                  <p className="mt-1 max-w-md text-sm text-white/75">{featured.subtitle}</p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="primary" onClick={() => player.play(featured)}>
                      Play
                    </Button>
                    <Button asChild variant="glass">
                      <Link href={`/explore/${featured.id}`}>Details</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {favItems.length > 0 && (
              <section>
                <SectionHeader title="Your favourites" />
                <ContentRail items={favItems} size="sm" />
              </section>
            )}

            {COLLECTIONS.map((col) => (
              <section key={col.id}>
                <SectionHeader title={col.title} />
                <ContentRail items={col.contentIds.map((id) => getContent(id)!).filter(Boolean)} />
              </section>
            ))}

            <section>
              <SectionHeader title="Categories" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => setCategory(c.id)} className="group relative h-24 overflow-hidden rounded-[20px] text-left">
                    <Landscape spec={c.artwork} seed={c.id} />
                    <div className="absolute inset-0 bg-night-950/45 transition group-hover:bg-night-950/25" />
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <p className="font-semibold leading-tight">{c.name}</p>
                      <p className="truncate text-[11px] text-white/70">{c.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <SectionHeader title="Everything" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {CATALOG.filter((c) => c.kind === "story" || c.kind === "meditation").map((item) => (
                  <ContentCard key={item.id} item={item} className="w-full" />
                ))}
              </div>
            </section>
          </div>
        )}
      </Page>
    </>
  );
}
