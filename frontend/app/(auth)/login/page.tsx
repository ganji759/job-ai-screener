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
  ArrowLeft,
  ArrowRight,
  Bolt,
  Check,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  useLoginMutation,
  useResetPasswordMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from "../../../store/api/authApi";
import { setToken } from "../../../lib/auth";
import {
  Field,
  HeronLogo,
  LiveFeed,
  RotatingPill,
  SubmitButton,
} from "../_components";

const schema = z.object({ email: z.email(), password: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

type Screen = "login" | "loginOtp" | "forgotEmail" | "forgotOtp";

// SSO buttons (visual only — backend doesn't yet wire OAuth)
function SSOButton({ provider }: { provider: "google" | "github" }) {
  const onClick = () =>
    toast(`${provider === "google" ? "Google" : "GitHub"} SSO is coming soon.`, { icon: "🔒" });
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-ghost"
      style={{
        height: 38,
        padding: "0 10px",
        gap: 6,
        justifyContent: "center",
        borderRadius: 10,
        fontSize: 12.5,
        fontWeight: 500,
        minWidth: 0,
      }}
    >
      {provider === "google" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 5.04c1.77 0 3.36.61 4.6 1.8l3.43-3.43C17.94 1.5 15.21.5 12 .5 7.34.5 3.32 3.21 1.38 7.18l3.99 3.1C6.31 7.5 8.93 5.04 12 5.04z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.25c0-.82-.07-1.6-.21-2.36H12v4.46h6.46c-.28 1.5-1.13 2.78-2.4 3.63l3.87 3c2.27-2.1 3.57-5.18 3.57-8.73z"
          />
          <path
            fill="#FBBC05"
            d="M5.37 14.28a7.4 7.4 0 0 1 0-4.56l-3.99-3.1A11.93 11.93 0 0 0 0 12c0 1.93.46 3.76 1.38 5.38l3.99-3.1z"
          />
          <path
            fill="#34A853"
            d="M12 23.5c3.21 0 5.92-1.06 7.9-2.87l-3.87-3c-1.07.72-2.45 1.15-4.03 1.15-3.07 0-5.69-2.06-6.63-4.84l-3.99 3.1C3.32 20.79 7.34 23.5 12 23.5z"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
          <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.3v3.4c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
        </svg>
      )}
      <span>{provider === "google" ? "Google" : "GitHub"}</span>
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isResendingOtp }] = useSendOtpMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [screen, setScreen] = useState<Screen>("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFeedback(null);
    try {
      const result = await login(values).unwrap();
      if (result.requiresOtp) {
        setPendingEmail(values.email);
        setScreen("loginOtp");
        setFeedback({ type: "success", text: "OTP sent to your email. Enter the 6-digit code to continue." });
        toast.success("OTP sent. Check your email.");
        return;
      }
      if (result.token) {
        setToken(result.token);
        setFeedback({ type: "success", text: "Login successful. Redirecting..." });
        toast.success("Login successful.");
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setFeedback({ type: "error", text: "Unexpected login response. Please try again." });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage =
        status === 429 ? "Too many login attempts. Please wait a bit and try again." : "Login failed.";
      const message =
        typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const onVerifyOtp = async (): Promise<void> => {
    if (!pendingEmail || otpCode.trim().length !== 6) {
      setFeedback({ type: "error", text: "Please enter a valid 6-digit OTP code." });
      return;
    }
    setFeedback(null);
    try {
      const result = await verifyOtp({
        email: pendingEmail,
        code: otpCode.trim(),
        purpose: "login_2fa",
      }).unwrap();
      setToken(result.token);
      setFeedback({ type: "success", text: "Authentication verified. Redirecting..." });
      toast.success("OTP verified successfully.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage = status === 400 ? "Invalid or expired OTP." : "OTP verification failed.";
      const message =
        typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const onResendOtp = async (): Promise<void> => {
    if (!pendingEmail) return;
    try {
      await sendOtp({ email: pendingEmail, purpose: "login_2fa" }).unwrap();
      setFeedback({ type: "success", text: "A new OTP has been sent to your email." });
      toast.success("OTP resent.");
    } catch (error) {
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const message =
        typeof errorData === "string" ? errorData : errorData?.error ?? "Unable to resend OTP.";
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const onForgotSendOtp = async (): Promise<void> => {
    if (!forgotEmail.trim()) {
      setFeedback({ type: "error", text: "Please enter your email address." });
      return;
    }
    setFeedback(null);
    try {
      await sendOtp({ email: forgotEmail.trim(), purpose: "password_reset" }).unwrap();
      setScreen("forgotOtp");
      setFeedback({ type: "success", text: "A reset code was sent to your email." });
      toast.success("Reset code sent. Check your email.");
    } catch (error) {
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const message =
        typeof errorData === "string" ? errorData : errorData?.error ?? "Unable to send reset code.";
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const onForgotResetPassword = async (): Promise<void> => {
    if (forgotOtp.trim().length !== 6) {
      setFeedback({ type: "error", text: "Please enter the 6-digit reset code." });
      return;
    }
    if (forgotNewPassword.length < 8) {
      setFeedback({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setFeedback({ type: "error", text: "Passwords do not match." });
      return;
    }
    setFeedback(null);
    try {
      const result = await resetPassword({
        email: forgotEmail.trim(),
        code: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      }).unwrap();
      setToken(result.token);
      toast.success("Password reset successfully. Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage = status === 400 ? "Invalid or expired reset code." : "Password reset failed.";
      const message =
        typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const backToLogin = () => {
    setScreen("login");
    setFeedback(null);
    setOtpCode("");
    setPendingEmail("");
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
  };

  const emailReg = register("email");
  const passwordReg = register("password");

  const isReset = screen === "forgotEmail" || screen === "forgotOtp";

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
              Don&apos;t have an account?
            </span>
            <Link
              className="btn btn-ghost"
              href="/register"
              style={{ height: 40, padding: "0 16px", fontSize: 13 }}
            >
              Start free trial <ArrowRight size={12} />
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
                Sign in.
                <br />
                <span className="gradient-text-warm">Start screening</span>
                <br />
                in seconds.
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
                Your AI hiring assistant has been busy. While you were away, it kept ranking,
                scheduling and shortlisting — transparently.
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
                  <Bolt size={14} /> SSO + SAML
                </span>
              </div>
            </div>

            {/* RIGHT — login card */}
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
                        Secure · OTP-ready
                      </span>
                    </div>

                    <h2
                      className="display"
                      style={{ fontSize: 36, lineHeight: 1.05, margin: "18px 0 6px" }}
                    >
                      {isReset ? (
                        <>
                          Reset <span className="gradient-text-warm">password</span>.
                        </>
                      ) : (
                        <>
                          Welcome <span className="gradient-text-warm">back</span>.
                        </>
                      )}
                    </h2>
                    <p style={{ color: "var(--hl-ink-3)", fontSize: 14, margin: 0 }}>
                      {screen === "login"
                        ? "Sign in to your recruiter workspace."
                        : screen === "loginOtp"
                          ? "Enter the 6-digit code we sent to your email."
                          : screen === "forgotEmail"
                            ? "We'll email you a reset code."
                            : "Enter the code and choose a new password."}
                    </p>

                    {screen === "login" && (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                            marginTop: 26,
                          }}
                        >
                          <SSOButton provider="google" />
                          <SSOButton provider="github" />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            margin: "22px 0 22px",
                            fontSize: 10.5,
                            fontFamily: "var(--hl-mono)",
                            letterSpacing: ".14em",
                            color: "var(--hl-ink-4)",
                            textTransform: "uppercase",
                          }}
                        >
                          <div style={{ flex: 1, height: 1, background: "var(--hl-line)" }} />
                          or continue with email
                          <div style={{ flex: 1, height: 1, background: "var(--hl-line)" }} />
                        </div>
                      </>
                    )}

                    {feedback && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          marginBottom: 14,
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

                    {screen === "login" && (
                      <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <Field
                          id="login-email"
                          label="Work email"
                          type="email"
                          placeholder="recruiter@company.com"
                          autoFocus
                          registerRef={emailReg.ref}
                          registerOnBlur={emailReg.onBlur}
                          registerOnChange={emailReg.onChange}
                          registerName={emailReg.name}
                          error={errors.email?.message}
                        />
                        <Field
                          id="login-password"
                          label="Password"
                          type="password"
                          placeholder="••••••••••••"
                          registerRef={passwordReg.ref}
                          registerOnBlur={passwordReg.onBlur}
                          registerOnChange={passwordReg.onChange}
                          registerName={passwordReg.name}
                          rightSlot={
                            <button
                              type="button"
                              onClick={() => {
                                setScreen("forgotEmail");
                                setFeedback(null);
                              }}
                              style={{
                                fontSize: 11.5,
                                color: "#c7d2fe",
                                borderBottom: "1px dashed rgba(199,210,254,.4)",
                              }}
                            >
                              Forgot password?
                            </button>
                          }
                          error={errors.password?.message}
                        />

                        <SubmitButton
                          loading={isLoading}
                          loadingLabel="Signing in…"
                          label="Sign in"
                        />

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 14,
                            fontSize: 12.5,
                            color: "var(--hl-ink-3)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            defaultChecked
                            style={{ width: 14, height: 14, accentColor: "#6366f1" }}
                          />
                          Keep me signed in on this device
                        </label>
                      </form>
                    )}

                    {screen === "loginOtp" && (
                      <div>
                        <div
                          style={{
                            margin: "4px 0 18px",
                            padding: "12px 14px",
                            borderRadius: 12,
                            background: "rgba(99,102,241,.08)",
                            border: "1px solid rgba(99,102,241,.25)",
                            fontSize: 12.5,
                            color: "var(--hl-ink-2)",
                          }}
                        >
                          OTP sent to{" "}
                          <span style={{ color: "#fff", fontWeight: 600 }}>{pendingEmail}</span>.
                          Code expires in 10 minutes.
                        </div>

                        <Field
                          id="login-otp"
                          label="OTP code"
                          placeholder="000000"
                          inputMode="numeric"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          inputStyle={{
                            textAlign: "center",
                            letterSpacing: "0.35em",
                            fontFamily: "var(--hl-mono)",
                            fontSize: 18,
                          }}
                        />

                        <SubmitButton
                          type="button"
                          loading={isVerifyingOtp}
                          loadingLabel="Verifying…"
                          label="Verify OTP"
                          onClick={() => void onVerifyOtp()}
                        />

                        <button
                          type="button"
                          onClick={() => void onResendOtp()}
                          disabled={isResendingOtp}
                          className="btn btn-ghost"
                          style={{
                            width: "100%",
                            height: 42,
                            fontSize: 13,
                            marginTop: 10,
                            justifyContent: "center",
                            borderRadius: 12,
                          }}
                        >
                          {isResendingOtp ? "Resending…" : "Resend code"}
                        </button>

                        <button
                          type="button"
                          onClick={backToLogin}
                          style={{
                            marginTop: 14,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontSize: 12.5,
                            color: "var(--hl-ink-3)",
                          }}
                        >
                          <ArrowLeft size={12} /> Back to sign in
                        </button>
                      </div>
                    )}

                    {screen === "forgotEmail" && (
                      <div>
                        <Field
                          id="forgot-email"
                          label="Your email address"
                          type="email"
                          placeholder="recruiter@company.com"
                          autoFocus
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />

                        <SubmitButton
                          type="button"
                          loading={isResendingOtp}
                          loadingLabel="Sending…"
                          label="Send reset code"
                          onClick={() => void onForgotSendOtp()}
                        />

                        <button
                          type="button"
                          onClick={backToLogin}
                          style={{
                            marginTop: 14,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontSize: 12.5,
                            color: "var(--hl-ink-3)",
                          }}
                        >
                          <ArrowLeft size={12} /> Back to sign in
                        </button>
                      </div>
                    )}

                    {screen === "forgotOtp" && (
                      <div>
                        <div
                          style={{
                            margin: "4px 0 18px",
                            padding: "12px 14px",
                            borderRadius: 12,
                            background: "rgba(99,102,241,.08)",
                            border: "1px solid rgba(99,102,241,.25)",
                            fontSize: 12.5,
                            color: "var(--hl-ink-2)",
                          }}
                        >
                          Reset code sent to{" "}
                          <span style={{ color: "#fff", fontWeight: 600 }}>{forgotEmail}</span>.
                        </div>

                        <Field
                          id="forgot-otp"
                          label="Reset code"
                          placeholder="000000"
                          inputMode="numeric"
                          value={forgotOtp}
                          onChange={(e) =>
                            setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          inputStyle={{
                            textAlign: "center",
                            letterSpacing: "0.35em",
                            fontFamily: "var(--hl-mono)",
                            fontSize: 18,
                          }}
                        />

                        <Field
                          id="forgot-new-password"
                          label="New password"
                          type="password"
                          placeholder="At least 8 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                        />

                        <Field
                          id="forgot-confirm-password"
                          label="Confirm password"
                          type="password"
                          placeholder="Repeat your new password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        />

                        <SubmitButton
                          type="button"
                          loading={isResettingPassword}
                          loadingLabel="Resetting…"
                          label="Reset password"
                          onClick={() => void onForgotResetPassword()}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setScreen("forgotEmail");
                            setFeedback(null);
                          }}
                          style={{
                            marginTop: 14,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontSize: 12.5,
                            color: "var(--hl-ink-3)",
                          }}
                        >
                          <ArrowLeft size={12} /> Use a different email
                        </button>
                      </div>
                    )}

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
                      <span>New to HERON?</span>
                      <Link
                        href="/register"
                        style={{
                          color: "#fff",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Start free trial <ArrowRight size={12} />
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
