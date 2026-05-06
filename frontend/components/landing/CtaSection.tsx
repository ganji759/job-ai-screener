export function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-[#1c2331] to-[#243040] py-24 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 tracking-tight">
          Ready to transform your hiring?
        </h2>
        <p className="text-lg text-white/70 max-w-md mx-auto mb-10">
          Join thousands of recruiters using HERON to screen smarter, rank faster, and build better teams.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#pricing"
            className="bg-white text-[#1c2331] font-bold px-9 py-4 rounded-xl hover:-translate-y-0.5 shadow-xl transition-all text-sm"
          >
            Start Your Free Trial →
          </a>
          <a
            href="#login"
            className="border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            Sign In to Dashboard
          </a>
        </div>
      </div>
    </section>
  );
}
