const LOGOS = [
  "ANDELA",
  "TECHBRIDGE",
  "RECRUIT·PRO",
  "TALENT HUB",
  "KIGALI TECH",
  "HR CONNECT",
  "LATTICE",
  "PALOMA",
];

export function TrustBar() {
  return (
    <section className="section-pad-sm" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <div className="container">
        <div className="eyebrow" style={{ textAlign: "center", marginBottom: 24 }}>
          Trusted by hiring teams across Africa &amp; beyond
        </div>
        <div className="hl-trust-row">
          {LOGOS.map((l) => (
            <div
              key={l}
              style={{
                textAlign: "center",
                fontFamily: "var(--hl-display)",
                fontWeight: 700,
                letterSpacing: ".04em",
                fontSize: 15,
                color: "var(--hl-ink-4)",
                opacity: 0.9,
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
