"use client";

import { create } from "zustand";

interface UIState {
  supportOpen: boolean;
  setSupportOpen: (v: boolean) => void;
  toast: { id: number; text: string } | null;
  showToast: (text: string) => void;
}

export const useUI = create<UIState>()((set) => ({
  supportOpen: false,
  setSupportOpen: (v) => set({ supportOpen: v }),
  toast: null,
  showToast: (text) => {
    const id = Date.now();
    set({ toast: { id, text } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 3500);
  },
}));
