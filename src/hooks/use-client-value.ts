"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Read a browser-only value without a hydration mismatch (server renders the fallback). */
export function useClientValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noop, read, () => fallback);
}
