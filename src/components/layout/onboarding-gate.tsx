"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useApp } from "@/lib/store/app-store";

const OPEN_ROUTES = ["/onboarding", "/auth", "/support", "/profile/privacy"];

export function OnboardingGate() {
  const hydrated = useHydrated();
  const onboarded = useApp((s) => s.onboarded);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (hydrated && !onboarded && !OPEN_ROUTES.some((r) => pathname.startsWith(r))) router.replace("/onboarding");
  }, [hydrated, onboarded, pathname, router]);
  return null;
}
