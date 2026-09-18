import type { Metadata } from "next";
import Link from "next/link";
import { programs } from "@/data/programs";
import { InstantAdmissionCheck } from "@/components/landing/instant-admission-check";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Fortech | Know where you stand",
  description: "Check your admission position instantly with verified university requirements and deterministic gap diagnosis.",
};

const verificationDates = [...new Set(programs.flatMap(({ verificationDate }) => verificationDate ? [verificationDate] : []))];
const coverage = {
  programs: programs.length,
  universities: new Set(programs.map(({ universityName }) => universityName)).size,
  countries: new Set(programs.flatMap(({ country }) => country?.trim() ? [country.trim()] : [])).size,
};

const journey = [
  ["01", "Target & requirements", "Choose a real university program and review its published admission criteria first."],
  ["02", "Current state", "Enter only the scores and grades you know today; blank values remain unknown."],
  ["03", "Instant diagnosis", "See confirmed gaps, items needing verification, and your immediate recommended action."],
  ["04", "Missing details", "Add your target intake, tuition budget, and preferences to complete your profile."],
  ["05", "Priority roadmap", "Leave with a deterministic, priority-ordered action plan tailored to your target."],
] as const;

function Label({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${light ? "text-[#38BDF8]" : "text-[#1677FF]"}`}>
      {children}
    </p>
  );
}

export default function Home() {
  const verificationMessage = verificationDates.length === 1
    ? `Current program records share a verification date of ${verificationDates[0]}.`
    : verificationDates.length > 1
      ? "Verification dates vary by program. Each detail page shows its own source state."
      : "Program records link to official university sources where available.";

  return (
    <main className="landing-shell overflow-clip bg-[#F5F9FF] text-[#10233F]">
      {/* 64px Deep Navy Header */}
      <header className="landing-nav sticky top-0 z-50 border-b border-white/10 bg-[#081A33]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <Brand variant="on-dark" />
          <nav aria-label="Landing navigation" className="flex items-center gap-3 sm:gap-6">
            <a
              href="#journey"
              className="landing-nav-link hidden text-sm font-medium text-[#9FB6D9] hover:text-white transition-colors sm:inline"
            >
              How it works
            </a>
            <a
              href="#why-fortech"
              className="landing-nav-link hidden text-sm font-medium text-[#9FB6D9] hover:text-white transition-colors md:inline"
            >
              Why Fortech
            </a>

            <Link
              href="/onboarding"
              className="landing-button inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold sm:text-sm"
            >
              Start profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section: Premium Deep Navy Background with Signature Restrained Ambient Glow */}
      <section
        id="instant-check"
        className="relative landing-hero-bg border-b border-white/10 px-4 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-10 lg:pb-24 lg:pt-16 text-white"
      >
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="landing-hero-meta flex items-center justify-between gap-4">
            <Label light>01 / Instant admission check</Label>
            <p className="hidden text-xs text-[#9FB6D9] sm:block">100% deterministic · Real university facts</p>
          </div>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(18rem,.88fr)_minmax(0,1.12fr)] lg:gap-12 xl:gap-16">
            {/* Left Column: Clear positioning without hype */}
            <div className="landing-hero-copy lg:sticky lg:top-28">
              <h1
                aria-label="Know where you stand. Know what to do next."
                className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white"
              >
                <span>
                  <span className="block">Know where</span>
                  <span className="block">you stand.</span>
                  <span className="block text-[#38BDF8] mt-1">Know what to do next.</span>
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#9FB6D9] sm:text-lg">
                Choose a real target program and compare its verified requirements with the information you already know today.
              </p>

              <div className="mt-8 space-y-3.5">
                <div className="flex items-start gap-3 text-sm text-[#FFFFFF]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-[#1677FF]/40 bg-[#0E2647] text-xs font-bold text-[#38BDF8] mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Official requirements:</strong> Real published thresholds, never guessed
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#FFFFFF]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-[#1677FF]/40 bg-[#0E2647] text-xs font-bold text-[#38BDF8] mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Deterministic gap analysis:</strong> Exact score comparisons in seconds
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#FFFFFF]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-[#1677FF]/40 bg-[#0E2647] text-xs font-bold text-[#38BDF8] mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Unknown stays unknown:</strong> Missing scores are never treated as failure
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[#9FB6D9] border-t border-white/10 pt-6">
                <span className="font-semibold text-white">{coverage.programs} programs</span>
                <span>·</span>
                <span className="font-semibold text-white">{coverage.universities} universities</span>
                <span>·</span>
                <span className="font-semibold text-white">{coverage.countries} countries</span>
              </div>
            </div>

            {/* Right Column: Interactive Instant Admission Check Card */}
            <div className="landing-preview-enter w-full">
              <InstantAdmissionCheck />
            </div>
          </div>
        </div>
      </section>

      {/* Section 02: One Connected Journey ("How it works") */}
      <section id="journey" className="editorial-reveal scroll-mt-16 border-b border-[#D7E7FA] bg-white px-4 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Label>02 / One connected journey</Label>
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight text-[#10233F] sm:text-4xl lg:text-5xl leading-[1.1]">
              From uncertainty to a next move.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[#64748B]">
              Every stage feeds the next. Your current profile and chosen program remain the single source of truth.
            </p>
          </div>

          <ol className="border-t border-[#D7E7FA]">
            {journey.map(([number, title, detail]) => (
              <li
                key={number}
                className="group grid gap-3 border-b border-[#D7E7FA] py-6 sm:grid-cols-[3.5rem_minmax(0,.75fr)_minmax(0,1fr)] sm:py-8 transition-colors hover:bg-[#F5F9FF]/60 px-2 rounded-lg"
              >
                <span className="font-mono text-sm font-semibold text-[#1677FF]">{number}</span>
                <h3 className="text-lg font-bold text-[#10233F] sm:text-xl tracking-tight">
                  {title}
                </h3>
                <p className="max-w-lg text-sm sm:text-base leading-relaxed text-[#64748B]">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 03: The Trust Model ("Why Fortech") */}
      <section id="why-fortech" className="editorial-reveal scroll-mt-16 bg-[#081A33] px-4 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28 text-white">
        <div className="mx-auto w-full max-w-[1440px]">
          <Label light>03 / The trust model</Label>
          <h2 className="mt-4 max-w-4xl text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Facts first.<br />
            <span className="text-[#38BDF8]">AI explains them.</span>
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-[#0E2647] p-6 sm:p-8 shadow-card">
              <p className="font-mono text-xs font-semibold text-[#38BDF8]">01 / DETERMINISTIC</p>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Admission facts stay fixed.
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#9FB6D9]">
                Eligibility, Fit Score, data coverage, requirement states, and roadmap priorities come from deterministic logic and structured program records.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#0E2647] p-6 sm:p-8 shadow-card">
              <p className="font-mono text-xs font-semibold text-[#38BDF8]">02 / AI-ASSISTED</p>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Explanations become easier to use.
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#9FB6D9]">
                AI rewrites complex admissions reasoning into clear language. It cannot add requirements, change scores, or fabricate acceptance likelihood.
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-xl border border-white/15 bg-white/5 p-5 text-sm sm:text-base leading-relaxed text-[#9FB6D9]">
            <strong className="text-white">Fit Score measures profile alignment, not admission probability.</strong> Missing facts never become automatic passes, failures, or estimates.
          </div>
        </div>
      </section>

      {/* Section 04: Next Step CTA */}
      <section className="editorial-reveal bg-[#F5F9FF] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="rounded-2xl border border-[#D7E7FA] bg-white p-8 sm:p-12 lg:p-16 shadow-card">
            <Label>04 / Your next step</Label>
            <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#10233F] sm:text-4xl lg:text-5xl leading-[1.1]">
                  Know where you stand.<br />Leave with a plan.
                </h2>
                <p className="mt-4 max-w-xl text-base text-[#64748B] sm:text-lg">
                  Start with a target above, or jump straight into building your complete admission profile.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#instant-check"
                  className="landing-button inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold shadow-xs"
                >
                  Check target now <span aria-hidden="true" className="landing-button-arrow ml-2">↑</span>
                </a>
                <Link
                  href="/onboarding"
                  className="landing-button-secondary inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold"
                >
                  Full onboarding flow →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#081A33] px-4 py-12 sm:px-8 text-white">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,1fr)_repeat(2,minmax(10rem,.35fr))]">
          <div>
            <Brand variant="on-dark" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#9FB6D9]">
              Know where you stand. Understand why. Know what to do next.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38BDF8]">Explore</p>
            <div className="mt-3 flex flex-col items-start gap-2.5 text-sm text-[#9FB6D9]">
              <a href="#journey" className="hover:text-white transition-colors">How it works</a>
              <a href="#why-fortech" className="hover:text-white transition-colors">Why Fortech</a>
              <Link href="/onboarding" className="hover:text-white transition-colors">Start profile</Link>
            </div>
          </nav>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#38BDF8]">Data context</p>
            <p className="mt-3 text-sm leading-relaxed text-[#9FB6D9]">{verificationMessage}</p>
            <p className="mt-2 text-xs text-[#9FB6D9]/70">Built for the LOCUS Startup Hackathon 2026.</p>
          </div>
        </div>
        <div className="mx-auto mt-10 w-full max-w-[1440px] border-t border-white/10 pt-6 text-xs text-[#9FB6D9]/70">
          Fortech supports decisions; universities make admission decisions.
        </div>
      </footer>
    </main>
  );
}
