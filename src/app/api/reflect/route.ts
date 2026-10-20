import { z } from "zod";
import { templateReflection } from "@/lib/companion/reflect-template";
import { hasAnthropic } from "@/lib/server/config";
import { clientKey, rateLimit, tooMany } from "@/lib/server/rate-limit";

const Body = z.object({
  entry: z.string().min(10).max(8000),
  /** the client must send explicit consent; the server refuses without it */
  consent: z.literal(true),
});

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, "reflect"), 10, 60_000);
  if (!limit.ok) return tooMany(limit);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Reflection needs your consent and a few sentences of writing." }, { status: 400 });

  if (hasAnthropic()) {
    try {
      const { reflectWithClaude } = await import("@/lib/server/anthropic");
      return Response.json({ questions: await reflectWithClaude(parsed.data.entry), provider: "anthropic" });
    } catch (err) {
      console.error("[reflect] failed", err);
      return Response.json({ error: "Reflection isn't available right now." }, { status: 502 });
    }
  }
  return Response.json({ questions: templateReflection(parsed.data.entry), provider: "demo" });
}
