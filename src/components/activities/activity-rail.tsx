"use client";

import Link from "next/link";
import { Landscape } from "@/components/art/landscape";
import { ACTIVITY_TILES } from "./tiles";

/** Big, tappable activity cards for the home screen. */
export function ActivityRail() {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6">
      {ACTIVITY_TILES.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.key} href={t.href} className="group relative h-40 w-36 shrink-0 snap-start overflow-hidden rounded-[24px] transition-transform active:scale-95 sm:w-44">
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
              <Landscape spec={t.artwork} seed={t.key} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-night-950/85 via-night-950/20 to-transparent" />
            <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Icon className="h-5 w-5" />
            </span>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="font-display text-[17px] leading-tight">{t.title}</p>
              <p className="text-[11px] font-semibold text-white/70">{t.minutes} min</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
