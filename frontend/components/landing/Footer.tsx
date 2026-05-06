export function Footer() {
  const links = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Blog", href: "#" },
    { label: "Docs", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <footer className="bg-slate-950 py-16 px-6 text-center">
      <a href="#home" className="inline-flex items-center gap-2 text-xl font-black text-white mb-8" aria-label="Umurava AI HR home">
        🤖 Umurava <span className="text-blue-400">AI HR</span>
      </a>

      <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-6 mb-8">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <p className="text-xs text-white/30">
        © 2026 Umurava AI HR. All rights reserved. Built with ❤️ for modern recruiters.
      </p>
    </footer>
  );
}
