"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useLeadModal } from "./LeadModalContext";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#howitworks" },
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Customers", href: "#customers" },
];

function HeronLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="heron-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#heron-logo-grad)" />
      <path
        d="M9 23 C 13 23, 14 19, 14 15 C 14 11, 16 9, 20 9 L 24 9 L 22 12 L 20 12 C 18 12, 17 13, 17 16 C 17 21, 14 24, 10 24 Z"
        fill="#fff"
        opacity=".95"
      />
      <circle cx="22.2" cy="10.5" r="1" fill="#0a0a14" />
    </svg>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: openLeadModal } = useLeadModal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "background .25s ease, border-color .25s ease, backdrop-filter .25s ease",
        background: scrolled ? "rgba(7,7,15,.7)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--hl-line)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
      }}
    >
      <div
        className="container"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}
      >
        <Link
          href="#top"
          aria-label="HERON home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--hl-display)",
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          <HeronLogo size={28} />
          <span>HERON</span>
        </Link>

        {/* desktop links */}
        <div
          className="nav-links-desktop"
          style={{ display: "flex", gap: 6, alignItems: "center" }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 14,
                color: "var(--hl-ink-2)",
                fontWeight: 500,
                transition: "color .15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--hl-ink-2)")}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* desktop CTAs */}
        <div className="nav-cta-desktop" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/login" className="btn btn-ghost" style={{ height: 40, padding: "0 16px", fontSize: 14 }}>
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => openLeadModal("professional")}
            className="btn btn-primary"
            style={{ height: 40, padding: "0 18px", fontSize: 14 }}
          >
            Request Early Access <ArrowRight size={14} strokeWidth={2} />
          </button>
        </div>

        {/* mobile hamburger */}
        <button
          className="nav-mobile-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          style={{
            display: "none",
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: "rgba(255,255,255,.06)",
            border: "1px solid var(--hl-line)",
            color: "#fff",
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          style={{
            background: "rgba(7,7,15,.95)",
            backdropFilter: "blur(14px)",
            borderTop: "1px solid var(--hl-line)",
            borderBottom: "1px solid var(--hl-line)",
            padding: "16px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              style={{ padding: "10px 0", fontSize: 15, color: "var(--hl-ink-2)" }}
            >
              {l.label}
            </a>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", height: 42, fontSize: 13 }}
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openLeadModal("professional");
              }}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: "center", height: 42, fontSize: 13 }}
            >
              Join Waitlist
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 880px) {
          :global(.nav-links-desktop),
          :global(.nav-cta-desktop) {
            display: none !important;
          }
          :global(.nav-mobile-toggle) {
            display: inline-flex !important;
          }
        }
      `}</style>
    </nav>
  );
}
