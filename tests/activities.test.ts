import { describe, expect, it } from "vitest";
import { planDemoTurn } from "@/lib/companion/demo-engine";
import { executeTool } from "@/lib/companion/executor";
import { ACTIVITY_IDS, CompanionContextSchema } from "@/lib/companion/tools";
import { suggestionsFor } from "@/lib/checkin";
import { ACTIVITY_ITEMS, getContent } from "@/lib/content/catalog";
import { indexAt } from "@/hooks/use-sequence";

const ctx = (timeOfDay: "morning" | "afternoon" | "evening" | "night" = "afternoon") => CompanionContextSchema.parse({ localTime: "Tue", timeOfDay });
const deps = { generateStory: async () => Promise.reject(new Error("unused")) };

describe("activities", () => {
  it("every activity id has a catalogue item and vice versa", () => {
    expect(ACTIVITY_ITEMS.map((a) => a.activityId).sort()).toEqual([...ACTIVITY_IDS].sort());
    for (const a of ACTIVITY_ITEMS) expect(a.kind).toBe("activity");
  });

  it("startActivity emits a real navigation action", async () => {
    const r = await executeTool("startActivity", { activityId: "worry-clouds" }, ctx(), deps);
    expect(r.ok).toBe(true);
    expect(r.actions).toEqual([{ type: "startActivity", activityId: "worry-clouds" }]);
  });

  it("rejects unknown activities", async () => {
    const r = await executeTool("startActivity", { activityId: "juggling" }, ctx(), deps);
    expect(r.ok).toBe(false);
  });

  it("stressed users are offered an activity, and picking it opens grounding", () => {
    const first = planDemoTurn([{ role: "user", content: "I'm so stressed" }], ctx());
    expect(first.offers).toContain("activity");
    const second = planDemoTurn(
      [
        { role: "user", content: "I'm so stressed" },
        { role: "assistant", content: first.reply, offers: first.offers },
        { role: "user", content: "the second one" },
      ],
      ctx(),
    );
    expect(second.calls[0]).toEqual({ name: "startActivity", input: { activityId: "grounding" } });
  });

  it("picks a fitting activity from what the user says", () => {
    expect(planDemoTurn([{ role: "user", content: "let's do something about my racing worries" }], ctx()).calls[0].input).toEqual({ activityId: "worry-clouds" });
    expect(planDemoTurn([{ role: "user", content: "can we do a stretch" }], ctx()).calls[0].input).toEqual({ activityId: "gentle-stretch" });
    expect(planDemoTurn([{ role: "user", content: "let's do an activity" }], ctx("night")).calls[0].input).toEqual({ activityId: "muscle-release" });
  });

  it("check-in suggestions only reference real content and include activities", () => {
    for (const mood of ["stormy", "rainy", "cloudy", "bright", "sunny"] as const)
      for (const energy of [1, 3, 5])
        for (const tod of ["morning", "evening"] as const) {
          const s = suggestionsFor(mood, energy, tod);
          for (const id of s.contentIds) expect(getContent(id), id).toBeDefined();
        }
    expect(suggestionsFor("stormy", 3, "afternoon").contentIds[0]).toBe("activity-grounding");
  });

  it("sequence timer maps time to the right phase", () => {
    const phases = [{ seconds: 5 }, { seconds: 10 }, { seconds: 5 }];
    expect(indexAt(phases, 0)).toBe(0);
    expect(indexAt(phases, 5)).toBe(1);
    expect(indexAt(phases, 14.9)).toBe(1);
    expect(indexAt(phases, 15)).toBe(2);
    expect(indexAt(phases, 99)).toBe(2);
  });
});
