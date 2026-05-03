"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { AlertCircle, ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useLoginMutation, useResetPasswordMutation, useSendOtpMutation, useVerifyOtpMutation } from "../../../store/api/authApi";
import { setToken } from "../../../lib/auth";

const schema = z.object({ email: z.email(), password: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

const LOGIN_LINE_1 = "Umurava AI HR";
const LOGIN_LINE_2 = "Screen smarter, rank faster, and hire with confidence.";
const LOGIN_LINE_3 = "Your recruiter workspace is ready.";
const LOGIN_BULLET_1 = "Multi-candidate AI scoring with transparent insights";
const LOGIN_BULLET_2 = "Secure recruiter access with OTP-ready architecture";

function useTypewriter(text: string, delayMs: number) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    let cursor = 0;
    const starter = window.setTimeout(() => {
      const timer = window.setInterval(() => {
        cursor += 1;
        setDisplay(text.slice(0, cursor));
        if (cursor >= text.length) window.clearInterval(timer);
      }, 18);
    }, delayMs);

    return () => window.clearTimeout(starter);
  }, [text, delayMs]);

  return display;
}

type Screen = "login" | "loginOtp" | "forgotEmail" | "forgotOtp";

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
  const otpStep = screen === "loginOtp";
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const heroLine1 = useTypewriter(LOGIN_LINE_1, 80);
  const heroLine2 = useTypewriter(LOGIN_LINE_2, 520);
  const heroLine3 = useTypewriter(LOGIN_LINE_3, 980);
  const heroBullet1 = useTypewriter(LOGIN_BULLET_1, 1400);
  const heroBullet2 = useTypewriter(LOGIN_BULLET_2, 1780);

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
      const defaultMessage = status === 429
        ? "Too many login attempts. Please wait a bit and try again."
        : "Login failed.";
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
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
      const result = await verifyOtp({ email: pendingEmail, code: otpCode.trim(), purpose: "login_2fa" }).unwrap();
      setToken(result.token);
      setFeedback({ type: "success", text: "Authentication verified. Redirecting..." });
      toast.success("OTP verified successfully.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage = status === 400 ? "Invalid or expired OTP." : "OTP verification failed.";
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
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
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? "Unable to resend OTP.";
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
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? "Unable to send reset code.";
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
      const result = await resetPassword({ email: forgotEmail.trim(), code: forgotOtp.trim(), newPassword: forgotNewPassword }).unwrap();
      setToken(result.token);
      toast.success("Password reset successfully. Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage = status === 400 ? "Invalid or expired reset code." : "Password reset failed.";
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-sky-600">
      <motion.div
        className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        animate={{ scale: [1, 1.12, 1], x: [0, 20, 0], y: [0, 14, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl"
        animate={{ scale: [1, 1.15, 1], x: [0, -24, 0], y: [0, 18, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
        animate={{ scale: [1, 1.08, 1], x: [0, 12, 0], y: [0, -12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden text-white lg:block"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-sky-200" />
            AI-Powered Talent Intelligence
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">{heroLine1}</h1>
          <p className="mt-4 max-w-lg text-base text-white/90">
            {heroLine2}
            <br />
            {heroLine3}
          </p>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-white/90">
              <BrainCircuit className="h-5 w-5 shrink-0 text-sky-200" />
              {heroBullet1}
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-200" />
              {heroBullet2}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full"
        >
          <div className="rounded-3xl border border-white/25 bg-white/10 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            {screen === "forgotEmail" || screen === "forgotOtp" ? (
              <div className="mb-1 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <KeyRound className="h-5 w-5 text-sky-200" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                  <p className="text-sm text-white/75">{screen === "forgotEmail" ? "We'll send a reset code to your email" : "Enter the code and your new password"}</p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-center text-3xl font-bold text-white">Welcome Back</h2>
                <p className="mt-1 text-center text-sm text-white/80">Recruiter sign in</p>
              </>
            )}
            {feedback ? (
              <div
                className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  feedback.type === "success"
                    ? "border-emerald-200/60 bg-emerald-50/90 text-emerald-900"
                    : "border-rose-200/70 bg-rose-50/95 text-rose-900"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            ) : null}

            {screen === "login" ? (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/90">Email</span>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="recruiter@company.com"
                  />
                  {errors.email?.message ? <span className="mt-1 block text-xs text-rose-200">{errors.email.message}</span> : null}
                </label>

                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-white/90">Password</span>
                    <button
                      type="button"
                      onClick={() => { setScreen("forgotEmail"); setFeedback(null); }}
                      className="text-xs font-medium text-sky-200 underline decoration-sky-300/40 underline-offset-2 transition hover:text-white"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    {...register("password")}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="Enter your password"
                  />
                  {errors.password?.message ? (
                    <span className="mt-1 block text-xs text-rose-200">{errors.password.message}</span>
                  ) : null}
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50 hover:shadow-xl disabled:opacity-70"
                >
                  {isLoading ? "Sending OTP..." : "Continue"}
                  {!isLoading ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
                </button>
              </form>
            ) : screen === "loginOtp" ? (
              <div className="mt-8 space-y-4">
                <p className="text-sm text-white/85">
                  Enter OTP sent to <span className="font-semibold text-white">{pendingEmail}</span>
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/90">OTP Code</span>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-center tracking-[0.35em] text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="000000"
                    inputMode="numeric"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void onVerifyOtp()}
                  disabled={isVerifyingOtp}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50 hover:shadow-xl disabled:opacity-70"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                  {!isVerifyingOtp ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => void onResendOtp()}
                  disabled={isResendingOtp}
                  className="w-full rounded-full border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-70"
                >
                  {isResendingOtp ? "Resending..." : "Resend OTP"}
                </button>
                <button type="button" onClick={backToLogin} className="flex w-full items-center justify-center gap-1.5 text-sm text-white/85 underline decoration-white/40 underline-offset-2 transition hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to password login
                </button>
              </div>
            ) : screen === "forgotEmail" ? (
              <div className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/90">Your email address</span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="recruiter@company.com"
                    autoFocus
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void onForgotSendOtp()}
                  disabled={isResendingOtp}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50 hover:shadow-xl disabled:opacity-70"
                >
                  {isResendingOtp ? "Sending..." : "Send Reset Code"}
                  {!isResendingOtp ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
                </button>
                <button type="button" onClick={backToLogin} className="flex w-full items-center justify-center gap-1.5 text-sm text-white/85 underline decoration-white/40 underline-offset-2 transition hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                <p className="text-sm text-white/85">
                  Reset code sent to <span className="font-semibold text-white">{forgotEmail}</span>
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/90">Reset Code</span>
                  <input
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-center tracking-[0.35em] text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="000000"
                    inputMode="numeric"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/90">New Password</span>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/90">Confirm Password</span>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                    placeholder="Repeat your new password"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void onForgotResetPassword()}
                  disabled={isResettingPassword}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50 hover:shadow-xl disabled:opacity-70"
                >
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                  {!isResettingPassword ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
                </button>
                <button type="button" onClick={() => { setScreen("forgotEmail"); setFeedback(null); }} className="flex w-full items-center justify-center gap-1.5 text-sm text-white/85 underline decoration-white/40 underline-offset-2 transition hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
                </button>
              </div>
            )}

            {(screen === "login" || screen === "loginOtp") ? (
              <p className="mt-6 text-center text-sm text-white/85">
                No account?{" "}
                <Link className="font-semibold text-sky-100 underline decoration-white/40 underline-offset-2 transition hover:text-white" href="/register">
                  Create one
                </Link>
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
