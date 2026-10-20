import type {
  BreathingPattern,
  ContentCategory,
  ContentItem,
  ContentKind,
  ContentLength,
  Need,
  ScriptSegment,
  TimeOfDay,
} from "@/lib/types";
import { MEDITATIONS } from "./meditations";
import { SOUND_PRESETS } from "./sounds";
import { STORIES } from "./stories";

export const BREATHING_PATTERNS: BreathingPattern[] = [
  { id: "gentle", name: "Gentle Paced", description: "Slow, even breaths. A comfortable place to start.", inhale: 5, hold: 0, exhale: 5, holdAfter: 0 },
  { id: "box", name: "Box Breathing", description: "Four equal sides: in, hold, out, hold.", inhale: 4, hold: 4, exhale: 4, holdAfter: 4 },
  { id: "478", name: "4-7-8", description: "In for 4, hold for 7, out for 8. Many people use it at bedtime.", inhale: 4, hold: 7, exhale: 8, holdAfter: 0 },
  { id: "custom", name: "Custom", description: "Set your own rhythm.", inhale: 4, hold: 2, exhale: 6, holdAfter: 0 },
];

export function getBreathingPattern(id: string): BreathingPattern {
  return BREATHING_PATTERNS.find((p) => p.id === id) ?? BREATHING_PATTERNS[0];
}

const BREATHING_ITEMS: ContentItem[] = [
  {
    id: "breathe-gentle",
    kind: "breathing",
    title: "Gentle Paced Breathing",
    subtitle: "5 in · 5 out",
    description: "Slow, even breathing with a soft glowing orb to follow. A comfortable place to start.",
    narrator: "Breathing Studio",
    categoryIds: ["breathwork"],
    tags: ["breathing", "calm", "anytime"],
    needs: ["stress", "relax", "mindfulness"],
    artwork: { scene: "clouds", palette: ["#23306e", "#6f8fd6", "#cfe1ff"], sun: true },
    script: [],
    source: "original-demo",
    breathingPatternId: "gentle",
    fixedMinutes: 3,
  },
  {
    id: "breathe-box",
    kind: "breathing",
    title: "Box Breathing",
    subtitle: "4 · 4 · 4 · 4",
    description: "Four equal phases to help steady a busy mind before something important.",
    narrator: "Breathing Studio",
    categoryIds: ["breathwork"],
    tags: ["breathing", "focus", "steady"],
    needs: ["stress", "focus"],
    artwork: { scene: "mountains", palette: ["#1a2a66", "#4c74c2", "#a8d6f5"] },
    script: [],
    source: "original-demo",
    breathingPatternId: "box",
    fixedMinutes: 4,
  },
  {
    id: "breathe-478",
    kind: "breathing",
    title: "4-7-8 Wind-Down",
    subtitle: "4 in · 7 hold · 8 out",
    description: "A longer out-breath that many people find soothing at bedtime. Stop any time it feels uncomfortable.",
    narrator: "Breathing Studio",
    categoryIds: ["breathwork", "sleep-meditations"],
    tags: ["breathing", "sleep", "evening"],
    needs: ["sleep", "relax"],
    artwork: { scene: "night", palette: ["#0f1440", "#3c3a86", "#b6a0ef"], moon: true, stars: true },
    script: [],
    source: "original-demo",
    breathingPatternId: "478",
    fixedMinutes: 4,
  },
];

const FOCUS_ITEMS: ContentItem[] = [
  {
    id: "focus-25",
    kind: "focus",
    title: "Deep Work · 25 min",
    subtitle: "Focus timer with brown noise",
    description: "A single focused block with a soft sound bed and a gentle chime at the end.",
    narrator: "Focus Studio",
    categoryIds: ["focus-sessions"],
    tags: ["focus", "work", "study", "pomodoro"],
    needs: ["focus"],
    artwork: { scene: "mountains", palette: ["#162a5c", "#4b79b8", "#b9e0f2"], sun: true },
    ambiencePresetId: "deep-focus",
    script: [],
    source: "original-demo",
    fixedMinutes: 25,
  },
  {
    id: "focus-50",
    kind: "focus",
    title: "Long Flow · 50 min",
    subtitle: "Focus timer with rain",
    description: "A longer block for absorbing work, with rain on the window.",
    narrator: "Focus Studio",
    categoryIds: ["focus-sessions"],
    tags: ["focus", "work", "flow"],
    needs: ["focus"],
    artwork: { scene: "forest", palette: ["#14223f", "#2e5170", "#86a9bd"], landmark: "cabin" },
    ambiencePresetId: "rainy-window",
    script: [],
    source: "original-demo",
    fixedMinutes: 50,
  },
];

const SOUNDSCAPE_ITEMS: ContentItem[] = SOUND_PRESETS.map((p) => ({
  id: `sound-${p.id}`,
  kind: "soundscape" as const,
  title: p.name,
  subtitle: "Soundscape",
  description: `${p.description}. Generated live in your browser, so it never loops the same way twice.`,
  narrator: "Soundscape Mixer",
  categoryIds: ["soundscapes"],
  tags: ["sounds", "ambient", ...p.layers.map((l) => l.soundId)],
  needs: p.id === "deep-focus" ? (["focus"] as Need[]) : (["sleep", "relax"] as Need[]),
  artwork: p.artwork,
  ambiencePresetId: p.id,
  script: [],
  source: "original-demo" as const,
  fixedMinutes: 30,
}));

