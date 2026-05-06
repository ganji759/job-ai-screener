import type { Feature } from "../../types/landing";

const features: Feature[] = [
  {
    iconBg: "bg-blue-50",
    emoji: "🎯",
    title: "AI Candidate Scoring",
    description:
      "Multi-dimensional scoring engine ranks candidates against job requirements with full transparency on why each score was given — no black boxes.",
  },
  {
    iconBg: "bg-violet-50",
    emoji: "⚡",
    title: "Bulk CV Processing",
    description:
      "Upload hundreds of CVs at once. Our AI extracts, normalizes, and ranks candidates in seconds, cutting your screening time from days to minutes.",
  },
  {
    iconBg: "bg-green-50",
    emoji: "📊",
    title: "Transparent Insights",
    description:
      "Every ranking comes with detailed breakdowns — skills match, experience gaps, and growth potential — giving your team full confidence in every decision.",
  },
  {
    iconBg: "bg-orange-50",
    emoji: "🔐",
    title: "Secure OTP Architecture",
    description:
      "Enterprise-grade security with one-time password authentication, role-based access controls, and full audit trails for compliance and data protection.",
  },
  {
    iconBg: "bg-pink-50",
    emoji: "📬",
    title: "Automated Outreach",
    description:
      "Send personalized interview invitations and status updates automatically. Keep candidates engaged without adding to your recruiter's workload.",
  },
  {
    iconBg: "bg-teal-50",
    emoji: "📈",
    title: "Analytics Dashboard",
    description:
      "Track pipeline health, time-to-hire, source effectiveness, and DEI metrics in real time. Make data-driven improvements across your recruiting funnel.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-50 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Core Features
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            Everything you need to hire smarter
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            From bulk screening to transparent AI insights, Umurava AI HR gives your team the tools to make faster, better hiring decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="bg-white border border-slate-200 rounded-2xl p-9 hover:-translate-y-1 hover:shadow-2xl hover:border-blue-200 transition-all cursor-default"
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
