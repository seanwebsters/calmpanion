"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useUI } from "@/lib/store/ui-store";

export function Toast() {
  const toast = useUI((s) => s.toast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="glass-strong flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold" role="status">
            <Sparkles className="h-4 w-4 text-lilac-200" /> {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
