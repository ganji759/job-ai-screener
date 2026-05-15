"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LeadCaptureModal, type LeadTier } from "./LeadCaptureModal";

type LeadModalContextValue = {
  open: (tier?: LeadTier) => void;
  close: () => void;
};

const LeadModalContext = createContext<LeadModalContextValue | null>(null);

export function LeadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tier, setTier] = useState<LeadTier>("professional");

  const open = useCallback((next?: LeadTier) => {
    if (next) setTier(next);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<LeadModalContextValue>(() => ({ open, close }), [open, close]);

  return (
    <LeadModalContext.Provider value={value}>
      {children}
      <LeadCaptureModal open={isOpen} tier={tier} onClose={close} />
    </LeadModalContext.Provider>
  );
}

export function useLeadModal(): LeadModalContextValue {
  const ctx = useContext(LeadModalContext);
  if (!ctx) {
    // Silent no-op fallback for components that may render outside the provider.
    return { open: () => {}, close: () => {} };
  }
  return ctx;
}
