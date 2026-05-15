"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLeadModal } from "./LeadModalContext";

export function CtaSection() {
  const { open: openLeadModal } = useLeadModal();
  return (
    <section className="section-pad" id="trial">
      <div className="container">
        <div
          style={{
            position: "relative",
            borderRadius: 32,
            overflow: "hidden",
            padding: "88px 60px",
            textAlign: "center",
            background:
              "radial-gradient(800px 400px at 20% 0%, rgba(99,102,241,.4), transparent 60%), radial-gradient(800px 400px at 80% 100%, rgba(217,70,239,.35), transparent 60%), linear-gradient(135deg, #1a0f3a 0%, #0a0a14 100%)",
            border: "1px solid rgba(255,255,255,.12)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000, transparent)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div className="pill" style={{ margin: "0 auto 22px" }}>
              <span className="dot" />
              <span>Ready to transform your hiring</span>
            </div>
            <h2
              className="display"
              style={{
                fontSize: "clamp(44px,6vw,80px)",
                margin: 0,
                maxWidth: 880,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Stop screening resumes.
              <br />
              <span className="gradient-text">Start hiring great people.</span>
            </h2>
            <p
              style={{
                fontSize: 18,
                color: "var(--hl-ink-2)",
                marginTop: 24,
                maxWidth: 560,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.55,
              }}
            >
              Join thousands of recruiters using HERON to screen smarter, rank faster, and build
              better teams.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                marginTop: 36,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-light"
                onClick={() => openLeadModal("professional")}
              >
                Request Early Access <ArrowRight size={14} />
              </button>
              <Link className="btn btn-ghost" href="/login">
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
