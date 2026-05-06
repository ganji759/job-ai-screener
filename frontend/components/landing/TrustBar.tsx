export function TrustBar() {
  const companies = ["ANDELA", "TECHBRIDGE", "RECRUIT PRO", "TALENT HUB", "KIGALI TECH", "HR CONNECT"];

  return (
    <section className="bg-white border-y border-slate-100 py-12 px-6">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-7">
        Trusted by leading companies across Africa &amp; beyond
      </p>
      <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 max-w-4xl mx-auto">
        {companies.map((name) => (
          <span key={name} className="text-base font-black text-[#8fa3b8] tracking-tight">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
