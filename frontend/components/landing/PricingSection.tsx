"use client";

import { ArrowRight, Check } from "lucide-react";
import type { LeadTier } from "./LeadCaptureModal";
import { useLeadModal } from "./LeadModalContext";

type Feature = { label: string; included: boolean; note?: string };

type Tier = {
  id: LeadTier;
  name: string;
  price: string;
  sub: string;
  desc: string;
  cta: string;
  highlight: boolean;
  color: string;
  features: Feature[];
  foundingLine?: string;
  overageLine?: string;
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    sub: "Free",
    desc: "For solo recruiters and small startups evaluating the product.",
    cta: "Join Waitlist",
    highlight: false,
    color: "#6366f1",
    features: [
      { label: "1 recruiter seat", included: true },
      { label: "3 active job postings", included: true },
      { label: "20 candidate screenings / month", included: true },
      { label: "5 AI-generated interview question sets / month", included: true },
      { label: "Basic AI scoring", included: true },
      { label: "Community support", included: true },
      { label: "Agentic workflow automation", included: false },
      { label: "Interview scheduling", included: false },
      { label: "Bulk candidate outreach", included: false },
      { label: "API access", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$99",
    sub: "per recruiter / month",
    foundingLine: "Founding customers: $49 / recruiter / month for the first 12 months",
    desc: "For growing HR teams (2–10 recruiters) and scale-ups.",
    cta: "Request Early Access",
    highlight: true,
    color: "#d946ef",
    features: [
      { label: "Unlimited active job postings", included: true },
      { label: "250 candidate screenings / seat / month", included: true },
      { label: "50 AI-generated interview question sets / seat / month", included: true },
      { label: "Full agentic workflow (screening, scheduling, outreach, feedback)", included: true },
      { label: "Calendar integration", included: true },
      { label: "Multi-language support", included: true },
      { label: "Analytics dashboard", included: true },
      { label: "Priority support (24h SLA)", included: true },
    ],
    overageLine: "Need more? $0.40 per additional screening, $2 per additional interview set.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    sub: "Starting at $1,500 / month",
    desc: "For organisations with 10+ recruiters, compliance needs, or high hiring volume.",
    cta: "Contact Sales",
    highlight: false,
    color: "#22d3ee",
    features: [
      { label: "Unlimited recruiter seats (negotiated)", included: true },
      { label: "Custom usage caps (or unlimited)", included: true },
      { label: "Custom AI scoring rubrics", included: true },
      { label: "Full agentic workflow", included: true },
      { label: "API access and webhooks", included: true },
      { label: "SSO / SAML integration", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Custom data retention policies", included: true },
      { label: "Negotiated SLA", included: true },
    ],
  },
];

export function PricingSection() {
  const { open: openModal } = useLeadModal();

  return (
    <section className="section-pad" id="pricing">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 28px" }}>
          <div className="eyebrow" style={{ color: "#34d399" }}>
            PRICING
          </div>
          <h2 className="display" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 14 }}>
            Per-seat pricing. <span className="gradient-text-warm">Predictable usage caps.</span>
          </h2>
          <p
            style={{
              color: "var(--hl-ink-2)",
              fontSize: 17,
              marginTop: 18,
              lineHeight: 1.55,
            }}
          >
            One price per recruiter and clear overage when you need
            to push past them.
          </p>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "var(--hl-ink-3)",
            fontSize: 14,
            lineHeight: 1.55,
            margin: "0 auto 40px",
            maxWidth: 640,
          }}
        >
          Launching soon. Join early access to get founding customer pricing and priority
          onboarding.
        </p>

        <div className="hl-pricing-grid">
          {TIERS.map((t) => {
            const hl = t.highlight;
            return (
              <div
                key={t.id}
                style={{
                  position: "relative",
                  borderRadius: 22,
                  padding: "34px 28px",
                  background: hl
                    ? "linear-gradient(180deg, rgba(217,70,239,.10), rgba(99,102,241,.06))"
                    : "rgba(255,255,255,.02)",
                  border: hl ? `1px solid ${t.color}66` : "1px solid var(--hl-line)",
                  boxShadow: hl
                    ? `0 30px 80px -20px ${t.color}55`
                    : "0 1px 4px rgba(0,0,0,.2)",
                  transform: hl ? "translateY(-6px)" : "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {hl && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "5px 14px",
                      borderRadius: 999,
                      background: `linear-gradient(135deg, ${t.color}, #6366f1)`,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      boxShadow: `0 8px 20px -6px ${t.color}88`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="eyebrow" style={{ color: t.color, marginBottom: 14 }}>
                  {t.name}
                </div>
                <div className="display" style={{ fontSize: 54, lineHeight: 1, fontWeight: 700 }}>
                  {t.price}
                </div>
                <div style={{ fontSize: 13, color: "var(--hl-ink-3)", marginTop: 6 }}>{t.sub}</div>

                {t.foundingLine && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "rgba(52,211,153,.08)",
                      border: "1px solid rgba(52,211,153,.28)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: "#86efac",
                      fontWeight: 500,
                    }}
                  >
                    {t.foundingLine}
                  </div>
                )}

                <p
                  style={{
                    fontSize: 14,
                    color: "var(--hl-ink-2)",
                    lineHeight: 1.55,
                    marginTop: 18,
                    marginBottom: 24,
                  }}
                >
                  {t.desc}
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {t.features.map((f) => (
                    <li
                      key={f.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                        color: f.included ? "var(--hl-ink-2)" : "var(--hl-ink-4)",
                      }}
                    >
                      {f.included ? (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: `color-mix(in oklab, ${t.color} 20%, transparent)`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: t.color,
                            flexShrink: 0,
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--hl-ink-4)",
                            flexShrink: 0,
                          }}
                        >
                          —
                        </span>
                      )}
                      <span>
                        {f.label}
                        {f.note && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              fontFamily: "var(--hl-mono)",
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                              color: "var(--hl-ink-4)",
                            }}
                          >
                            ({f.note})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {t.overageLine && (
                  <p
                    style={{
                      marginTop: 16,
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: "var(--hl-ink-4)",
                      fontStyle: "italic",
                    }}
                  >
                    {t.overageLine}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => openModal(t.id)}
                  className={hl ? "btn btn-primary" : "btn btn-ghost"}
                  style={{ width: "100%", justifyContent: "center", marginTop: 28 }}
                >
                  {t.cta} {hl && <ArrowRight size={14} />}
                </button>
              </div>
            );
          })}
        </div>

        <p
          style={{
            textAlign: "center",
            color: "var(--hl-ink-3)",
            fontSize: 13,
            lineHeight: 1.55,
            margin: "40px auto 0",
            maxWidth: 720,
          }}
        >
          Built with privacy and compliance in mind.
        </p>

        <details
          style={{
            margin: "20px auto 0",
            maxWidth: 720,
            borderRadius: 14,
            border: "1px solid var(--hl-line)",
            background: "rgba(255,255,255,.02)",
            padding: "14px 18px",
            fontSize: 13.5,
            color: "var(--hl-ink-2)",
            lineHeight: 1.55,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              color: "var(--hl-ink-2)",
              fontWeight: 500,
              listStyle: "none",
            }}
          >
            How our usage caps work
          </summary>
          <p style={{ margin: "10px 0 0", color: "var(--hl-ink-3)" }}>
            Each plan includes a monthly allowance of AI-powered actions (candidate screenings,
            interview question generation). This keeps your bill predictable. If you need more,
            the Professional plan supports overage pricing or you can upgrade to Enterprise for
            custom limits.
          </p>
        </details>
      </div>
    </section>
  );
}
