import type { Mood, TimeOfDay } from "./types";

export const MOODS: { id: Mood; label: string }[] = [
  { id: "stormy", label: "Stormy" },
  { id: "rainy", label: "Rainy" },
  { id: "cloudy", label: "Cloudy" },
  { id: "bright", label: "Brightening" },
  { id: "sunny", label: "Sunny" },
];

/** Tailored, non-diagnostic suggestions after a check-in. */
export function suggestionsFor(mood: Mood, energy: number, tod: TimeOfDay): { message: string; contentIds: string[] } {
  const late = tod === "evening" || tod === "night";
  if (mood === "stormy" || mood === "rainy") {
    return {
      message: "Thanks for being honest about how it is. Something small and steadying might help, and talking to someone you trust can too.",
      contentIds: late ? ["breathe-478", "kind-pause", "cabin-in-the-rain"] : ["kind-pause", "breathe-box", "unclench"],
    };
  }
  if (energy <= 2) {
    return {
      message: late ? "Sounds like a tired one. Let's make winding down easy." : "Low on energy? A gentle reset might help more than pushing through.",
      contentIds: late ? ["body-scan-drift", "dusk-wind-down", "sound-rainy-window"] : ["sixty-second-reset", "breathe-gentle", "sound-morning-meadow"],
    };
  }
  if (mood === "sunny" || mood === "bright") {
    return {
      message: "Lovely. Want to savour it for a moment?",
      contentIds: late ? ["three-good-things", "moon-garden"] : ["three-good-things", "morning-light", "focus-25"],
    };
  }
  return {
    message: "A bit in-between is completely normal. Here are a few gentle options.",
    contentIds: late ? ["dusk-wind-down", "breathe-gentle", "the-night-train-to-alder"] : ["soft-landing", "breathe-gentle", "single-point"],
  };
}
