import { ArrowRight, Check } from "lucide-react";

type Tier = {
  name: string;
  price: string;
  sub: string;
  desc: string;
  cta: string;
  highlight: boolean;
  color: string;
  features: [string, boolean][];
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    sub: "Free forever",
    desc: "Perfect for small teams getting started with AI-powered recruiting.",
    cta: "Get Started Free",
    highlight: false,
    color: "#6366f1",
    features: [
      ["Up to 3 active job postings", true],
      ["50 CV uploads / month", true],
      ["Basic AI scoring", true],
      ["Email support", true],
      ["Advanced analytics", false],
      ["Custom scoring models", false],
      ["API access", false],
    ],
  },
  {
    name: "Professional",
    price: "$79",
    sub: "per month, billed annually",
    desc: "For growing teams that need more power, more insights, and faster hiring.",
    cta: "Request Early Access",
    highlight: true,
    color: "#d946ef",
    features: [
      ["Unlimited active job postings", true],
      ["500 CV uploads / month", true],
      ["Advanced AI scoring + insights", true],
      ["Full analytics dashboard", true],
      ["Automated candidate outreach", true],
      ["Priority support", true],
      ["API access", false],
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "tailored to your scale",
    desc: "For large organisations with high-volume hiring and compliance requirements.",
    cta: "Contact Sales",
    highlight: false,
    color: "#22d3ee",
    features: [
      ["Unlimited everything", true],
      ["Custom AI scoring models", true],
      ["Full API access & webhooks", true],
      ["SSO / SAML integration", true],
      ["Dedicated account manager", true],
      ["Custom data retention policy", true],
    ],
  },
];

export function PricingSection() {
  return (
    <section className="section-pad" id="pricing">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ color: "#34d399" }}>
            PRICING
          </div>
          <h2 className="display" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 14 }}>
            Simple, <span className="gradient-text-warm">transparent</span> pricing.
          </h2>
          <p
            style={{
              color: "var(--hl-ink-2)",
              fontSize: 17,
              marginTop: 18,
              lineHeight: 1.55,
            }}
          >
            Start free, scale when you&apos;re ready. No hidden fees, no surprises.
          </p>
        </div>

        <div className="hl-pricing-grid">
          {TIERS.map((t) => {
            const hl = t.highlight;
            return (
              <div
                key={t.name}
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
                  {t.features.map(([f, on]) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                        color: on ? "var(--hl-ink-2)" : "var(--hl-ink-4)",
                      }}
                    >
                      {on ? (
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
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={hl ? "btn btn-primary" : "btn btn-ghost"}
                  style={{ width: "100%", justifyContent: "center", marginTop: 28 }}
                >
                  {t.cta} {hl && <ArrowRight size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
