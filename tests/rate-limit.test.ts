import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/server/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks until the window passes", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000, 1000 + i).ok).toBe(true);
    const blocked = rateLimit(key, 3, 1000, 1500);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit(key, 3, 1000, 2100).ok).toBe(true);
  });
});
