type Testimonial = {
  q: string;
  n: string;
  r: string;
  c: string;
  i: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    q: "HERON cut our average time-to-shortlist from 6 days to under 4 hours. The AI's explanations made it easy to defend every decision to hiring managers.",
    n: "Pacifique Niyongabire",
    r: "Head of Talent, Kigali Tech",
    c: "#34d399",
    i: "PN",
  },
  {
    q: "What I love most is that I can just type 'screen for senior Python with K8s' and the agent runs the whole pipeline — calendar invites included.",
    n: "Amara Okafor",
    r: "Recruiting Lead, Andela",
    c: "#a78bfa",
    i: "AO",
  },
  {
    q: "The scoring rubric is finally transparent. Candidates aren't a black box; we see the strengths, gaps, and risk for every single one.",
    n: "Diego Restrepo",
    r: "VP People, TechBridge",
    c: "#f472b6",
    i: "DR",
  },
  {
    q: "Set up in an afternoon. Two weeks later we'd processed more candidates than the previous quarter combined.",
    n: "Léa Moreau",
    r: "COO, Recruit Pro",
    c: "#fbbf24",
    i: "LM",
  },
];

export function TestimonialsSection() {
  return (
    <section className="section-pad" id="customers">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
          <div className="eyebrow" style={{ color: "#fbbf24" }}>
            CUSTOMERS
          </div>
          <h2 className="display" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 14 }}>
            Loved by teams that <span className="gradient-text-warm">hire at scale.</span>
          </h2>
        </div>
        <div className="hl-testi-grid">
          {TESTIMONIALS.map((x) => (
            <div
              key={x.n}
              style={{
                padding: "30px 32px",
                borderRadius: 20,
                background: "rgba(255,255,255,.025)",
                border: "1px solid var(--hl-line)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  fontFamily: "var(--hl-display)",
                  fontSize: 140,
                  fontWeight: 700,
                  color: `color-mix(in oklab, ${x.c} 15%, transparent)`,
                  lineHeight: 1,
                }}
              >
                &ldquo;
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.55, margin: 0, position: "relative", zIndex: 1 }}>
                &ldquo;{x.q}&rdquo;
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 22,
                  paddingTop: 22,
                  borderTop: "1px dashed var(--hl-line)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${x.c}, color-mix(in oklab, ${x.c} 50%, #6366f1))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0a0a14",
                  }}
                >
                  {x.i}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{x.n}</div>
                  <div style={{ fontSize: 12, color: "var(--hl-ink-3)" }}>{x.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
