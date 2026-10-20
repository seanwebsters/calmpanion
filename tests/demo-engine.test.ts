import { describe, expect, it } from "vitest";
import { planDemoTurn } from "@/lib/companion/demo-engine";
import { CompanionContextSchema } from "@/lib/companion/tools";

const ctx = CompanionContextSchema.parse({ localTime: "Tue 22:00", timeOfDay: "evening" });

describe("demo companion", () => {
  it("offers choices before launching anything", () => {
    const plan = planDemoTurn([{ role: "user", content: "I can't switch off tonight" }], ctx);
    expect(plan.offers).toEqual(["breathing", "story"]);
    expect(plan.calls.map((c) => c.name)).not.toContain("startSleepStory");
  });

  it("launches the chosen option on follow-up", () => {
    const plan = planDemoTurn(
      [
        { role: "user", content: "I can't switch off tonight" },
        { role: "assistant", content: "Breathing or a story?", offers: ["breathing", "story"] },
        { role: "user", content: "Let's do the story" },
      ],
      ctx,
    );
    expect(plan.calls[0].name).toBe("startSleepStory");
  });

  it("treats a plain yes as the first offer", () => {
    const plan = planDemoTurn(
      [
        { role: "assistant", content: "Breathing or a story?", offers: ["breathing", "story"] },
        { role: "user", content: "yes please" },
      ],
      ctx,
    );
    expect(plan.calls[0].name).toBe("startBreathing");
  });

  it("is honest about being an AI", () => {
    const plan = planDemoTurn([{ role: "user", content: "are you human?" }], ctx);
    expect(plan.reply).toMatch(/AI companion/);
  });

  it("routes memory requests to savePreference", () => {
    const plan = planDemoTurn([{ role: "user", content: "Remember that I like rainy stories" }], ctx);
    expect(plan.calls[0].name).toBe("savePreference");
  });
});
