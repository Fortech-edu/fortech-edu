"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";

const navLinks = [
  { href: "/diagnosis", label: "Diagnosis" },
  { href: "/matches", label: "Matches" },
  { href: "/roadmap", label: "Roadmap" },
];

export function ProductShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <main className="product-shell flex min-h-dvh flex-col bg-[#F5F9FF] text-[#10233F]">
      {/* 64px Desktop Header */}
      <header className="product-header sticky top-0 z-50 border-b border-[#D7E7FA] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <Brand />

          {/* Desktop Navigation */}
          <nav aria-label="Product navigation" className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`product-nav-link text-sm font-semibold transition-colors py-2 ${
                    active
                      ? "text-[#1677FF] relative after:absolute after:-bottom-[19px] after:inset-x-0 after:h-0.5 after:bg-[#1677FF]"
                      : "text-[#64748B] hover:text-[#10233F]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Profile action and mobile navigation */}
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className={`inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold transition shadow-xs ${
                isActive("/onboarding")
                  ? "bg-[#1677FF] text-white"
                  : "bg-white text-[#10233F] border border-[#B7D2F0] hover:bg-[#EDF4FD]"
              }`}
            >
              Profile
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex size-9 items-center justify-center rounded-lg border border-[#D7E7FA] text-[#10233F] hover:bg-[#EDF4FD] transition"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <span className="text-base font-bold">✕</span>
              ) : (
                <span className="text-lg leading-none font-bold">☰</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="sm:hidden border-t border-[#D7E7FA] bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150"
          >
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#EDF4FD] text-[#1677FF]"
                      : "text-[#64748B] hover:bg-[#F5F9FF] hover:text-[#10233F]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <div className="product-page mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-6 sm:px-8 sm:pt-10 lg:pb-28">
        {children}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#D7E7FA] bg-white px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 text-xs text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
          <p>Fortech supports decisions; universities make admission decisions.</p>
          <Link
            href="/"
            className="product-text-link font-semibold text-[#1677FF] hover:underline"
          >
            Return to landing
          </Link>
        </div>
      </footer>
    </main>
  );
}
