"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store/app-store";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { pullAll, pushAll } from "@/lib/supabase/sync";

/** Keeps the local store and the user's Supabase rows in step while signed in. */
export function SupabaseSync() {
  const { user } = useAuth();
  const ready = useRef(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !user) {
      ready.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const remote = await pullAll(sb, user.id);
        if (cancelled) return;
        if (remote?.onboarded) useApp.getState().importRemote(remote);
        else await pushAll(sb, user.id, useApp.getState());
        ready.current = true;
      } catch (err) {
        console.error("[sync] initial sync failed", err);
      }
    })();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useApp.subscribe((s, prev) => {
      if (!ready.current || s.revision === prev.revision) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        pushAll(sb, user.id, useApp.getState()).catch((err) => console.error("[sync] push failed", err));
      }, 1500);
    });
    return () => {
      cancelled = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  return null;
}
