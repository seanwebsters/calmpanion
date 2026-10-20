import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { executeTool, type GeneratedStoryPayload } from "@/lib/companion/executor";
import { contextPrompt, stableSystemPrompt } from "@/lib/companion/prompt";
import { DISTRESS_GUIDANCE, type SafetyLevel } from "@/lib/companion/safety";
import { ambienceFor, artworkForSetting } from "@/lib/companion/story-template";
import { anthropicToolDefinitions, type ClientAction, type CompanionContext } from "@/lib/companion/tools";
import type { StoryRequest, ToolEvent } from "@/lib/types";
import { MODEL } from "./config";

type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BetaToolResultBlockParam = Anthropic.Beta.Messages.BetaToolResultBlockParam;

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// Server-side refusal fallback: if a safety classifier declines, the API re-runs the
// request on a fallback model within the same call.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

const SYSTEM_STABLE = stableSystemPrompt();
const TOOLS = anthropicToolDefinitions();

export interface CompanionTurnResult {
  reply: string;
  toolEvents: ToolEvent[];
  actions: ClientAction[];
}

export async function runCompanionTurn(
  history: { role: "user" | "assistant"; content: string }[],
  ctx: CompanionContext,
  safety: SafetyLevel,
): Promise<CompanionTurnResult> {
  // The API requires the conversation to start with a user turn.
  const firstUser = history.findIndex((m) => m.role === "user");
  const messages: BetaMessageParam[] = history.slice(firstUser).map((m) => ({ role: m.role, content: m.content }));

  const system: Anthropic.Beta.Messages.BetaTextBlockParam[] = [
    { type: "text", text: SYSTEM_STABLE, cache_control: { type: "ephemeral" } },
    { type: "text", text: `CURRENT CONTEXT\n${contextPrompt(ctx)}${safety === "distress" ? `\n\nNOTE: ${DISTRESS_GUIDANCE}` : ""}` },
  ];

  const toolEvents: ToolEvent[] = [];
  const actions: ClientAction[] = [];
  let reply = "";

  for (let i = 0; i < 5; i++) {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      output_config: { effort: "low" },
      messages,
      ...FALLBACK,
    });

    if (response.stop_reason === "refusal") {
      reply = "I'm not able to help with that one, but I'm happy to find you something calming instead.";
      break;
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text) reply = text;

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    const results: BetaToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        const exec = await executeTool(tu.name, tu.input, ctx, { generateStory: generateStoryWithClaude });
        toolEvents.push({ name: tu.name, summary: exec.summary, ok: exec.ok });
        actions.push(...exec.actions);
        return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(exec.result), is_error: !exec.ok };
      }),
    );
    messages.push({ role: "user", content: results });
  }

  return { reply: reply || "I'm here.", toolEvents, actions };
}

// ---------------- personalised stories ----------------

const StoryOutput = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(240),
  segments: z.array(z.object({ text: z.string().min(10).max(700), pauseSec: z.number().min(2).max(15) })).min(4).max(40),
});

export async function generateStoryWithClaude(req: StoryRequest): Promise<GeneratedStoryPayload> {
  const targetWords = Math.round(req.minutes * 100);
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: storyJsonSchema() },
    },
    system:
      "You write original, soothing sleep stories for a wellbeing app. Second-person or gentle third-person, present tense, slow pacing, sensory detail, no conflict, no peril, no cliffhangers, nothing frightening. Never imitate a specific existing book, brand or author. End by inviting rest.",
    messages: [
      {
        role: "user",
        content: `Write a sleep story.\nSetting: ${req.setting}\nAtmosphere: ${req.atmosphere}\nThemes: ${req.themes.join(", ") || "rest"}\n${req.characterName ? `Main character's name: ${req.characterName}\n` : ""}Length: about ${targetWords} words, split into segments of 40-80 words. Give each segment a pauseSec (4-12) for silence afterwards, growing longer towards the end. Open with a short settling-in invitation.`,
      },
    ],
    ...FALLBACK,
  });
  if (response.stop_reason === "refusal") throw new Error("The story request was declined.");
  const text = response.content.find((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")?.text ?? "";
  const parsed = StoryOutput.parse(JSON.parse(text));
  const story: GeneratedStoryPayload = {
    id: crypto.randomUUID(),
    kind: "story",
    title: parsed.title,
    subtitle: `A personalised story · ${req.themes.join(", ") || "rest"}`,
    description: parsed.description,
    narrator: "Nimbus",
    categoryIds: ["sleep-stories", "your-stories"],
    tags: ["personalised", ...req.themes.map((t) => t.toLowerCase())],
    needs: ["sleep", "relax"],
    artwork: artworkForSetting(req.setting, req.atmosphere),
    script: parsed.segments,
    ambiencePresetId: ambienceFor(req.setting, req.atmosphere),
    source: "generated",
    createdAt: new Date().toISOString(),
    request: req,
    generatedBy: "anthropic",
  };
  return story;
}

function storyJsonSchema() {
  const schema = z.toJSONSchema(
    z.object({
      title: z.string(),
      description: z.string(),
      segments: z.array(z.object({ text: z.string(), pauseSec: z.number() })),
    }),
  ) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

// ---------------- journal reflection ----------------

const ReflectionOutput = z.object({ questions: z.array(z.string().min(5).max(200)).min(1).max(3) });

export async function reflectWithClaude(entry: string): Promise<string[]> {
  const schema = z.toJSONSchema(z.object({ questions: z.array(z.string()) })) as Record<string, unknown>;
  delete schema.$schema;
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system:
      "You help someone reflect on a private journal entry by offering 2-3 short, open, gentle questions. Do not interpret, diagnose, label emotions as disorders, give advice or summarise. If the entry mentions self-harm or danger, make the first question a caring nudge to reach out to someone they trust or a crisis line.",
    messages: [{ role: "user", content: `Journal entry:\n"""\n${entry.slice(0, 6000)}\n"""` }],
    ...FALLBACK,
  });
  if (response.stop_reason === "refusal") throw new Error("Reflection unavailable for this entry.");
  const text = response.content.find((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")?.text ?? "";
  return ReflectionOutput.parse(JSON.parse(text)).questions;
}
