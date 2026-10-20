"use client";

import { useEffect, useState } from "react";
import { getAudioEngine, type MixerState } from "@/lib/audio/engine";

export function useMixer(): MixerState {
  const [state, setState] = useState<MixerState>({ available: true, playing: {}, masterVolume: 0.8, timerEndsAt: null, unavailable: [] });
  useEffect(() => getAudioEngine().subscribe(setState), []);
  return state;
}
