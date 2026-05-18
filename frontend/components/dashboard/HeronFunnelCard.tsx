"use client";

type Stage = { label: string; value: number; color: string };

export function HeronFunnelCard({
  stages,
  conversionRate,
  avgTimeToOfferDays,
  dropOffRate,
}: {
  stages: Stage[];
  conversionRate?: number;
  avgTimeToOfferDays?: number;
  dropOffRate?: number;
}) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="panel panel-lg">
      <div className="mb-[18px] flex items-center justify-between">
        <div>
          <div className="eyebrow">Pipeline funnel</div>
          <div className="mt-1 text-base font-semibold" style={{ color: "#fff" }}>
            Last 30 days
          </div>
        </div>
        <span className="pill">This month</span>
      </div>

      <div className="flex flex-col gap-[10px]">
        {stages.map((s, i) => {
          const next = stages[(i + 1) % stages.length];
          return (
            <div key={s.label}>
              <div className="mb-[6px] flex justify-between text-[12.5px]">
                <span style={{ color: "var(--ink-2)" }}>{s.label}</span>
                <span className="mono" style={{ color: "#fff" }}>{s.value}</span>
              </div>
              <div
                className="overflow-hidden"
                style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.04)" }}
              >
                <div
                  style={{
                    width: `${Math.max(2, (s.value / max) * 100)}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${s.color}, ${next.color})`,
                    borderRadius: 999,
                    boxShadow: `0 0 14px ${s.color}55`,
                    transition: "width .6s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-[18px] flex justify-between pt-4"
        style={{ borderTop: "1px dashed var(--line)" }}
      >
        <div>
          <div className="eyebrow mb-1">Conversion</div>
          <div className="mono text-[18px]" style={{ color: "#fff" }}>
            {conversionRate != null ? `${conversionRate.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1">Avg time-to-offer</div>
          <div className="mono text-[18px]" style={{ color: "#fff" }}>
            {avgTimeToOfferDays != null ? `${avgTimeToOfferDays.toFixed(1)}d` : "—"}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1">Drop-off</div>
          <div className="mono text-[18px]" style={{ color: "#fff" }}>
            {dropOffRate != null ? `${Math.round(dropOffRate)}%` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
