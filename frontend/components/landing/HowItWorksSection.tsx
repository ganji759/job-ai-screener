import type { Step } from "../../types/landing";

const steps: Step[] = [
  {
    number: 1,
    title: "Create Job",
    description:
      "Define the role, required skills, and experience levels. Our AI learns what \"great\" looks like for your team.",
  },
  {
    number: 2,
    title: "Upload CVs",
    description:
      "Drop in hundreds of applications at once. PDF, Word, LinkedIn exports — we handle all formats automatically.",
  },
  {
    number: 3,
    title: "AI Ranks",
    description:
      "Our engine scores every candidate and surfaces the top matches with transparent reasoning and insights.",
  },
  {
    number: 4,
    title: "Hire Confidently",
    description:
      "Review ranked shortlists, schedule interviews, and make offers — all from your recruiter workspace.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-slate-900 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 border border-indigo-500/30">
            How It Works
          </span>
          <h2 className="text-4xl font-extrabold text-white mb-4">
            From job post to shortlist in minutes
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Our four-step workflow is designed to eliminate manual effort and surface the best candidates automatically.
          </p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" aria-hidden="true" />

          {steps.map((step) => (
            <div key={step.number} className="relative z-10 flex flex-col items-center text-center px-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-black flex items-center justify-center mb-5 border-4 border-slate-900 shadow-lg shadow-blue-600/40">
                {step.number}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
