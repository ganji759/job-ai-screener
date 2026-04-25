"use client";

import { useEffect } from "react";

export const usePolling = (callback: () => void, enabled: boolean, intervalMs = 3000): void => {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(callback, intervalMs);
    return () => window.clearInterval(id);
  }, [callback, enabled, intervalMs]);
};
