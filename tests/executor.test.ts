import { describe, expect, it } from "vitest";
import { executeTool, isSensitiveMemory } from "@/lib/companion/executor";
import { writeTemplateStory } from "@/lib/companion/story-template";
import { CompanionContextSchema } from "@/lib/companion/tools";

const ctx = (over: Record<string, unknown> = {}) => CompanionContextSchema.parse({ localTime: "Tue 21:00", timeOfDay: "evening", ...over });
const deps = { generateStory: async (r: Parameters<typeof writeTemplateStory>[0]) => ({ ...writeTemplateStory(r), id: "gen-1", createdAt: "2026-01-01" }) };

describe("executeTool", () => {
  it("starts a real story and emits a play action", async () => {
    const r = await executeTool("startSleepStory", { contentId: "moon-garden" }, ctx(), deps);
    expect(r.ok).toBe(true);
    expect(r.actions).toEqual([{ type: "play", contentId: "moon-garden" }]);
  });

  it("refuses unknown ids instead of pretending", async () => {
    const r = await executeTool("startSleepStory", { contentId: "made-up" }, ctx(), deps);
    expect(r.ok).toBe(false);
    expect(r.actions).toHaveLength(0);
    expect(r.result.alternatives).toBeDefined();
  });

  it("refuses to play a meditation as a story", async () => {
    const r = await executeTool("startSleepStory", { contentId: "unclench" }, ctx(), deps);
    expect(r.ok).toBe(false);
  });

  it("validates inputs", async () => {
    const r = await executeTool("startBreathing", { pattern: "hyperventilate" }, ctx(), deps);
    expect(r.ok).toBe(false);
  });

  it("does not save memory when memory is off", async () => {
    const r = await executeTool("savePreference", { category: "favourite_genre", text: "Likes rainy stories" }, ctx({ memoryEnabled: false }), deps);
    expect(r.ok).toBe(false);
    expect(r.actions).toHaveLength(0);
  });

  it("saves non-sensitive memory when enabled", async () => {
    const r = await executeTool("savePreference", { category: "favourite_genre", text: "Likes rainy stories" }, ctx({ memoryEnabled: true }), deps);
    expect(r.ok).toBe(true);
    expect(r.actions[0]).toMatchObject({ type: "saveMemory" });
  });

  it("never stores sensitive disclosures", async () => {
    const r = await executeTool("savePreference", { category: "other", text: "Has anxiety and takes sertraline" }, ctx({ memoryEnabled: true }), deps);
    expect(r.ok).toBe(false);
    expect(isSensitiveMemory("recently went through a divorce")).toBe(true);
    expect(isSensitiveMemory("prefers 10 minute sessions")).toBe(false);
  });

  it("creates routines only from real content", async () => {
    const r = await executeTool("createRoutine", { name: "Wind down", timeOfDay: "evening", contentIds: ["breathe-478", "nope", "dusk-wind-down"] }, ctx(), deps);
    expect(r.ok).toBe(true);
    const action = r.actions[0];
    expect(action.type === "createRoutine" && action.routine.contentIds).toEqual(["breathe-478", "dusk-wind-down"]);
  });

  it("builds a soundscape from a preset", async () => {
    const r = await executeTool("playSoundscape", { presetId: "rainy-window", timerMinutes: 30 }, ctx(), deps);
    expect(r.actions[0]).toMatchObject({ type: "playSoundscape", timerMinutes: 30 });
  });

  it("writes and autoplays a personalised story", async () => {
    const r = await executeTool("createPersonalisedStory", { setting: "a lighthouse", atmosphere: "soft rain", minutes: 5, themes: ["cosiness"] }, ctx(), deps);
    expect(r.ok).toBe(true);
    expect(r.actions[0]).toMatchObject({ type: "addGeneratedStory", autoplay: true });
  });

  it("can play a user's generated story by id", async () => {
    const r = await executeTool("startSleepStory", { contentId: "gen-9" }, ctx({ generatedStories: [{ id: "gen-9", title: "Mine" }] }), deps);
    expect(r.ok).toBe(true);
  });
});
