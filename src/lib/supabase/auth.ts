"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabase } from "./client";

export function useAuth() {
  const sb = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(sb));

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  return { configured: Boolean(sb), user, loading };
}