export const CATALOG: ContentItem[] = [...STORIES, ...MEDITATIONS, ...BREATHING_ITEMS, ...FOCUS_ITEMS, ...SOUNDSCAPE_ITEMS];

export const CATEGORIES: ContentCategory[] = [
  { id: "sleep-stories", name: "Sleep Stories", kind: "story", description: "Gentle tales to drift off to", artwork: { scene: "night", palette: ["#0b1033", "#2d3a7c", "#b49be8"], moon: true, stars: true } },
  { id: "coastal", name: "By the Sea", kind: "story", description: "Harbours, shores and lighthouses", artwork: { scene: "ocean", palette: ["#0d1440", "#2c3f86", "#f2a98a"], landmark: "lighthouse" } },
  { id: "journeys", name: "Slow Journeys", kind: "story", description: "Trains, caravans and far-off places", artwork: { scene: "snow", palette: ["#0b1238", "#33417a", "#c7b9f0"], landmark: "train" } },
  { id: "nature", name: "Into Nature", kind: "any", description: "Gardens, forests and fresh air", artwork: { scene: "forest", palette: ["#1d3a3a", "#3f7a62", "#bde3c0"] } },
  { id: "cosy", name: "Cosy Corners", kind: "story", description: "Rain, fires and warm blankets", artwork: { scene: "forest", palette: ["#0f1a35", "#26456b", "#7aa3b8"], landmark: "cabin" } },
  { id: "morning", name: "Morning", kind: "meditation", description: "Start the day gently", artwork: { scene: "sunrise", palette: ["#3b4a8f", "#e9a6b4", "#ffd2a6"], sun: true } },
  { id: "stress", name: "Stress Less", kind: "meditation", description: "Make room around pressure", artwork: { scene: "lake", palette: ["#1a2156", "#5266a8", "#a9c7ee"] } },
  { id: "body-scan", name: "Body Scan", kind: "meditation", description: "Rest attention in the body", artwork: { scene: "clouds", palette: ["#1b1d50", "#5b5aa6", "#c9b6f2"] } },
  { id: "gratitude", name: "Gratitude", kind: "meditation", description: "Notice the good", artwork: { scene: "meadow", palette: ["#3a3f8c", "#d79bc0", "#ffd8b0"], sun: true } },
  { id: "relaxation", name: "Relaxation", kind: "meditation", description: "Let the body soften", artwork: { scene: "ocean", palette: ["#14205a", "#4f6fb3", "#f3c0a6"] } },
  { id: "focus-meditations", name: "Focus", kind: "meditation", description: "Gather your attention", artwork: { scene: "mountains", palette: ["#162a5c", "#4b79b8", "#b9e0f2"] } },
  { id: "evening", name: "Evening Wind-Down", kind: "meditation", description: "Close the day kindly", artwork: { scene: "mountains", palette: ["#121a4c", "#5a4a96", "#f0a88f"], moon: true } },
  { id: "sleep-meditations", name: "Sleep Meditations", kind: "meditation", description: "Guided practices for bedtime", artwork: { scene: "night", palette: ["#0f1440", "#3c3a86", "#b6a0ef"], moon: true, stars: true } },
  { id: "short-resets", name: "Short Resets", kind: "meditation", description: "One to three minutes", artwork: { scene: "clouds", palette: ["#2b3f8a", "#7fa6e0", "#cfe6ff"], sun: true } },
  { id: "mindfulness", name: "Mindfulness", kind: "meditation", description: "Everyday presence", artwork: { scene: "lake", palette: ["#24245e", "#8170c2", "#f4b9a3"] } },
  { id: "breathwork", name: "Breathwork", kind: "breathing", description: "Paced breathing with a guide", artwork: { scene: "clouds", palette: ["#23306e", "#6f8fd6", "#cfe1ff"] } },
  { id: "soundscapes", name: "Soundscapes", kind: "soundscape", description: "Mixable ambient sound", artwork: { scene: "ocean", palette: ["#0f1c4d", "#2f5ea0", "#9fd3ff"] } },
  { id: "focus-sessions", name: "Focus Sessions", kind: "focus", description: "Timers with sound", artwork: { scene: "mountains", palette: ["#162a5c", "#4b79b8", "#b9e0f2"] } },
];

export const COLLECTIONS: { id: string; title: string; description: string; contentIds: string[] }[] = [
  { id: "tonight", title: "For a soft landing tonight", description: "Wind down in stages", contentIds: ["dusk-wind-down", "breathe-478", "cabin-in-the-rain", "sound-rainy-window"] },
  { id: "busy-day", title: "When the day is a lot", description: "Small, steadying practices", contentIds: ["sixty-second-reset", "unclench", "breathe-box", "kind-pause"] },
  { id: "bright-start", title: "A bright start", description: "Gentle energy for the morning", contentIds: ["morning-light", "breathe-gentle", "three-good-things", "sound-morning-meadow"] },
];

