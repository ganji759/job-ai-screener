export function HeroSection() {
  const stats = [
    { number: "10x", label: "Faster Screening" },
    { number: "94%", label: "Placement Accuracy" },
    { number: "3,200+", label: "Candidates Ranked" },
    { number: "60%", label: "Cost Reduction" },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen bg-gradient-to-br from-[#1c2331] via-[#1e2a3a] to-[#243040] flex items-center overflow-hidden"
    >
      {/* Background blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#5b7fa6]/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-[#9b8ec4]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-[#c4704a]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl mx-auto text-center pt-28 pb-20 px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#5b7fa6]/20 border border-[#5b7fa6]/40 text-[#a8c4d8] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a8c4d8] animate-pulse" />
          Hiring Evaluation &amp; Ranking for Optimized Networks
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6">
          Hire Smarter.{" "}
          <span className="bg-gradient-to-r from-[#a8c4d8] via-[#c4b8d8] to-[#d4a898] bg-clip-text text-transparent">
            Faster.
          </span>
          <br />
          Build Better Teams.
        </h1>

        {/* Subheading */}
        <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed mb-10">
          HERON automates candidate screening, delivers transparent AI scoring, and empowers recruiters to make data-driven decisions — in minutes, not days.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#pricing"
            className="bg-white text-[#1c2331] font-bold px-9 py-4 rounded-xl hover:-translate-y-0.5 shadow-xl transition-all text-sm"
          >
            Start Free 14-Day Trial →
          </a>
          <a
            href="/demo"
            className="border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            ▶ Watch Demo
          </a>
        </div>

        {/* Stats bar */}
        <div className="pt-12 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-black text-[#d4a898]">{stat.number}</div>
                <div className="text-xs text-white/55 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
