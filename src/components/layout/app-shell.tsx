"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store/app-store";
import { FullPlayer, MiniPlayer } from "@/components/player/player-ui";
import { PlayerProvider } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";
import { BottomNav, HIDE_CHROME } from "./bottom-nav";
import { FloatingCompanion } from "./floating-companion";
import { OnboardingGate } from "./onboarding-gate";
import { SupabaseSync } from "./supabase-sync";
import { SupportSheet } from "./support-sheet";
import { Toast } from "./toast";

function StoreHydrator() {
  useEffect(() => {
    void useApp.persist.rehydrate();
  }, []);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = HIDE_CHROME.some((p) => pathname.startsWith(p));
  return (
    <PlayerProvider>
      <StoreHydrator />
      <OnboardingGate />
      <SupabaseSync />
      <main className={cn("relative min-h-dvh", !chromeless && "pb-36 sm:pb-12 sm:pl-28")}>{children}</main>
      <BottomNav />
      <FloatingCompanion />
      <MiniPlayer />
      <FullPlayer />
      <SupportSheet />
      <Toast />
    </PlayerProvider>
  );
}

/** Centered content column used by most pages. */
export function Page({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", wide ? "max-w-5xl" : "max-w-2xl", className)}>{children}</div>;
}
