"use client";

import { useState } from "react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 h-16 bg-slate-900/95 backdrop-blur-md border-b border-white/10"
    >
      <a href="#home" className="flex items-center gap-2 text-xl font-black text-white" aria-label="HERON home">
        🦢 <span className="text-white">HERON</span>
      </a>

      {/* Desktop nav */}
      <div className="hidden lg:flex items-center gap-8">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-white/75 hover:text-white text-sm font-medium transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Desktop CTA */}
      <div className="hidden lg:flex items-center gap-3">
        <a
          href="#login"
          className="px-5 py-2 rounded-xl border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-all"
        >
          Sign In
        </a>
        <a
          href="#pricing"
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/40 hover:-translate-y-px transition-all"
        >
          Start Free Trial
        </a>
      </div>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden text-white p-2"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
      >
        <span className="block w-5 h-0.5 bg-white mb-1 transition-all" />
        <span className="block w-5 h-0.5 bg-white mb-1 transition-all" />
        <span className="block w-5 h-0.5 bg-white transition-all" />
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-slate-900/98 backdrop-blur-md border-b border-white/10 px-6 py-4 flex flex-col gap-4 lg:hidden">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <a
              href="#login"
              onClick={() => setMobileOpen(false)}
              className="text-center py-2.5 rounded-xl border border-white/30 text-white text-sm font-medium"
            >
              Sign In
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
