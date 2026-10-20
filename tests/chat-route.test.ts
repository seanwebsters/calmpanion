import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";

const context = { localTime: "Tue 22:00", timeOfDay: "evening", companionName: "Nimbus" };
const call = (messages: unknown[], ip: string) =>
  POST(new Request("http://x/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ messages, context }) }));

describe("POST /api/chat (demo provider)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("runs the full recommend → launch flow with real actions", async () => {
    const first = await (await call([{ role: "user", content: "I can't switch off tonight" }], "1.1.1.1")).json();
    expect(first.provider).toBe("demo");
    expect(first.actions[0].type).toBe("showContent");
    const second = await (
      await call(
        [
          { role: "user", content: "I can't switch off tonight" },
          { role: "assistant", content: first.reply, offers: first.offers },
          { role: "user", content: "Let's do the story" },
        ],
        "1.1.1.1",
      )
    ).json();
    expect(second.actions[0].type).toBe("play");
    expect(second.toolEvents[0]).toMatchObject({ name: "startSleepStory", ok: true });
  });

  it("short-circuits crisis language to support resources without tools", async () => {
    const res = await (await call([{ role: "user", content: "I want to end my life" }], "2.2.2.2")).json();
    expect(res.provider).toBe("safety");
    expect(res.actions).toEqual([{ type: "showSupport" }]);
  });

  it("rejects malformed bodies", async () => {
    const res = await POST(new Request("http://x/api/chat", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
});
