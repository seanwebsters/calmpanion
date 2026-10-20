import { describe, expect, it } from "vitest";
import { assessSafety, crisisReply } from "@/lib/companion/safety";

describe("assessSafety", () => {
  it.each(["I want to kill myself", "thinking about suicide", "I don't want to be alive anymore", "everyone would be better off without me", "I've been self-harming"])(
    "flags crisis language: %s",
    (t) => expect(assessSafety(t)).toBe("crisis"),
  );
  it.each(["I'm having a panic attack", "I feel hopeless", "I can't cope"])("flags distress: %s", (t) => expect(assessSafety(t)).toBe("distress"));
  it.each(["help me sleep", "I'm a bit stressed about work", "this story is killing me, it's so cute"])("does not over-trigger: %s", (t) => expect(assessSafety(t)).toBe("none"));
  it("crisis reply discloses AI and points to real help", () => {
    const r = crisisReply("Nimbus");
    expect(r).toMatch(/AI companion/);
    expect(r).toMatch(/crisis line|emergency/);
  });
});
