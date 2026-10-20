import { z } from "zod";
import { hasElevenLabs } from "@/lib/server/config";
import { clientKey, rateLimit, tooMany } from "@/lib/server/rate-limit";

const Body = z.object({
  text: z.string().min(1).max(1200),
  voice: z.enum(["warm", "bright", "deep"]).default("warm"),
});

// Voice ids are configurable; defaults fall back to ELEVENLABS_VOICE_ID.
function voiceId(style: "warm" | "bright" | "deep") {
  const fallback = process.env.ELEVENLABS_VOICE_ID;
  const map = {
    warm: process.env.ELEVENLABS_VOICE_WARM || fallback,
    bright: process.env.ELEVENLABS_VOICE_BRIGHT || fallback,
    deep: process.env.ELEVENLABS_VOICE_DEEP || fallback,
  };
  return map[style];
}

export async function POST(req: Request) {
  if (!hasElevenLabs()) {
    return Response.json({ error: "No speech provider is configured." }, { status: 501 });
  }
  const limit = rateLimit(clientKey(req, "tts"), 60, 60_000);
  if (!limit.ok) return tooMany(limit);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const id = voiceId(parsed.data.voice);
  if (!id) return Response.json({ error: "ELEVENLABS_VOICE_ID is not set." }, { status: 501 });

  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: parsed.data.text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.2 },
    }),
  });
  if (!upstream.ok || !upstream.body) {
    console.error("[tts] upstream error", upstream.status);
    return Response.json({ error: "Speech generation failed." }, { status: 502 });
  }
  return new Response(upstream.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
