"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  Bolt,
  Check,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useRegisterMutation } from "../../../store/api/authApi";
import { setToken } from "../../../lib/auth";
import {
  Field,
  HeronLogo,
  LiveFeed,
  RotatingPill,
  SubmitButton,
} from "../_components";

const schema = z
  .object({
    orgName: z.string().min(2, "Organisation name must be at least 2 characters"),
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.email("Enter a valid work email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFeedback(null);
    try {
      const result = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        orgName: values.orgName,
      }).unwrap();
      setToken(result.token);
      setFeedback({ type: "success", text: "Account created successfully. Redirecting to dashboard..." });
      toast.success("Registration successful.");
      if (result.warning) {
        setFeedback({ type: "error", text: result.warning });
        toast.error(result.warning);
      }
      router.push("/dashboard");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage =
        status === 409
          ? "This email is already used. Please sign in or use another email."
          : status === 429
            ? "Too many registration attempts. Please wait 15 minutes and try again."
            : "Registration failed.";
      const message =
        typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const orgReg = register("orgName");
  const nameReg = register("name");
  const emailReg = register("email");
  const passwordReg = register("password");
  const confirmReg = register("confirmPassword");

  return (
    <div className="heron-landing">
      <div className="page-bg" aria-hidden="true" />
      <div className="aurora" aria-hidden="true" />

      <nav style={{ position: "sticky", top: 0, zIndex: 30, background: "transparent" }}>
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 72,
          }}
        >
          <Link
            href="/"
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
            aria-label="HERON home"
          >
            <HeronLogo size={28} />
            HERON
          </Link>
          <div
            className="hl-login-nav-right"
            style={{ display: "flex", alignItems: "center", gap: 18 }}
          >
            <span style={{ color: "var(--hl-ink-3)", fontSize: 13 }}>
              Already have an account?
            </span>
            <Link
              className="btn btn-ghost"
              href="/login"
              style={{ height: 40, padding: "0 16px", fontSize: 13 }}
            >
              Sign in <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </nav>

      <section
        style={{
          padding: "40px 0 100px",
          minHeight: "calc(100vh - 72px)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="container" style={{ width: "100%" }}>
          <div className="hl-login-grid">
            {/* LEFT */}
            <div className="fade-up" style={{ maxWidth: 540 }}>
              <RotatingPill />
              <h1
                className="display"
                style={{ fontSize: "clamp(44px, 5.4vw, 72px)", margin: 0 }}
              >
                Create your
                <br />
                <span className="gradient-text-warm">recruiter</span>
                <br />
                workspace.
              </h1>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--hl-ink-2)",
                  marginTop: 22,
                  maxWidth: 480,
                }}
              >
                Two minutes to set up. Bring your AI hiring assistant online and watch it
                screen, rank and schedule from your very first job posting.
              </p>

              <div style={{ marginTop: 32 }}>
                <LiveFeed />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  marginTop: 26,
                  color: "var(--hl-ink-3)",
                  fontSize: 12.5,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={14} /> SOC2 Type II
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={14} /> GDPR ready
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Bolt size={14} /> 14-day free trial
                </span>
              </div>
            </div>

            {/* RIGHT — register card */}
            <div
              className="fade-up"
              style={{ maxWidth: 480, width: "100%", justifySelf: "end" }}
            >
              <div style={{ position: "relative" }}>
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: -40,
                    background:
                      "radial-gradient(circle at 50% 30%, rgba(99,102,241,.30), transparent 60%), radial-gradient(circle at 70% 80%, rgba(217,70,239,.20), transparent 60%)",
                    filter: "blur(40px)",
                    zIndex: 0,
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
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
                        "linear-gradient(180deg, rgba(20,20,38,.95), rgba(10,10,22,.95))",
                      padding: "34px 34px 28px",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <HeronLogo size={28} />
                        <span
                          style={{
                            fontFamily: "var(--hl-display)",
                            fontWeight: 700,
                            fontSize: 18,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          HERON
                        </span>
                      </div>
                      <span className="pill" style={{ height: 26, fontSize: 11 }}>
                        <span className="dot" />
                        Free 14-day trial
                      </span>
                    </div>

                    <h2
                      className="display"
                      style={{ fontSize: 36, lineHeight: 1.05, margin: "18px 0 6px" }}
                    >
                      Get <span className="gradient-text-warm">started</span>.
                    </h2>
                    <p style={{ color: "var(--hl-ink-3)", fontSize: 14, margin: 0 }}>
                      No credit card required. Cancel anytime.
                    </p>

                    {feedback && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          margin: "22px 0 14px",
                          fontSize: 12.5,
                          background:
                            feedback.type === "success"
                              ? "rgba(52,211,153,.10)"
                              : "rgba(244,63,94,.12)",
                          border:
                            feedback.type === "success"
                              ? "1px solid rgba(52,211,153,.32)"
                              : "1px solid rgba(244,63,94,.32)",
                          color: feedback.type === "success" ? "#86efac" : "#fda4af",
                        }}
                      >
                        {feedback.type === "success" ? (
                          <CheckCircle2 size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                        ) : (
                          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                        )}
                        <span>{feedback.text}</span>
                      </div>
                    )}

                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      noValidate
                      style={{ marginTop: feedback ? 0 : 22 }}
                    >
                      <Field
                        id="register-org"
                        label="Organisation"
                        placeholder="Acme Corp"
                        autoFocus
                        registerRef={orgReg.ref}
                        registerOnBlur={orgReg.onBlur}
                        registerOnChange={orgReg.onChange}
                        registerName={orgReg.name}
                        error={errors.orgName?.message}
                      />
                      <Field
                        id="register-name"
                        label="Full name"
                        placeholder="Jane Recruiter"
                        registerRef={nameReg.ref}
                        registerOnBlur={nameReg.onBlur}
                        registerOnChange={nameReg.onChange}
                        registerName={nameReg.name}
                        error={errors.name?.message}
                      />
                      <Field
                        id="register-email"
                        label="Work email"
                        type="email"
                        placeholder="you@company.com"
                        registerRef={emailReg.ref}
                        registerOnBlur={emailReg.onBlur}
                        registerOnChange={emailReg.onChange}
                        registerName={emailReg.name}
                        error={errors.email?.message}
                      />
                      <Field
                        id="register-password"
                        label="Password"
                        type="password"
                        placeholder="At least 8 characters"
                        registerRef={passwordReg.ref}
                        registerOnBlur={passwordReg.onBlur}
                        registerOnChange={passwordReg.onChange}
                        registerName={passwordReg.name}
                        error={errors.password?.message}
                      />
                      <Field
                        id="register-confirm"
                        label="Confirm password"
                        type="password"
                        placeholder="Repeat your password"
                        registerRef={confirmReg.ref}
                        registerOnBlur={confirmReg.onBlur}
                        registerOnChange={confirmReg.onChange}
                        registerName={confirmReg.name}
                        error={errors.confirmPassword?.message}
                      />

                      <SubmitButton
                        loading={isLoading}
                        loadingLabel="Creating account…"
                        label="Create account"
                      />

                      <p
                        style={{
                          marginTop: 16,
                          fontSize: 11.5,
                          lineHeight: 1.55,
                          color: "var(--hl-ink-4)",
                          textAlign: "center",
                        }}
                      >
                        By creating an account you agree to HERON&apos;s{" "}
                        <a
                          href="#"
                          style={{
                            color: "var(--hl-ink-2)",
                            borderBottom: "1px dashed rgba(199,210,254,.3)",
                          }}
                        >
                          Terms
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          style={{
                            color: "var(--hl-ink-2)",
                            borderBottom: "1px dashed rgba(199,210,254,.3)",
                          }}
                        >
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </form>

                    <div
                      style={{
                        marginTop: 22,
                        paddingTop: 18,
                        borderTop: "1px solid var(--hl-line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "var(--hl-ink-3)",
                      }}
                    >
                      <span>Already on HERON?</span>
                      <Link
                        href="/login"
                        style={{
                          color: "#fff",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Sign in <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 80,
              paddingTop: 24,
              borderTop: "1px solid var(--hl-line)",
              display: "flex",
              justifyContent: "space-between",
              color: "var(--hl-ink-4)",
              fontSize: 12,
              fontFamily: "var(--hl-mono)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span>© 2026 HERON · Kigali</span>
            <div style={{ display: "flex", gap: 20 }}>
              <a href="#" style={{ color: "inherit" }}>
                Privacy
              </a>
              <a href="#" style={{ color: "inherit" }}>
                Terms
              </a>
              <a href="#" style={{ color: "inherit" }}>
                Status
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
