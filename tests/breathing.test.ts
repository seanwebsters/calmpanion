import { describe, expect, it } from "vitest";
import { cycleSeconds, phaseAt, phasesFor, totalCycles } from "@/lib/breathing";
import { getBreathingPattern } from "@/lib/content/catalog";

describe("breathing engine", () => {
  const box = getBreathingPattern("box");
  const four78 = getBreathingPattern("478");

  it("skips zero-length phases", () => {
    expect(phasesFor(four78).map((p) => p.name)).toEqual(["inhale", "hold", "exhale"]);
    expect(phasesFor(box)).toHaveLength(4);
  });

  it("finds the right phase over time", () => {
    expect(phaseAt(box, 0).phase.name).toBe("inhale");
    expect(phaseAt(box, 5).phase.name).toBe("hold");
    expect(phaseAt(box, 9).phase.name).toBe("exhale");
    expect(phaseAt(box, 13).phase.name).toBe("holdAfter");
    expect(phaseAt(box, 16)).toMatchObject({ cycles: 1, index: 0 });
    expect(phaseAt(four78, 4 + 7 + 1).remaining).toBeCloseTo(7);
  });

  it("fits whole cycles into the duration", () => {
    expect(cycleSeconds(four78)).toBe(19);
    expect(totalCycles(four78, 4)).toBe(13);
    expect(totalCycles(box, 0.1)).toBe(1);
  });
});
