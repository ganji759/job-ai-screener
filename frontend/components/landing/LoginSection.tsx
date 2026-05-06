"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLoginMutation, useVerifyOtpMutation, useSendOtpMutation } from "../../store/api/authApi";
import { setToken } from "../../lib/auth";

const schema = z.object({ email: z.email(), password: z.string().min(1) });
type FormValues = z.infer<typeof schema>;
type Screen = "login" | "otp";

export function LoginSection() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isResendingOtp }] = useSendOtpMutation();
  const [screen, setScreen] = useState<Screen>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFeedback(null);
    try {
      const result = await login(values).unwrap();
      if (result.requiresOtp) {
        setPendingEmail(values.email);
        setScreen("otp");
        setFeedback({ type: "success", text: "OTP sent to your email. Enter the 6-digit code to continue." });
        toast.success("OTP sent. Check your email.");
        return;
      }
      if (result.token) {
        setToken(result.token);
        toast.success("Login successful.");
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setFeedback({ type: "error", text: "Unexpected login response. Please try again." });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorData = (error as { data?: { error?: string } | string })?.data;
      const defaultMessage = status === 429 ? "Too many login attempts. Please wait." : "Login failed.";
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  const onVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setFeedback({ type: "error", text: "Please enter a valid 6-digit OTP code." });
      return;
    }
    setFeedback(null);
    try {
      const result = await verifyOtp({ email: pendingEmail, code: otpCode.trim(), purpose: "login_2fa" }).unwrap();
      setToken(result.token);
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

  const onResendOtp = async () => {
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

  const benefits = [
    { icon: "🎯", title: "AI-Ranked Candidates", desc: "Your latest job rankings are ready to review" },
    { icon: "📊", title: "Real-Time Analytics", desc: "Track your pipeline and hiring metrics live" },
    { icon: "⚡", title: "Instant Screening", desc: "New CVs processed and ranked automatically" },
  ];

  return (
    <section
      id="login"
      className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 py-24 px-6 min-h-screen flex items-center"
    >
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

        {/* Left column */}
        <div className="hidden lg:block text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
            🔒 Secure Recruiter Portal
          </div>
          <h2 className="text-4xl font-black mb-4">Welcome Back to Your Workspace</h2>
          <p className="text-white/70 mb-10">
            Sign in to access your AI-powered recruiting dashboard and continue building exceptional teams.
          </p>
          <div className="space-y-5">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0">
                  {b.icon}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{b.title}</div>
                  <div className="text-white/55 text-sm mt-0.5">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — login card */}
        <div className="bg-white rounded-3xl p-10 sm:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl mx-auto mb-4">
              🤖
            </div>
            <h3 className="text-2xl font-black text-slate-900">Sign In</h3>
            <p className="text-sm text-slate-500 mt-1">Access your recruiter workspace</p>
          </div>

          {feedback && (
            <div
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm mb-6 ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
              role="alert"
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {screen === "login" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Email</span>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="recruiter@company.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-400"
                />
                {errors.email && (
                  <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>
                )}
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <a
                    href="/login"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 transition"
                  >
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  {...register("password")}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder:text-slate-400"
                />
                {errors.password && (
                  <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>
                )}
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-px transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isLoading ? "Sending OTP..." : "Continue"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">or</span>
                </div>
              </div>

              <a
                href="/login"
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                Continue with SSO 🔑
              </a>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter the OTP sent to <span className="font-semibold text-slate-900">{pendingEmail}</span>
              </p>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">OTP Code</span>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center tracking-[0.35em] text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  placeholder="000000"
                  inputMode="numeric"
                  aria-label="OTP code"
                />
              </label>
              <button
                type="button"
                onClick={() => void onVerifyOtp()}
                disabled={isVerifyingOtp}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/30 hover:-translate-y-px transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                {!isVerifyingOtp && <ArrowRight className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => void onResendOtp()}
                disabled={isResendingOtp}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition disabled:opacity-70"
              >
                {isResendingOtp ? "Resending..." : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => { setScreen("login"); setFeedback(null); setOtpCode(""); }}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <a href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition underline underline-offset-2">
              Create one
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
