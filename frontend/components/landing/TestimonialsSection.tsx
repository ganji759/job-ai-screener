import type { Testimonial } from "../../types/landing";

const testimonials: Testimonial[] = [
  {
    stars: 5,
    quote:
      "We cut our time-to-shortlist from 3 days to under 2 hours. The AI scoring is incredibly accurate and the transparency of the rankings has given our hiring managers real confidence.",
    name: "Amara Kamara",
    role: "Head of Talent, TechBridge Africa",
    initials: "AK",
    avatarGradient: "from-blue-600 to-indigo-600",
  },
  {
    stars: 5,
    quote:
      "The bulk CV upload feature alone saved us 20+ hours per week. We were drowning in applications — HERON made it effortless to surface the right candidates.",
    name: "Nadia Mukamurenzi",
    role: "Recruitment Lead, Kigali Tech Hub",
    initials: "NM",
    avatarGradient: "from-emerald-500 to-teal-500",
  },
  {
    stars: 5,
    quote:
      "Best investment we've made in our HR stack. The analytics dashboard has completely changed how we report to leadership on hiring pipeline health and DEI metrics.",
    name: "James Okonkwo",
    role: "VP People, Andela",
    initials: "JO",
    avatarGradient: "from-amber-500 to-red-500",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            Loved by recruiters across Africa
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            See what HR leaders are saying about how HERON transformed their hiring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
            >
              <div className="text-amber-400 text-lg mb-4" aria-label={`${t.stars} out of 5 stars`}>
                {"★".repeat(t.stars)}
              </div>
              <blockquote className="text-sm text-slate-600 leading-7 italic mb-5">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.avatarGradient} text-white font-black text-sm flex items-center justify-center shrink-0`}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
