"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export const Drawer = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-full w-full max-w-xl overflow-y-auto border-l-4 border-brand-600 bg-white p-6 shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 dark:border-brand-500 dark:bg-slate-800 dark:ring-offset-slate-900"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
