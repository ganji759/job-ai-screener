"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { resolveApiBaseUrl } from "../../lib/resolveApiBaseUrl";

export type LeadTier = "starter" | "professional" | "enterprise";
type TeamSize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
type RecruiterCount = "1" | "2-5" | "6-10" | "11-25" | "25+";
type HiringVolume = "Under 10" | "10-50" | "50-200" | "200+";

const TIER_LABEL: Record<LeadTier, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const TIER_HEADLINE: Record<LeadTier, string> = {
  starter: "Join the Starter waitlist.",
  professional: "Get founding-customer pricing.",
  enterprise: "Let's talk Enterprise.",
};

const TEAM_SIZES: TeamSize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const RECRUITER_COUNTS: RecruiterCount[] = ["1", "2-5", "6-10", "11-25", "25+"];
const HIRING_VOLUMES: HiringVolume[] = ["Under 10", "10-50", "50-200", "200+"];

const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

type Props = {
  open: boolean;
  tier: LeadTier;
  onClose: () => void;
};

export function LeadCaptureModal({ open, tier, onClose }: Props) {
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [teamSize, setTeamSize] = useState<TeamSize>("11-50");
  const [recruiterCount, setRecruiterCount] = useState<RecruiterCount>("2-5");
  const [hiringVolume, setHiringVolume] = useState<HiringVolume | "">("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tier is locked in for the lifetime of this modal opening (captured from the CTA clicked).
  const tierOfInterest = tier;

  // Reset state when reopened after a successful submit
  useEffect(() => {
    if (open && done) {
      setDone(false);
      setFullName("");
      setWorkEmail("");
      setCompany("");
      setRole("");
      setTeamSize("11-50");
      setRecruiterCount("2-5");
      setHiringVolume("");
      setMessage("");
      setError(null);
    }
    // intentionally only runs when `open` flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc to close + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const freemailWarning = useMemo(() => {
    const at = workEmail.lastIndexOf("@");
    if (at < 0) return null;
    const domain = workEmail.slice(at + 1).trim().toLowerCase();
    return domain && FREEMAIL_DOMAINS.has(domain)
      ? "Heads up — we strongly prefer a work email so we can verify your team."
      : null;
  }, [workEmail]);

  if (!open) return null;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      full_name: fullName.trim(),
      work_email: workEmail.trim(),
      company: company.trim(),
      role: role.trim(),
      team_size: teamSize,
      recruiter_count: recruiterCount,
      tier_of_interest: tierOfInterest,
      monthly_hiring_volume: hiringVolume || null,
      message: message.trim().slice(0, 500) || null,
      source: "landing_pricing",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    };
    try {
      const res = await fetch(`${resolveApiBaseUrl()}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Submission failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request early access"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(4, 4, 10, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "hl-fadeUp .25s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 540,
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          borderRadius: 22,
          padding: 1,
          background:
            "conic-gradient(from var(--ang, 0deg) at 50% 50%, rgba(99,102,241,.7), rgba(217,70,239,.7), rgba(34,211,238,.7), rgba(99,102,241,.7))",
          animation: "hl-spinHue 12s linear infinite",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,.7), 0 0 80px -20px rgba(99,102,241,.45)",
        }}
      >
        <div
          style={{
            borderRadius: 21,
            background:
              "linear-gradient(180deg, rgba(20,20,38,.97), rgba(10,10,22,.97))",
            padding: "28px 28px 24px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,.06)",
              border: "1px solid var(--hl-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--hl-ink-3)",
            }}
          >
            <X size={14} />
          </button>

          {done ? (
            <SuccessState onClose={onClose} />
          ) : (
            <>
              <div
                className="eyebrow"
                style={{ color: "#a78bfa", marginBottom: 8 }}
              >
                EARLY ACCESS · {TIER_LABEL[tierOfInterest].toUpperCase()}
              </div>
              <h3
                className="display"
                style={{ fontSize: 26, margin: "0 0 6px", lineHeight: 1.15 }}
              >
                {TIER_HEADLINE[tierOfInterest]}
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--hl-ink-3)", margin: "0 0 18px" }}>
                Tell us a bit about you and we&apos;ll be in touch within 24 hours.
              </p>

              {error && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    marginBottom: 14,
                    fontSize: 12.5,
                    background: "rgba(244,63,94,.12)",
                    border: "1px solid rgba(244,63,94,.32)",
                    color: "#fda4af",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} noValidate>
                <ModalField
                  id="lead-name"
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Jane Recruiter"
                  required
                  autoFocus
                />
                <ModalField
                  id="lead-email"
                  label="Work email"
                  type="email"
                  value={workEmail}
                  onChange={setWorkEmail}
                  placeholder="you@company.com"
                  required
                  hint={freemailWarning}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <ModalField
                    id="lead-company"
                    label="Company name"
                    value={company}
                    onChange={setCompany}
                    placeholder="Acme Corp"
                    required
                  />
                  <ModalField
                    id="lead-role"
                    label="Role / job title"
                    value={role}
                    onChange={setRole}
                    placeholder="Head of Talent"
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <ModalSelect
                    id="lead-team"
                    label="Team size"
                    value={teamSize}
                    onChange={(v) => setTeamSize(v as TeamSize)}
                    options={TEAM_SIZES.map((s) => ({ value: s, label: s }))}
                  />
                  <ModalSelect
                    id="lead-recruiters"
                    label="Recruiters"
                    value={recruiterCount}
                    onChange={(v) => setRecruiterCount(v as RecruiterCount)}
                    options={RECRUITER_COUNTS.map((s) => ({ value: s, label: s }))}
                  />
                </div>
                <ModalSelect
                  id="lead-volume"
                  label="Monthly hiring volume (optional)"
                  value={hiringVolume}
                  onChange={(v) => setHiringVolume(v as HiringVolume | "")}
                  options={[
                    { value: "", label: "Prefer not to say" },
                    ...HIRING_VOLUMES.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <ModalTextarea
                  id="lead-message"
                  label="Use case / message (optional)"
                  value={message}
                  onChange={(v) => setMessage(v.slice(0, 500))}
                  placeholder="What roles are you hiring for, current pain points, etc."
                  maxLength={500}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    height: 48,
                    justifyContent: "center",
                    borderRadius: 12,
                    fontSize: 14,
                    marginTop: 4,
                    opacity: submitting ? 0.85 : 1,
                    cursor: submitting ? "wait" : "pointer",
                  }}
                >
                  {submitting ? (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,.35)",
                          borderTopColor: "#fff",
                          animation: "hl-spin .8s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Send request <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ padding: "16px 4px", textAlign: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "rgba(52,211,153,.18)",
          color: "#34d399",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <Check size={28} />
      </div>
      <h3 className="display" style={{ fontSize: 26, margin: "0 0 8px" }}>
        Thanks.
      </h3>
      <p style={{ fontSize: 14, color: "var(--hl-ink-2)", lineHeight: 1.55, margin: "0 0 22px" }}>
        We&apos;ll be in touch within 24 hours.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="btn btn-ghost"
        style={{ height: 42, padding: "0 18px", fontSize: 13 }}
      >
        Close
      </button>
    </div>
  );
}

function ModalField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  hint?: string | null;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontFamily: "var(--hl-mono)",
          fontSize: 10.5,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: focused ? "#c7d2fe" : "var(--hl-ink-3)",
          transition: "color .2s ease",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div
        style={{
          borderRadius: 10,
          padding: 1,
          background: focused
            ? "linear-gradient(135deg, #6366f1, #d946ef)"
            : "var(--hl-line-strong)",
          transition: "background .2s ease",
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,.12)" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#0c0c1a",
            borderRadius: 9,
            height: 42,
            padding: "0 14px",
          }}
        >
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            required={required}
            autoFocus={autoFocus}
            style={{
              flex: 1,
              height: "100%",
              background: "transparent",
              border: 0,
              outline: "none",
              color: "#fff",
              fontSize: 14,
              fontFamily: "var(--hl-body)",
            }}
          />
        </div>
      </div>
      {hint && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: "#fbbf24", lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function ModalSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontFamily: "var(--hl-mono)",
          fontSize: 10.5,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: focused ? "#c7d2fe" : "var(--hl-ink-3)",
          transition: "color .2s ease",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div
        style={{
          borderRadius: 10,
          padding: 1,
          background: focused
            ? "linear-gradient(135deg, #6366f1, #d946ef)"
            : "var(--hl-line-strong)",
          transition: "background .2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#0c0c1a",
            borderRadius: 9,
            height: 42,
            padding: "0 14px",
          }}
        >
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              flex: 1,
              height: "100%",
              background: "transparent",
              border: 0,
              outline: "none",
              color: "#fff",
              fontSize: 14,
              fontFamily: "var(--hl-body)",
              appearance: "none",
              cursor: "pointer",
            }}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "#0c0c1a", color: "#fff" }}>
                {o.label}
              </option>
            ))}
          </select>
          <span aria-hidden="true" style={{ color: "var(--hl-ink-3)", fontSize: 11, marginLeft: 4 }}>
            ▾
          </span>
        </div>
      </div>
    </div>
  );
}

function ModalTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <label
          htmlFor={id}
          style={{
            fontFamily: "var(--hl-mono)",
            fontSize: 10.5,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: focused ? "#c7d2fe" : "var(--hl-ink-3)",
            transition: "color .2s ease",
          }}
        >
          {label}
        </label>
        {maxLength != null && (
          <span style={{ fontFamily: "var(--hl-mono)", fontSize: 10, color: "var(--hl-ink-4)" }}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div
        style={{
          borderRadius: 10,
          padding: 1,
          background: focused
            ? "linear-gradient(135deg, #6366f1, #d946ef)"
            : "var(--hl-line-strong)",
          transition: "background .2s ease",
        }}
      >
        <div
          style={{
            background: "#0c0c1a",
            borderRadius: 9,
            padding: "10px 14px",
          }}
        >
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            rows={3}
            maxLength={maxLength}
            style={{
              width: "100%",
              background: "transparent",
              border: 0,
              outline: "none",
              color: "#fff",
              fontSize: 14,
              fontFamily: "var(--hl-body)",
              resize: "vertical",
              minHeight: 60,
            }}
          />
        </div>
      </div>
    </div>
  );
}