/** Words spoken per minute at 1x by the narrator. */
const WPM = 130;

export function estimateScriptSeconds(script: ScriptSegment[], rate = 1): number[] {
  return script.map((s) => {
    const words = s.text.split(/\s+/).filter(Boolean).length;
    return (words / WPM) * 60 / rate + s.pauseSec / rate;
  });
}

export function contentMinutes(item: Pick<ContentItem, "script" | "fixedMinutes">): number {
  if (item.fixedMinutes) return item.fixedMinutes;
  const total = estimateScriptSeconds(item.script).reduce((a, b) => a + b, 0);
  return Math.max(1, Math.round(total / 60));
}

export function getContent(id: string, extra: ContentItem[] = []): ContentItem | undefined {
  return CATALOG.find((c) => c.id === id) ?? extra.find((c) => c.id === id);
}

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

export const KIND_LABEL: Record<ContentKind, string> = {
  story: "Sleep Story",
  meditation: "Meditation",
  breathing: "Breathwork",
  soundscape: "Soundscape",
  focus: "Focus",
};

export interface SearchOptions {
  query?: string;
  kind?: ContentKind;
  maxMinutes?: number;
  minMinutes?: number;
  need?: Need;
}

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

/** Simple weighted keyword search across titles, tags and descriptions. */
export function searchContent(opts: SearchOptions, pool: ContentItem[] = CATALOG): ContentItem[] {
  const terms = normalise(opts.query ?? "")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  const scored = pool
    .filter((c) => !opts.kind || c.kind === opts.kind)
    .filter((c) => !opts.need || c.needs.includes(opts.need))
    .filter((c) => opts.maxMinutes === undefined || contentMinutes(c) <= opts.maxMinutes)
    .filter((c) => opts.minMinutes === undefined || contentMinutes(c) >= opts.minMinutes)
    .map((c) => {
      if (terms.length === 0) return { c, score: c.featured ? 2 : 1 };
      const title = normalise(c.title);
      const hay = normalise([c.subtitle, c.description, c.tags.join(" "), c.needs.join(" "), c.categoryIds.join(" ")].join(" "));
      let score = 0;
      for (const t of terms) {
        const stem = t.replace(/(ing|s)$/, "");
        if (title.includes(stem)) score += 5;
        if (c.tags.some((tag) => tag.includes(stem))) score += 3;
        if (hay.includes(stem)) score += 1;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.c);
}

const STOP_WORDS = new Set(["the", "and", "for", "with", "something", "about", "some", "want", "need", "please", "play", "find", "show", "can", "you", "that", "this", "help", "like", "would", "into", "story", "stories"]);

const LENGTH_MAX: Record<ContentLength, number> = { short: 6, medium: 15, long: 60 };

export interface RecommendInput {
  need?: Need;
  kind?: ContentKind;
  timeOfDay: TimeOfDay;
  contentLength?: ContentLength;
  maxMinutes?: number;
  recentIds?: string[];
  favouriteIds?: string[];
  likedTags?: string[];
}

/** Deterministic, explainable recommendations. Returns items with a short reason. */
export function recommendContent(input: RecommendInput, pool: ContentItem[] = CATALOG, limit = 3) {
  const need: Need =
    input.need ?? (input.timeOfDay === "night" || input.timeOfDay === "evening" ? "sleep" : input.timeOfDay === "morning" ? "morning" : "focus");
  const max = input.maxMinutes ?? (input.contentLength ? LENGTH_MAX[input.contentLength] : undefined);
  const scored = pool
    .filter((c) => !input.kind || c.kind === input.kind)
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];
      if (c.needs.includes(need)) {
        score += 5;
        reasons.push(NEED_REASON[need]);
      }
      if (max !== undefined && contentMinutes(c) <= max) score += 2;
      if (max !== undefined && contentMinutes(c) > max) score -= 3;
      if (input.favouriteIds?.includes(c.id)) {
        score += 1;
        reasons.push("one of your favourites");
      }
      if (input.likedTags?.some((t) => c.tags.includes(t))) {
        score += 2;
        reasons.push("matches what you've told me you enjoy");
      }
      if (input.recentIds?.slice(0, 3).includes(c.id)) score -= 2;
      if (c.featured) score += 0.5;
      if ((input.timeOfDay === "evening" || input.timeOfDay === "night") && (c.kind === "story" || c.tags.includes("sleep"))) score += 1;
      if (input.timeOfDay === "morning" && c.tags.includes("morning")) score += 2;
      return { item: c, score, reason: reasons[0] ?? "a gentle fit for right now" };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

const NEED_REASON: Record<Need, string> = {
  sleep: "made for drifting off",
  stress: "helps make a little room around stress",
  relax: "good for unwinding",
  focus: "helps gather your attention",
  habits: "an easy one to make a habit of",
  happiness: "a warm, uplifting choice",
  mindfulness: "a simple way to be present",
  morning: "a gentle start to the day",
};
