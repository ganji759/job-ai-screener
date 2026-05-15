"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

export function WatchDemoBar() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (dismissed) return;
      const y = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight - 800;
      setShow(y > 800 && y < max);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className={`watch-bar ${show ? "show" : ""}`}>
      <div className="preview" />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Watch the AI agent work</div>
        <div style={{ fontSize: 11, color: "var(--hl-ink-3)", fontFamily: "var(--hl-mono)" }}>
          11 sec product tour
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ height: 36, padding: "0 16px", fontSize: 13 }}
      >
        <Play size={11} fill="currentColor" /> Play
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setShow(false);
          setDismissed(true);
        }}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
          border: "1px solid var(--hl-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--hl-ink-3)",
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
