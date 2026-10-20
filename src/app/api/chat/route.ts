import { z } from "zod";
import { demoReplyFromResults, planDemoTurn } from "@/lib/companion/demo-engine";
import { executeTool } from "@/lib/companion/executor";
import { assessSafety, crisisReply } from "@/lib/companion/safety";
import { writeTemplateStory } from "@/lib/companion/story-template";
import { CompanionContextSchema, type ClientAction } from "@/lib/companion/tools";
import { hasAnthropic } from "@/lib/server/config";
import { clientKey, rateLimit, tooMany } from "@/lib/server/rate-limit";
import type { ToolEvent } from "@/lib/types";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
        offers: z.array(z.string().max(20)).max(4).optional(),
      }),
    )
    .min(1)
    .max(40),
  context: CompanionContextSchema,
});

export interface ChatResponse {
  reply: string;
  toolEvents: ToolEvent[];
  actions: ClientAction[];
  offers?: string[];
  provider: "anthropic" | "demo" | "safety";
  support?: boolean;
}

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, "chat"), 20, 60_000);
  if (!limit.ok) return tooMany(limit);

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { messages, context } = parsed.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return Response.json({ error: "Last message must be from the user" }, { status: 400 });

  // Safety screening runs first, independent of any AI provider.
  const safety = assessSafety(last.content);
  if (safety === "crisis") {
    const body: ChatResponse = { reply: crisisReply(context.companionName), toolEvents: [], actions: [{ type: "showSupport" }], provider: "safety", support: true };
    return Response.json(body);
  }

  if (hasAnthropic()) {
    try {
      const { runCompanionTurn } = await import("@/lib/server/anthropic");
      const result = await runCompanionTurn(
        messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        context,
        safety,
      );
      const body: ChatResponse = { ...result, provider: "anthropic", support: safety === "distress" };
      return Response.json(body);
    } catch (err) {
      console.error("[chat] anthropic error", err);
      return Response.json({ error: "The companion couldn't reach the AI service just now. Please try again in a moment." }, { status: 502 });
    }
  }

  // Demo mode: rule-based planning, real tool execution.
  const plan = planDemoTurn(messages, context);
  const results = [];
  const actions: ClientAction[] = [];
  const toolEvents: ToolEvent[] = [];
  for (const call of plan.calls) {
    const exec = await executeTool(call.name, call.input, context, {
      generateStory: async (r) => ({ ...writeTemplateStory(r), id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
    });
    results.push({ name: call.name, ...exec });
    actions.push(...exec.actions);
    toolEvents.push({ name: call.name, summary: exec.summary, ok: exec.ok });
  }
  const body: ChatResponse = {
    reply: demoReplyFromResults(plan, results),
    toolEvents,
    actions,
    offers: plan.offers,
    provider: "demo",
    support: safety === "distress",
  };
  return Response.json(body);
}
