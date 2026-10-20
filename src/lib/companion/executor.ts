import { CATALOG, contentMinutes, getBreathingPattern, getContent, recommendContent, searchContent } from "@/lib/content/catalog";
import { getPreset } from "@/lib/content/sounds";
import type { ContentItem, StoryRequest } from "@/lib/types";
import { TOOL_SCHEMAS, type ClientAction, type CompanionContext, type ToolName } from "./tools";

export interface ToolExecution {
  /** JSON-serialisable result returned to the model */
  result: Record<string, unknown>;
  /** human-readable line for the UI */
  summary: string;
  ok: boolean;
  actions: ClientAction[];
}

export type GeneratedStoryPayload = Extract<ClientAction, { type: "addGeneratedStory" }>["story"];

export interface ExecutorDeps {
  generateStory: (req: StoryRequest) => Promise<GeneratedStoryPayload>;
}

const SENSITIVE = [
  /\b(depress|anxi|bipolar|adhd|ptsd|ocd|trauma|panic|therap|psychiat|diagnos|medicat|pill|prescri|antidepress|sertraline|xanax)/i,
  /\b(suicid|self[-\s]?harm|eating disorder|anorex|bulimi|addict|alcohol|drug)/i,
  /\b(pregnan|cancer|illness|disease|disab|chronic|pain|surgery|hospital)/i,
  /\b(divorc|breakup|break-up|affair|abuse|grief|died|death|funeral)/i,
  /\b(religio|church|mosque|synagogue|politic|sexual|gay|lesbian|trans|bisexual)/i,
  /\b(address|street|postcode|zip code|phone|password|bank|salary|debt)/i,
];

export function isSensitiveMemory(text: string) {
  return SENSITIVE.some((r) => r.test(text));
}

function card(item: ContentItem) {
  return { id: item.id, title: item.title, kind: item.kind, minutes: contentMinutes(item), subtitle: item.subtitle };
}

function lookupPlayable(id: string, ctx: CompanionContext): { item?: ContentItem; generated?: { id: string; title: string } } {
  const item = getContent(id);
  if (item) return { item };
  const generated = ctx.generatedStories.find((g) => g.id === id);
  return { generated };
}

