import { Brain, CloudRain, Hand, Heart, Leaf, PersonStanding, Sparkles, Wind } from "lucide-react";
import { ACTIVITY_ITEMS, CATALOG, contentMinutes } from "@/lib/content/catalog";
import type { ArtworkSpec, Need } from "@/lib/types";

// Everything you can *do*: the breathing studio, the hands-on activities and the focus timer.
export interface Tile {
  key: string;
  href: string;
  title: string;
  blurb: string;
  minutes: number;
  needs: Need[];
  artwork: ArtworkSpec;
  icon: typeof Wind;
  contentIds: string[];
}

const ICONS: Record<string, typeof Wind> = {
  grounding: Hand,
  "muscle-release": Leaf,
  "worry-clouds": CloudRain,
  "gratitude-jar": Heart,
  "gentle-stretch": PersonStanding,
  "calm-bubbles": Sparkles,
};

const breathing = CATALOG.filter((c) => c.kind === "breathing");

export const ACTIVITY_TILES: Tile[] = [
  {
    key: "breathe",
    href: "/breathe",
    title: "Breathing Studio",
    blurb: "Follow the glowing orb: gentle, box or 4-7-8",
    minutes: 3,
    needs: ["stress", "sleep", "relax", "focus"],
    artwork: { scene: "clouds", palette: ["#23306e", "#6f8fd6", "#cfe1ff"], sun: true },
    icon: Wind,
    contentIds: breathing.map((b) => b.id),
  },
  ...ACTIVITY_ITEMS.map((a) => ({
    key: a.activityId!,
    href: `/activities/${a.activityId}`,
    title: a.title,
    blurb: a.subtitle,
    minutes: contentMinutes(a),
    needs: a.needs,
    artwork: a.artwork,
    icon: ICONS[a.activityId!],
    contentIds: [a.id],
  })),
  {
    key: "focus",
    href: "/focus",
    title: "Focus Timer",
    blurb: "One clear block of attention with soft sound",
    minutes: 25,
    needs: ["focus"],
    artwork: { scene: "mountains", palette: ["#162a5c", "#4b79b8", "#b9e0f2"], sun: true },
    icon: Brain,
    contentIds: ["focus-25", "focus-50"],
  },
];

