"use client";

import { Compass, Home, Sparkles, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/explore", label: "Explore", icon: Compass, match: (p: string) => ["/explore", "/activities", "/sleep", "/meditate", "/breathe", "/sounds", "/focus"].some((x) => p.startsWith(x)) },
  { href: "/companion", label: "Companion", icon: Sparkles, match: (p: string) => p.startsWith("/companion") },
  { href: "/me", label: "My Calm", icon: Sun, match: (p: string) => ["/me", "/routines", "/check-in", "/journal"].some((x) => p.startsWith(x)) },
  { href: "/profile", label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/profile") || p.startsWith("/auth") || p.startsWith("/support") },
];

export const HIDE_CHROME = ["/onboarding", "/companion/voice"];

export function BottomNav() {
  const pathname = usePathname();
  if (HIDE_CHROME.some((p) => pathname.startsWith(p))) return null;
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-y-1/2">
      <div className="glass-strong mx-3 mb-3 flex justify-around rounded-[28px] px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)] sm:mx-0 sm:mb-0 sm:flex-col sm:gap-1 sm:px-2 sm:py-3">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px] font-bold transition-colors sm:px-3 sm:py-2.5",
                active ? "text-white" : "text-white/55 hover:text-white/85",
              )}
            >
              <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-all", active && "bg-white/15 shadow-glow")}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
