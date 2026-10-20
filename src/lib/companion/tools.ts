import { z } from "zod";
import type { ContentItem, SoundLayerSetting, StoryRequest } from "@/lib/types";

// Single source of truth for the companion's tools: Zod schemas validate inputs at runtime
// and are converted to JSON Schema for the Anthropic API.

const kindEnum = z.enum(["story", "meditation", "breathing", "soundscape", "focus"]);
const needEnum = z.enum(["sleep", "stress", "relax", "focus", "habits", "happiness", "mindfulness", "morning"]);
const soundIdEnum = z.enum(["rain", "ocean", "forest", "wind", "piano", "white-noise", "brown-noise", "crickets", "stream"]);
const timeOfDayEnum = z.enum(["morning", "afternoon", "evening", "night"]);

export const TOOL_SCHEMAS = {
  searchContent: z.object({
    query: z.string().min(1).max(200).describe("Keywords, e.g. 'rain cabin', 'body scan', 'lighthouse'"),
    kind: kindEnum.optional().describe("Restrict to one type of content"),
    maxMinutes: z.number().int().min(1).max(120).optional(),
  }),
  recommendContent: z.object({
    need: needEnum.describe("What the user wants help with right now"),
    kind: kindEnum.optional(),
    maxMinutes: z.number().int().min(1).max(120).optional(),
  }),
  startSleepStory: z.object({
    contentId: z.string().describe("id of a story from searchContent/recommendContent or a generated story"),
  }),
  startMeditation: z.object({
    contentId: z.string().describe("id of a meditation from searchContent/recommendContent"),
  }),
  startBreathing: z.object({
    pattern: z.enum(["gentle", "box", "478", "custom"]).describe("gentle = 5 in/5 out; box = 4-4-4-4; 478 = 4 in, 7 hold, 8 out"),
    minutes: z.number().int().min(1).max(20).optional(),
    inhale: z.number().min(2).max(10).optional().describe("custom only"),
    hold: z.number().min(0).max(10).optional().describe("custom only"),
    exhale: z.number().min(2).max(12).optional().describe("custom only"),
    holdAfter: z.number().min(0).max(10).optional().describe("custom only"),
  }),
  playSoundscape: z.object({
    presetId: z
      .enum(["rainy-window", "ocean-drift", "harbour-night", "summer-night", "morning-meadow", "lakeside", "soft-piano", "deep-focus", "night-wind"])
      .optional()
      .describe("A ready-made mix"),
    layers: z
      .array(z.object({ soundId: soundIdEnum, volume: z.number().min(0).max(1) }))
      .max(5)
      .optional()
      .describe("Or a custom mix of layers"),
    timerMinutes: z.number().int().min(5).max(240).optional().describe("Fade out after this many minutes"),
  }),
  startFocusSession: z.object({
    minutes: z.number().int().min(5).max(120),
    presetId: z.enum(["deep-focus", "rainy-window", "morning-meadow", "lakeside", "ocean-drift"]).optional(),
    intention: z.string().max(140).optional().describe("What the user wants to focus on, in their words"),
  }),
  createRoutine: z.object({
    name: z.string().min(2).max(60),
    description: z.string().max(200).optional(),
    timeOfDay: timeOfDayEnum,
    contentIds: z.array(z.string()).min(1).max(5).describe("Ordered content ids for each step"),
    days: z.array(z.number().int().min(0).max(6)).optional().describe("0=Sunday ... 6=Saturday. Omit for every day"),
  }),
  savePreference: z.object({
    category: z.enum(["favourite_genre", "session_length", "bedtime", "sound", "routine", "other"]),
    text: z.string().min(2).max(160).describe("A short, non-sensitive preference in third person, e.g. 'Likes rainy, cosy sleep stories'"),
  }),
  getRoutine: z.object({
    timeOfDay: timeOfDayEnum.optional(),
  }),
  getRecentSessions: z.object({
    limit: z.number().int().min(1).max(10).optional(),
  }),
  openJournal: z.object({
    prompt: z.string().max(200).optional().describe("An optional gentle writing prompt"),
  }),
  createPersonalisedStory: z.object({
    setting: z.string().min(2).max(80).describe("e.g. 'a lighthouse on a quiet island'"),
    atmosphere: z.string().min(2).max(60).describe("e.g. 'soft rain', 'snowy night', 'warm summer evening'"),
    minutes: z.number().int().min(3).max(20),
    themes: z.array(z.string().max(30)).max(4),
    characterName: z.string().max(30).optional(),
  }),
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;
export type ToolInput<N extends ToolName> = z.infer<(typeof TOOL_SCHEMAS)[N]>;

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  searchContent: "Search the in-app library (sleep stories, meditations, breathing, soundscapes, focus sessions). Results are shown to the user as cards.",
  recommendContent: "Get up to 3 personalised recommendations for a need, using the user's preferences, favourites and history. Results are shown as cards.",
  startSleepStory: "Start playing a sleep story in the app's player. Only use after the user has agreed to a story.",
  startMeditation: "Start playing a guided meditation in the app's player. Only use after the user has agreed.",
  startBreathing: "Open the Breathing Studio and begin a paced breathing exercise. Only use after the user has agreed.",
  playSoundscape: "Start the ambient soundscape mixer with a preset or a custom mix of layers.",
  startFocusSession: "Open the Focus timer with an optional soundscape and intention.",
  createRoutine: "Create a reusable wellbeing routine made of 1-5 content steps. Confirm the plan with the user first.",
  savePreference: "Save a NON-SENSITIVE preference to long-term memory (only works if the user enabled memory). Never save health, mental-health, relationship, location or other sensitive details.",
  getRoutine: "Read the user's saved routines and whether they've done them today.",
  getRecentSessions: "Read the user's recently played or completed sessions.",
  openJournal: "Open the private journal, optionally with a writing prompt.",
  createPersonalisedStory: "Write an original, personalised sleep story and open it in the player. Takes a few seconds.",
};

