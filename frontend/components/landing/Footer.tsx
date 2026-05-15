import { Heart } from "lucide-react";

const COLS: { h: string; l: string[] }[] = [
  {
    h: "Product",
    l: ["Features", "How It Works", "Pricing", "Integrations", "Changelog", "Status"],
  },
  { h: "Company", l: ["About", "Customers", "Blog", "Careers", "Press", "Contact"] },
  {
    h: "Resources",
    l: ["Documentation", "API Reference", "Help Center", "Guides", "Community", "Templates"],
  },
  { h: "Legal", l: ["Privacy", "Terms", "Security", "GDPR", "DPA", "Cookies"] },
];

function HeronFooterLogo() {
  return (
    <svg width={30} height={30} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hl-footer-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#hl-footer-grad)" />
      <path
        d="M9 23 C 13 23, 14 19, 14 15 C 14 11, 16 9, 20 9 L 24 9 L 22 12 L 20 12 C 18 12, 17 13, 17 16 C 17 21, 14 24, 10 24 Z"
        fill="#fff"
        opacity=".95"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer style={{ padding: "80px 0 40px", borderTop: "1px solid var(--hl-line)" }}>
      <div className="container">
        <div className="hl-footer-grid">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--hl-display)",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.02em",
              }}
            >
              <HeronFooterLogo /> HERON
            </div>
            <p
              style={{
                color: "var(--hl-ink-3)",
                fontSize: 14,
                lineHeight: 1.6,
                marginTop: 14,
                maxWidth: 280,
              }}
            >
              AI-powered talent intelligence for the next generation of recruiters.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {["X", "GH", "IN", "LI"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.04)",
                    border: "1px solid var(--hl-line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontFamily: "var(--hl-mono)",
                    color: "var(--hl-ink-3)",
                  }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
          {COLS.map((c) => (
            <div key={c.h}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                {c.h}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {c.l.map((li) => (
                  <li key={li}>
                    <a href="#" style={{ fontSize: 13.5, color: "var(--hl-ink-2)" }}>
                      {li}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="glow-line" style={{ margin: "48px 0 24px" }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12.5,
            color: "var(--hl-ink-4)",
          }}
        >
          <div>© 2026 HERON. All rights reserved.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Built with <Heart size={12} fill="currentColor" /> in Kigali for modern recruiters.
          </div>
        </div>
      </div>
    </footer>
  );
}
