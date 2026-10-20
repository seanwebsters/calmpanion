import { describe, expect, it } from "vitest";
import { writeTemplateStory } from "@/lib/companion/story-template";
import { anthropicToolDefinitions, TOOL_NAMES } from "@/lib/companion/tools";
import { CATALOG, CATEGORIES, contentMinutes, recommendContent, searchContent } from "@/lib/content/catalog";
import { getPreset, SOUND_PRESETS } from "@/lib/content/sounds";

describe("catalog", () => {
  it("has unique ids and valid references", () => {
    const ids = CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const c of CATALOG) {
      for (const cat of c.categoryIds) expect(cats.has(cat), `${c.id} → ${cat}`).toBe(true);
      if (c.ambiencePresetId) expect(getPreset(c.ambiencePresetId), c.id).toBeDefined();
      expect(c.source).toBe("original-demo");
    }
  });

  it("estimates durations from scripts", () => {
    for (const c of CATALOG.filter((x) => x.kind === "story")) expect(contentMinutes(c)).toBeGreaterThanOrEqual(3);
  });

  it("searches by keyword", () => {
    expect(searchContent({ query: "lighthouse" })[0].id).toBe("lantern-keepers-harbour");
    expect(searchContent({ query: "body scan" })[0].id).toBe("body-scan-drift");
    expect(searchContent({ query: "rain", kind: "story" }).every((c) => c.kind === "story")).toBe(true);
  });

  it("recommends for the need and respects length", () => {
    const recs = recommendContent({ need: "stress", timeOfDay: "afternoon", maxMinutes: 5 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].item.needs).toContain("stress");
  });

  it("soundscape presets only use real sounds", () => {
    for (const p of SOUND_PRESETS) expect(p.layers.length).toBeGreaterThan(0);
  });
});

describe("tools", () => {
  it("produces object JSON schemas for every tool", () => {
    const defs = anthropicToolDefinitions();
    expect(defs.map((d) => d.name)).toEqual(TOOL_NAMES);
    for (const d of defs) expect(d.input_schema.type).toBe("object");
  });
});

describe("template story writer", () => {
  it("writes an original, labelled story roughly matching the length", () => {
    const s = writeTemplateStory({ setting: "a snowy alpine cabin", atmosphere: "gently falling snow", minutes: 10, themes: ["cosiness", "wonder"], characterName: "Mira" });
    expect(s.source).toBe("generated");
    expect(s.generatedBy).toBe("demo-template");
    expect(s.script.some((x) => x.text.includes("Mira"))).toBe(true);
    expect(contentMinutes(s)).toBeGreaterThanOrEqual(6);
    expect(s.artwork.scene).toBe("snow");
  });
});
