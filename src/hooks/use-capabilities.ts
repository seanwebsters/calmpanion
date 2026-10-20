"use client";

import { useEffect, useState } from "react";

export interface Capabilities {
  ai: "anthropic" | "demo";
  tts: "elevenlabs" | null;
  supabase: boolean;
}

let cached: Capabilities | null = null;
let pending: Promise<Capabilities> | null = null;

export function loadCapabilities(): Promise<Capabilities> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetch("/api/capabilities")
    .then((r) => r.json() as Promise<Capabilities>)
    .catch(() => ({ ai: "demo", tts: null, supabase: false }) as Capabilities)
    .then((c) => (cached = c));
  return pending;
}

export function useCapabilities() {
  const [caps, setCaps] = useState<Capabilities | null>(cached);
  useEffect(() => {
    if (!caps) loadCapabilities().then(setCaps);
  }, [caps]);
  return caps;
}
