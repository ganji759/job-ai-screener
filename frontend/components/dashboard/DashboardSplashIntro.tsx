"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const LINE_1 = "Umurava AI HR";
const LINE_2 = "Screen smarter, rank faster, and hire with confidence.";
const LINE_3 = "Your recruiter workspace is ready.";
const BULLETS = [
  "Multi-candidate AI scoring with transparent insights",
  "Secure recruiter access with OTP-ready architecture",
] as const;

const TYPE_INTERVAL_MS = 30;

function useTypewriter(text: string, startDelayMs: number) {
  const [value, setValue] = useState("");

  useEffect(() => {
    let cursor = 0;
    const start = window.setTimeout(() => {
      const id = window.setInterval(() => {
        cursor += 1;
        setValue(text.slice(0, cursor));
        if (cursor >= text.length) {
          window.clearInterval(id);
        }
      }, TYPE_INTERVAL_MS);
    }, startDelayMs);

    return () => {
      window.clearTimeout(start);
    };
  }, [text, startDelayMs]);

  return value;
}

export function DashboardSplashIntro({ onDone }: { onDone: () => void }) {
  const line1 = useTypewriter(LINE_1, 120);
  const line2 = useTypewriter(LINE_2, 620);
  const line3 = useTypewriter(LINE_3, 1160);
  const bullet1 = useTypewriter(BULLETS[0], 1680);
  const bullet2 = useTypewriter(BULLETS[1], 2280);

  useEffect(() => {
    const id = window.setTimeout(onDone, 3800);
    return () => window.clearTimeout(id);
  }, [onDone]);

  const showBullets = useMemo(() => line3.length > 0, [line3.length]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#111827] px-6 text-white"
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-4xl font-bold tracking-tight md:text-5xl">{line1}</p>
        <p className="mt-4 text-base text-slate-200 md:text-xl">{line2}</p>
        <p className="mt-2 text-sm text-slate-300 md:text-lg">{line3}</p>

        {showBullets ? (
          <ul className="mt-7 space-y-3">
            <li className="text-sm text-slate-100 md:text-base">- {bullet1}</li>
            <li className="text-sm text-slate-100 md:text-base">- {bullet2}</li>
          </ul>
        ) : null}
      </div>
    </motion.div>
  );
}