export const TOOL_NAMES = Object.keys(TOOL_SCHEMAS) as ToolName[];

/** JSON schemas for the Anthropic Messages API. */
export function anthropicToolDefinitions() {
  return TOOL_NAMES.map((name) => {
    const schema = z.toJSONSchema(TOOL_SCHEMAS[name]) as Record<string, unknown>;
    delete schema.$schema;
    return {
      name,
      description: TOOL_DESCRIPTIONS[name],
      input_schema: schema as { type: "object"; [k: string]: unknown },
    };
  });
}

/**
 * Actions are what tools hand back to the client so the interface actually changes.
 * The client applies them through real app functions (player, mixer, router, store).
 */
export type ClientAction =
  | { type: "showContent"; contentIds: string[] }
  | { type: "play"; contentId: string }
  | { type: "startBreathing"; pattern: "gentle" | "box" | "478" | "custom"; minutes: number; custom?: { inhale: number; hold: number; exhale: number; holdAfter: number } }
  | { type: "playSoundscape"; layers: SoundLayerSetting[]; presetId?: string; timerMinutes?: number }
  | { type: "startFocus"; minutes: number; presetId?: string; intention?: string }
  | { type: "createRoutine"; routine: { name: string; description: string; timeOfDay: "morning" | "afternoon" | "evening" | "night"; days: number[]; contentIds: string[] } }
  | { type: "saveMemory"; category: string; text: string }
  | { type: "openJournal"; prompt?: string }
  | { type: "addGeneratedStory"; story: ContentItem & { request: StoryRequest; generatedBy: "anthropic" | "demo-template" }; autoplay: boolean }
  | { type: "showSupport" };

// ---------- request context the client sends with each chat turn ----------

export const CompanionContextSchema = z.object({
  localTime: z.string().max(40),
  timeOfDay: timeOfDayEnum,
  companionName: z.string().max(30).default("Nimbus"),
  userName: z.string().max(40).optional(),
  goals: z.array(z.string().max(30)).max(10).default([]),
  tone: z.enum(["gentle", "playful", "minimal"]).default("gentle"),
  contentLength: z.enum(["short", "medium", "long"]).default("medium"),
  bedtime: z.string().max(5).optional(),
  memoryEnabled: z.boolean().default(false),
  memories: z.array(z.object({ category: z.string().max(30), text: z.string().max(200) })).max(30).default([]),
  recentSessions: z
    .array(z.object({ contentId: z.string().max(80), title: z.string().max(120), kind: z.string().max(20), when: z.string().max(40), completed: z.boolean() }))
    .max(20)
    .default([]),
  routines: z
    .array(z.object({ id: z.string().max(80), name: z.string().max(80), timeOfDay: z.string().max(20), steps: z.array(z.string().max(120)).max(5), doneToday: z.boolean() }))
    .max(20)
    .default([]),
  favouriteIds: z.array(z.string().max(80)).max(50).default([]),
  generatedStories: z.array(z.object({ id: z.string().max(80), title: z.string().max(120) })).max(20).default([]),
});

export type CompanionContext = z.infer<typeof CompanionContextSchema>;
