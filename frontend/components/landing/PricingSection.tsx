import type { PricingPlan } from "../../types/landing";

const plans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    period: "Free forever",
    desc: "Perfect for small teams getting started with AI-powered recruiting.",
    features: [
      { included: true, text: "Up to 3 active job postings" },
      { included: true, text: "50 CV uploads/month" },
      { included: true, text: "Basic AI scoring" },
      { included: true, text: "Email support" },
      { included: false, text: "Advanced analytics" },
      { included: false, text: "Custom scoring models" },
      { included: false, text: "API access" },
    ],
    cta: "Get Started Free",
    ctaStyle: "outline",
  },
  {
    name: "Professional",
    price: "$79",
    period: "per month, billed annually",
    desc: "For growing teams that need more power, more insights, and faster hiring.",
    features: [
      { included: true, text: "Unlimited active job postings" },
      { included: true, text: "500 CV uploads/month" },
      { included: true, text: "Advanced AI scoring + insights" },
      { included: true, text: "Full analytics dashboard" },
      { included: true, text: "Automated candidate outreach" },
      { included: true, text: "Priority support (24h SLA)" },
      { included: false, text: "API access" },
    ],
    cta: "Start 14-Day Free Trial",
    ctaStyle: "filled",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored to your scale",
    desc: "For large organisations with high-volume hiring and compliance requirements.",
    features: [
      { included: true, text: "Unlimited everything" },
      { included: true, text: "Custom AI scoring models" },
      { included: true, text: "Full API access & webhooks" },
      { included: true, text: "SSO / SAML integration" },
      { included: true, text: "Dedicated account manager" },
      { included: true, text: "SLA-backed uptime (99.9%)" },
      { included: true, text: "Custom data retention policy" },
    ],
    cta: "Contact Sales →",
    ctaStyle: "dark",
  },
];

function ctaClass(style: PricingPlan["ctaStyle"]) {
  if (style === "filled")
    return "w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/40 hover:shadow-blue-600/60 transition-all text-center block";
  if (style === "dark")
    return "w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-center block";
  return "w-full py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-blue-600 hover:text-blue-600 transition-all text-center block";
}

export function PricingSection() {
  return (
    <section id="pricing" className="bg-slate-50 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Pricing
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Start free, scale when you&apos;re ready. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white border-2 rounded-3xl p-10 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl ${
                plan.featured
                  ? "border-blue-600 shadow-blue-600/20 shadow-xl scale-[1.03]"
                  : "border-slate-200"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-px right-7 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-b-xl">
                  Most Popular
                </div>
              )}

              <p
                className={`text-xs font-bold uppercase tracking-widest mb-3 ${
                  plan.featured ? "text-blue-600" : "text-slate-500"
                }`}
              >
                {plan.name}
              </p>
              <div className="text-5xl font-black text-slate-900 leading-none mb-1">{plan.price}</div>
              <p className="text-sm text-slate-400 mb-4">{plan.period}</p>
              <p className="text-sm text-slate-600 mb-8 leading-relaxed">{plan.desc}</p>

              <ul className="space-y-3 mb-8" aria-label={`${plan.name} plan features`}>
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-3">
                    <span
                      className={`shrink-0 font-bold text-base leading-5 ${
                        f.included ? "text-green-500" : "text-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      {f.included ? "✓" : "–"}
                    </span>
                    <span
                      className={`text-sm ${f.included ? "text-slate-700" : "text-slate-400"}`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a href="#login" className={ctaClass(plan.ctaStyle)}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
