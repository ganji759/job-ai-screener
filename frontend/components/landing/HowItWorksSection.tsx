import type { Step } from "../../types/landing";

const steps: Step[] = [
  {
    number: 1,
    title: "Post a Job",
    description:
      "Describe the role in plain language or paste a full job description. HERON's AI extracts required skills, experience levels, education requirements, and domain automatically — no manual forms to fill in.",
  },
  {
    number: 2,
    title: "Ingest Resumes",
    description:
      "Paste resume text, upload PDFs, or let the AI agent process bulk uploads. pdfplumber and Gemini extract structured profiles for every candidate and attach them to the right job in seconds.",
  },
  {
    number: 3,
    title: "Run AI Screening",
    description:
      "One command triggers a full screening run. Gemini scores every candidate across five weighted dimensions, ranks them by total score, and builds a shortlist with per-candidate strengths, gaps, and hiring-risk labels.",
  },
  {
    number: 4,
    title: "Review & Act",
    description:
      "Browse the ranked shortlist, approve or reject candidates, and instruct the agent to schedule interviews — all from your recruiter workspace. Invite emails with calendar attachments go out automatically.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#1c2331] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block bg-[#5b7fa6]/20 text-[#a8c4d8] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 border border-[#5b7fa6]/30">
            How It Works
          </span>
          <h2 className="text-4xl font-extrabold text-white mb-4">
            From job post to shortlist in minutes
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            HERON's four-step workflow eliminates manual screening and surfaces the best candidates automatically.
          </p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#5b7fa6] to-[#7b6fa6]" aria-hidden="true" />

          {steps.map((step) => (
            <div key={step.number} className="relative z-10 flex flex-col items-center text-center px-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5b7fa6] to-[#7b6fa6] text-white text-2xl font-black flex items-center justify-center mb-5 border-4 border-[#1c2331] shadow-lg shadow-[#5b7fa6]/40">
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
