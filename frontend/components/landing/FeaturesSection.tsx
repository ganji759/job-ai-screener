import type { Feature } from "../../types/landing";

const features: Feature[] = [
  {
    iconBg: "bg-blue-50",
    emoji: "🤖",
    title: "Conversational AI Agent",
    description:
      "A Gemini-powered hiring assistant that chains tool calls autonomously — list jobs, ingest resumes, run screenings, and schedule interviews through natural language without ever leaving the chat.",
  },
  {
    iconBg: "bg-violet-50",
    emoji: "📄",
    title: "Intelligent Resume Ingestion",
    description:
      "Paste or upload PDFs and the AI extracts structured profiles in seconds via pdfplumber + Gemini. Skills, experience, education, and projects are normalised into a searchable candidate record automatically.",
  },
  {
    iconBg: "bg-green-50",
    emoji: "🎯",
    title: "Weighted AI Candidate Scoring",
    description:
      "Every candidate is scored against a five-dimension rubric — skills match (35%), experience (25%), education (15%), role relevance (15%), and additional assets (10%) — with a ranked shortlist of up to 20 candidates returned per run.",
  },
  {
    iconBg: "bg-orange-50",
    emoji: "🔍",
    title: "Explainable Shortlists",
    description:
      "Each ranked candidate comes with concrete strengths, actionable gaps, a hiring-risk level, must-have skills met vs. missing, and an estimated onboarding time — so every decision is transparent and defensible.",
  },
  {
    iconBg: "bg-pink-50",
    emoji: "📬",
    title: "Automated Interview Scheduling",
    description:
      "The agent schedules video, phone, or in-person interviews, sends calendar invites to candidates via email, and tracks slot confirmations — all triggered by a single recruiter instruction.",
  },
  {
    iconBg: "bg-teal-50",
    emoji: "📊",
    title: "Pool Insights & Benchmarking",
    description:
      "After screening, HERON analyses the full applicant pool: score distribution, top skills found, skill gaps, recommended salary range, and an estimated time-to-fill based on real industry trends.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-50 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-[#f0f4f8] text-[#5b7fa6] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Core Features
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            Everything you need to hire smarter
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            From AI-driven resume parsing to explainable shortlists, HERON gives your team the tools to make faster, better hiring decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="bg-white border border-slate-200 rounded-2xl p-9 hover:-translate-y-1 hover:shadow-2xl hover:border-[#8fa3b8] transition-all cursor-default"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 ${feature.iconBg}`}
                aria-hidden="true"
              >
                {feature.emoji}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2.5">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
