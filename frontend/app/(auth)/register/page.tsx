"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { AlertCircle, ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import { useRegisterMutation } from "../../../store/api/authApi";
import { setToken } from "../../../lib/auth";

const schema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords must match" });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFeedback(null);
    try {
      const result = await registerUser({ name: values.name, email: values.email, password: values.password }).unwrap();
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
      const defaultMessage = status === 409
        ? "This email is already used. Please sign in or use another email."
        : status === 429
          ? "Too many registration attempts. Please wait 15 minutes and try again."
          : "Registration failed.";
      const message = typeof errorData === "string" ? errorData : errorData?.error ?? defaultMessage;
      setFeedback({ type: "error", text: message });
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-sky-600">
      <motion.div
        className="absolute -right-16 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="mb-8 text-center text-white lg:text-left">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm backdrop-blur-md lg:mx-0">
              <UserPlus className="h-4 w-4 text-sky-200" />
              Recruiter onboarding
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Create your account</h1>
            <p className="mt-2 text-sm text-white/85">Join Umurava AI HR to run screenings and shortlists in one place.</p>
          </div>

          <div className="rounded-3xl border border-white/25 bg-white/10 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            {feedback ? (
              <div
                className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
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
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/90">Full name</span>
                <input
                  {...register("name")}
                  className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                  placeholder="Jane Recruiter"
                />
                {errors.name?.message ? <span className="mt-1 block text-xs text-rose-200">{errors.name.message}</span> : null}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/90">Work email</span>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                  placeholder="you@company.com"
                />
                {errors.email?.message ? <span className="mt-1 block text-xs text-rose-200">{errors.email.message}</span> : null}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/90">Password</span>
                <input
                  type="password"
                  {...register("password")}
                  className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                  placeholder="At least 8 characters"
                />
                {errors.password?.message ? <span className="mt-1 block text-xs text-rose-200">{errors.password.message}</span> : null}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/90">Confirm password</span>
                <input
                  type="password"
                  {...register("confirmPassword")}
                  className="w-full rounded-full border border-white/35 bg-white/15 px-5 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-sky-300/50"
                />
                {errors.confirmPassword?.message ? (
                  <span className="mt-1 block text-xs text-rose-200">{errors.confirmPassword.message}</span>
                ) : null}
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50 disabled:opacity-70"
              >
                {isLoading ? "Creating account..." : "Register"}
                {!isLoading ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/85">
              Already have an account?{" "}
              <Link className="font-semibold text-sky-100 underline decoration-white/40 underline-offset-2 hover:text-white" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