export async function executeTool(name: string, rawInput: unknown, ctx: CompanionContext, deps: ExecutorDeps): Promise<ToolExecution> {
  if (!(name in TOOL_SCHEMAS)) {
    return { ok: false, summary: `Unknown tool ${name}`, result: { error: `Unknown tool ${name}` }, actions: [] };
  }
  const parsed = TOOL_SCHEMAS[name as ToolName].safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, summary: "Couldn't understand that request", result: { error: "Invalid input", issues: parsed.error.issues.map((i) => i.message) }, actions: [] };
  }
  const input = parsed.data as Record<string, unknown>;

  switch (name as ToolName) {
    case "searchContent": {
      const i = TOOL_SCHEMAS.searchContent.parse(input);
      const results = searchContent({ query: i.query, kind: i.kind, maxMinutes: i.maxMinutes }).slice(0, 4);
      return {
        ok: true,
        summary: results.length ? `Found ${results.length} for "${i.query}"` : `Nothing found for "${i.query}"`,
        result: { results: results.map(card) },
        actions: results.length ? [{ type: "showContent", contentIds: results.map((r) => r.id) }] : [],
      };
    }
    case "recommendContent": {
      const i = TOOL_SCHEMAS.recommendContent.parse(input);
      const likedTags = ctx.memoryEnabled ? ctx.memories.flatMap((m) => m.text.toLowerCase().split(/\W+/)).filter((w) => w.length > 3) : [];
      const recs = recommendContent({
        need: i.need,
        kind: i.kind,
        maxMinutes: i.maxMinutes,
        timeOfDay: ctx.timeOfDay,
        contentLength: ctx.contentLength,
        recentIds: ctx.recentSessions.map((s) => s.contentId),
        favouriteIds: ctx.favouriteIds,
        likedTags,
      });
      return {
        ok: true,
        summary: `Picked ${recs.length} for ${i.need}`,
        result: { recommendations: recs.map((r) => ({ ...card(r.item), reason: r.reason })) },
        actions: recs.length ? [{ type: "showContent", contentIds: recs.map((r) => r.item.id) }] : [],
      };
    }
    case "startSleepStory":
    case "startMeditation": {
      const { contentId } = input as { contentId: string };
      const expected = name === "startSleepStory" ? "story" : "meditation";
      const { item, generated } = lookupPlayable(contentId, ctx);
      if (generated && expected === "story") {
        return { ok: true, summary: `Playing "${generated.title}"`, result: { started: true, title: generated.title }, actions: [{ type: "play", contentId }] };
      }
      if (!item || item.kind !== expected) {
        const alternatives = CATALOG.filter((c) => c.kind === expected).slice(0, 5).map(card);
        return { ok: false, summary: `Couldn't find that ${expected}`, result: { error: `No ${expected} with id ${contentId}`, alternatives }, actions: [] };
      }
      return {
        ok: true,
        summary: `Playing "${item.title}"`,
        result: { started: true, title: item.title, minutes: contentMinutes(item) },
        actions: [{ type: "play", contentId: item.id }],
      };
    }
    case "startBreathing": {
      const i = TOOL_SCHEMAS.startBreathing.parse(input);
      const base = getBreathingPattern(i.pattern);
      const custom =
        i.pattern === "custom"
          ? { inhale: i.inhale ?? base.inhale, hold: i.hold ?? base.hold, exhale: i.exhale ?? base.exhale, holdAfter: i.holdAfter ?? base.holdAfter }
          : undefined;
      const minutes = i.minutes ?? 3;
      return {
        ok: true,
        summary: `Breathing Studio · ${base.name} · ${minutes} min`,
        result: { started: true, pattern: base.name, minutes },
        actions: [{ type: "startBreathing", pattern: i.pattern, minutes, custom }],
      };
    }
    case "playSoundscape": {
      const i = TOOL_SCHEMAS.playSoundscape.parse(input);
      const preset = i.presetId ? getPreset(i.presetId) : undefined;
      const layers = i.layers?.length ? i.layers : preset?.layers;
      if (!layers?.length) {
        return { ok: false, summary: "No sounds chosen", result: { error: "Provide presetId or layers" }, actions: [] };
      }
      return {
        ok: true,
        summary: `Soundscape · ${preset?.name ?? "custom mix"}${i.timerMinutes ? ` · ${i.timerMinutes} min timer` : ""}`,
        result: { playing: true, preset: preset?.name ?? "custom", layers: layers.map((l) => l.soundId), timerMinutes: i.timerMinutes ?? null },
        actions: [{ type: "playSoundscape", layers, presetId: preset?.id, timerMinutes: i.timerMinutes }],
      };
    }
    case "startFocusSession": {
      const i = TOOL_SCHEMAS.startFocusSession.parse(input);
      return {
        ok: true,
        summary: `Focus · ${i.minutes} min`,
        result: { started: true, minutes: i.minutes },
        actions: [{ type: "startFocus", minutes: i.minutes, presetId: i.presetId ?? "deep-focus", intention: i.intention }],
      };
    }
    case "createRoutine": {
      const i = TOOL_SCHEMAS.createRoutine.parse(input);
      const valid = i.contentIds.filter((id) => getContent(id));
      if (!valid.length) {
        return { ok: false, summary: "Couldn't build that routine", result: { error: "None of the contentIds exist. Use searchContent first." }, actions: [] };
      }
      const steps = valid.map((id) => card(getContent(id)!));
      return {
        ok: true,
        summary: `Created routine "${i.name}"`,
        result: { created: true, name: i.name, steps, skippedIds: i.contentIds.filter((id) => !valid.includes(id)) },
        actions: [
          {
            type: "createRoutine",
            routine: { name: i.name, description: i.description ?? steps.map((s) => s.title).join(" → "), timeOfDay: i.timeOfDay, days: i.days ?? [0, 1, 2, 3, 4, 5, 6], contentIds: valid },
          },
        ],
      };
    }
    case "savePreference": {
      const i = TOOL_SCHEMAS.savePreference.parse(input);
      if (!ctx.memoryEnabled) {
        return { ok: false, summary: "Memory is off", result: { saved: false, reason: "The user has long-term memory turned off. Do not ask again unless they bring it up; they can enable it in Memory & Privacy." }, actions: [] };
      }
      if (isSensitiveMemory(i.text)) {
        return { ok: false, summary: "Not saved (sensitive)", result: { saved: false, reason: "That looks sensitive, so it was not stored. Only store simple, non-sensitive preferences." }, actions: [] };
      }
      return { ok: true, summary: `Remembered: ${i.text}`, result: { saved: true }, actions: [{ type: "saveMemory", category: i.category, text: i.text }] };
    }
    case "getRoutine": {
      const i = TOOL_SCHEMAS.getRoutine.parse(input);
      const routines = ctx.routines.filter((r) => !i.timeOfDay || r.timeOfDay === i.timeOfDay);
      return { ok: true, summary: `Read ${routines.length} routine${routines.length === 1 ? "" : "s"}`, result: { routines }, actions: [] };
    }
    case "getRecentSessions": {
      const i = TOOL_SCHEMAS.getRecentSessions.parse(input);
      const sessions = ctx.recentSessions.slice(0, i.limit ?? 5);
      return { ok: true, summary: `Read ${sessions.length} recent session${sessions.length === 1 ? "" : "s"}`, result: { sessions }, actions: [] };
    }
    case "openJournal": {
      const i = TOOL_SCHEMAS.openJournal.parse(input);
      return { ok: true, summary: "Opened your journal", result: { opened: true }, actions: [{ type: "openJournal", prompt: i.prompt }] };
    }
    case "createPersonalisedStory": {
      const i = TOOL_SCHEMAS.createPersonalisedStory.parse(input);
      try {
        const story = await deps.generateStory(i);
        return {
          ok: true,
          summary: `Wrote "${story.title}"`,
          result: { created: true, id: story.id, title: story.title, minutes: contentMinutes(story), playing: true },
          actions: [{ type: "addGeneratedStory", story, autoplay: true }],
        };
      } catch (err) {
        return { ok: false, summary: "Story writing failed", result: { error: err instanceof Error ? err.message : "generation failed" }, actions: [] };
      }
    }
  }
}
