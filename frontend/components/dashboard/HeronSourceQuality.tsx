"use client";

type Source = {
  name: string;
  share: number;
  score?: number;
  color: string;
};

export function HeronSourceQuality({ sources }: { sources: Source[] }) {
  const total = sources.reduce((acc, s) => acc + s.share, 0) || 1;
  return (
    <div className="panel panel-lg">
      <div className="eyebrow mb-1">Source quality</div>
      <div className="mb-4 text-base font-semibold" style={{ color: "#fff" }}>
        Where great candidates come from
      </div>

      <div
        className="mb-[18px] flex overflow-hidden"
        style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.04)" }}
      >
        {sources.length === 0 ? (
          <div className="w-full" style={{ background: "rgba(255,255,255,.05)" }} />
        ) : (
          sources.map((s) => (
            <div
              key={s.name}
              style={{
                flex: s.share / total,
                background: s.color,
                opacity: 0.9,
                transition: "flex .6s ease",
              }}
            />
          ))
        )}
      </div>

      {sources.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--ink-3)" }}>
          Upload applicants to see your source mix.
        </p>
      ) : (
        sources.map((s) => (
          <div
            key={s.name}
            className="grid items-center gap-3 py-2"
            style={{
              gridTemplateColumns: "auto 1fr auto auto",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            <span className="text-[13px]" style={{ color: "#fff" }}>
              {s.name}
            </span>
            <span className="mono text-[11px]" style={{ color: "var(--ink-3)" }}>
              {Math.round((s.share / total) * 100)}%
            </span>
            <span
              className="mono text-[13px]"
              style={{ color: "#fff", minWidth: 30, textAlign: "right" }}
            >
              {s.score != null ? s.score : "—"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
