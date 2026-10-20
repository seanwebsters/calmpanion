"use client";

import { ClientOnly, PageSkeleton } from "@/components/layout/client-only";
import { Search, Sparkles, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Atmosphere } from "@/components/art/atmosphere";
import { Landscape } from "@/components/art/landscape";
import { ContentCard, ContentRail, ContentRow } from "@/components/content/content-card";
import { Page } from "@/components/layout/app-shell";
import { usePlayer } from "@/components/player/player-provider";
import { Button } from "@/components/ui/button";
import { Chip, EmptyState, inputClass, PageHeader, SectionHeader } from "@/components/ui/misc";
import { useHydrated } from "@/hooks/use-hydrated";
import { CATALOG, CATEGORIES, contentMinutes, recommendContent, searchContent } from "@/lib/content/catalog";
import { resolveContent, useApp } from "@/lib/store/app-store";
import { cn, getTimeOfDay } from "@/lib/utils";

const STORY_CATS = CATEGORIES.filter((c) => c.kind === "story" || c.id === "nature");

function SleepPageContent() {
  const hydrated = useHydrated();
  const player = usePlayer();
  const prefs = useApp((s) => s.preferences);
  const sessions = useApp((s) => s.sessions);
  const favourites = useApp((s) => s.favourites);
  const memories = useApp((s) => s.memories);
  const generated = useApp((s) => s.generatedStories);
  const deleteGenerated = useApp((s) => s.deleteGeneratedStory);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const stories = CATALOG.filter((c) => c.kind === "story");
  const featured = stories.find((s) => s.featured && s.id !== "lantern-keepers-harbour") ?? stories[0];
  const recommended = useMemo(
    () =>
      recommendContent(
        { need: "sleep", kind: "story", timeOfDay: getTimeOfDay(), contentLength: prefs.contentLength, favouriteIds: favourites, recentIds: sessions.map((s) => s.contentId), likedTags: prefs.memoryEnabled ? memories.flatMap((m) => m.text.toLowerCase().split(/\W+/)) : [] },
        stories,
        4,
      ).map((r) => r.item),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefs, favourites, sessions, memories],
  );
  const continuing = sessions
    .filter((s) => s.kind === "story" && !s.completedAt && s.progress > 0.05 && s.progress < 0.95)
    .map((s) => ({ s, item: resolveContent(s.contentId, generated) }))
    .filter((x) => x.item)
    .filter((x, i, arr) => arr.findIndex((y) => y.item!.id === x.item!.id) === i)
    .slice(0, 3);
  const filtered = (query ? searchContent({ query, kind: "story" }) : stories).filter((s) => !cat || s.categoryIds.includes(cat));

  return (
    <>
      <Atmosphere override="night" dim={0.4} />
      <Page wide>
        <PageHeader title="Sleep Stories" subtitle="Gentle tales to help you drift off" />

        <div className="relative overflow-hidden rounded-[28px]">
          <div className="aspect-[4/3] sm:aspect-[21/9]">
            <Landscape spec={featured.artwork} seed={featured.id} animated detail="high" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Featured · {contentMinutes(featured)} min</p>
            <h2 className="mt-1 font-display text-3xl">{featured.title}</h2>
            <p className="mt-1 max-w-md text-sm text-white/75">{featured.description}</p>
            <Button variant="primary" className="mt-4" onClick={() => player.play(featured)}>
              Play story
            </Button>
          </div>
        </div>

        <Link href="/sleep/create" className="glass group mt-4 flex items-center gap-4 rounded-[24px] p-4 transition hover:bg-white/15">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300/40 to-lilac-300/40">
            <Wand2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Create a story just for you</p>
            <p className="text-sm text-white/65">Pick a setting, a mood and a length. An original story, written by AI.</p>
          </div>
        </Link>

        <div className="mt-9 space-y-9">
          {continuing.length > 0 && (
            <section>
              <SectionHeader title="Continue listening" />
              <div className="space-y-2">
                {continuing.map(({ s, item }) => (
                  <ContentRow key={s.id} item={item!} onPlay={() => player.play(item!, { fromSegment: Math.floor(s.progress * item!.script.length) })} trailing={<span className="text-xs text-white/60">{Math.round(s.progress * 100)}%</span>} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="Recommended for you" />
            {hydrated ? <ContentRail items={recommended} /> : <div className="skeleton h-64 rounded-[22px]" />}
          </section>

          {generated.length > 0 && (
            <section>
              <SectionHeader title="Your personalised stories" />
              <div className="space-y-2">
                {generated.map((g) => (
                  <ContentRow
                    key={g.id}
                    item={g}
                    trailing={
                      <button onClick={() => deleteGenerated(g.id)} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label={`Delete ${g.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    }
                  />
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 px-1 text-xs text-white/50">
                <Sparkles className="h-3 w-3" /> AI-written originals, separate from the demo catalogue.
              </p>
            </section>
          )}

          <section>
            <SectionHeader title="All stories" />
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
              <input className={cn(inputClass, "rounded-full pl-12")} placeholder="Search stories" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search stories" />
            </div>
            <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
              <Chip active={!cat} onClick={() => setCat(null)}>
                All
              </Chip>
              {STORY_CATS.map((c) => (
                <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.name}
                </Chip>
              ))}
            </div>
            {filtered.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((s) => (
                  <ContentCard key={s.id} item={s} className="w-full" />
                ))}
              </div>
            ) : (
              <EmptyState title="No stories match" body="Try another word, or create your own story about it.">
                <Button asChild variant="primary" size="sm">
                  <Link href="/sleep/create">Create a story</Link>
                </Button>
              </EmptyState>
            )}
          </section>
        </div>
      </Page>
    </>
  );
}

// Depends on the local store and the current date, so it renders in the browser only.
export default function SleepPage() {
  return (
    <ClientOnly fallback={<PageSkeleton />}>
      <SleepPageContent />
    </ClientOnly>
  );
}
