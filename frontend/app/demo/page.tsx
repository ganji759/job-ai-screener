import type { DemoFeature } from "../../types/landing";

const highlights: DemoFeature[] = [
  {
    emoji: "🤖",
    title: "Conversational AI Agent",
    description:
      "Watch the Gemini-powered agent chain tool calls autonomously — ingesting resumes, running screenings, and scheduling interviews through plain-language instructions.",
  },
  {
    emoji: "🎯",
    title: "Weighted Candidate Scoring",
    description:
      "See how every applicant is scored across five dimensions with a ranked shortlist, per-candidate strengths, gaps, hiring-risk labels, and must-have skills met vs. missing.",
  },
  {
    emoji: "📄",
    title: "Instant Resume Parsing",
    description:
      "Drop in a PDF or paste raw text and HERON extracts a fully structured profile — skills, experience, education, and projects — in seconds via pdfplumber and Gemini.",
  },
  {
    emoji: "📬",
    title: "One-Click Interview Scheduling",
    description:
      "Approve a candidate and the agent schedules the interview, selects the slot type, and sends a calendar invite — all from a single recruiter instruction in the chat.",
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900">
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center mb-12">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors mb-8"
          >
            ← Back to Home
          </a>
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Hiring Evaluation &amp; Ranking for Optimized Networks
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-5">
            See{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              HERON
            </span>{" "}
            in Action
          </h1>
          <p className="text-lg text-white/65 max-w-xl mx-auto leading-relaxed">
            Watch how HERON turns a pile of resumes and a job description into a ranked, explainable shortlist — in minutes, not days.
          </p>
        </div>

        <div className="relative bg-slate-900/70 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/40 mb-16">
          <div className="aspect-video w-full flex items-center justify-center bg-slate-950/60">
            {/* TODO: replace src with real demo video URL */}
            <video
              controls
              className="w-full h-full object-contain"
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%230f172a'/%3E%3Ccircle cx='640' cy='340' r='64' fill='%23334155'/%3E%3Cpolygon points='620,310 680,340 620,370' fill='%2394a3b8'/%3E%3Ctext x='640' y='440' font-family='sans-serif' font-size='22' fill='%2364748b' text-anchor='middle'%3EHERON Demo Video%3C/text%3E%3C/svg%3E"
            >
              <source src="" type="video/mp4" />
            </video>
          </div>
          <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-white font-bold text-sm">HERON Full Walkthrough</p>
              <p className="text-white/45 text-xs mt-0.5">Resume ingestion → AI screening → interview scheduling</p>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              5 min demo
            </span>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-extrabold text-white text-center mb-8">
            What you will see in the demo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {highlights.map((h) => (
              <div
                key={h.title}
                className="bg-slate-900/60 border border-white/10 rounded-2xl p-7 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="text-2xl mb-3" aria-hidden="true">{h.emoji}</div>
                <h3 className="text-white font-bold text-base mb-2">{h.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{h.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-indigo-500/30 rounded-3xl px-8 py-12 text-center">
          <h2 className="text-3xl font-black text-white mb-3">Ready to try it yourself?</h2>
          <p className="text-white/60 text-base mb-8 max-w-md mx-auto">
            Start your free 14-day trial and go from job post to ranked shortlist in under five minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/#pricing"
              className="bg-white text-blue-800 font-bold px-9 py-4 rounded-xl hover:-translate-y-0.5 shadow-xl transition-all text-sm"
            >
              Start Free Trial →
            </a>
            <a
              href="/"
              className="border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-sm"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
