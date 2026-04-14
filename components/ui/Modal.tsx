"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export const Modal = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => {
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-slate-950/70"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-xl rounded-2xl border border-brand-100 bg-white p-6 shadow-brand outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-slate-600 dark:bg-slate-800 dark:shadow-2xl"
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
