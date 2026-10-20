// Server-side capability detection. Keys never leave the server.

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hasElevenLabs() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function capabilities() {
  return {
    ai: hasAnthropic() ? ("anthropic" as const) : ("demo" as const),
    tts: hasElevenLabs() ? ("elevenlabs" as const) : null,
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
