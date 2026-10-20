import { z } from "zod";
import { writeTemplateStory } from "@/lib/companion/story-template";
import { hasAnthropic } from "@/lib/server/config";
import { clientKey, rateLimit, tooMany } from "@/lib/server/rate-limit";

const Body = z.object({
  setting: z.string().min(2).max(80),
  atmosphere: z.string().min(2).max(60),
  minutes: z.number().int().min(3).max(20),
  themes: z.array(z.string().max(30)).max(4),
  characterName: z.string().max(30).optional(),
});

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, "story"), 6, 60_000);
  if (!limit.ok) return tooMany(limit);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please check your story choices." }, { status: 400 });

  if (hasAnthropic()) {
    try {
      const { generateStoryWithClaude } = await import("@/lib/server/anthropic");
      return Response.json({ story: await generateStoryWithClaude(parsed.data) });
    } catch (err) {
      console.error("[story] generation failed", err);
      return Response.json({ error: "The story couldn't be written just now. Please try again." }, { status: 502 });
    }
  }
  const story = { ...writeTemplateStory(parsed.data), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  return Response.json({ story });
}
