"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mascot } from "@/components/companion/mascot";
import { usePlayer } from "@/components/player/player-provider";
import { useApp } from "@/lib/store/app-store";

/** The companion stays one tap away everywhere except where it's already the focus. */
export function FloatingCompanion() {
  const pathname = usePathname();
  const name = useApp((s) => s.preferences.companionName);
  const player = usePlayer();
  // Steps aside on immersive, hands-on screens so it never covers their controls.
  const hidden = pathname === "/" || ["/companion", "/onboarding", "/activities/", "/breathe", "/focus"].some((p) => pathname.startsWith(p));
  if (hidden) return null;
  const lifted = player.item && !player.expanded;
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={lifted ? "fixed bottom-[168px] right-4 z-40 sm:bottom-28 sm:right-8" : "fixed bottom-[100px] right-4 z-40 sm:bottom-8 sm:right-8"}>
      <Link
        href="/companion"
        aria-label={`Talk to ${name}`}
        className="glass flex h-16 w-16 items-center justify-center rounded-full shadow-glow transition hover:scale-105 active:scale-95"
      >
        <Mascot size={56} still />
      </Link>
    </motion.div>
  );
}
