import type { Metadata } from "next";
import Link from "next/link";
import { programs } from "@/data/programs";
import { InstantAdmissionCheck } from "@/components/landing/instant-admission-check";

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
  return <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${light ? "landing-label-light" : "landing-label"}`}>{children}</p>;
}

export default function Home() {
  const verificationMessage = verificationDates.length === 1
    ? `Current program records share a verification date of ${verificationDates[0]}.`
    : verificationDates.length > 1
      ? "Verification dates vary by program. Each detail page shows its own source state."
      : "Program records link to official university sources where available.";

  return (
    <main className="landing-shell overflow-clip">
      <header className="landing-nav sticky top-0 z-50 border-b border-black/15 bg-[rgba(240,237,234,.92)] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Fortech home" className="landing-nav-brand group inline-flex items-center gap-3 font-semibold tracking-[-0.03em] text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-accent)]">
            <span className="landing-brand-mark flex size-9 items-center justify-center rounded-full bg-forest-900 text-sm font-bold text-white">F</span>
            <span className="text-lg">Fortech</span>
          </Link>
          <nav aria-label="Landing navigation" className="flex items-center gap-2 sm:gap-6">
            <a href="#journey" className="landing-nav-link hidden text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-accent)] sm:inline">How it works</a>
            <a href="#why-fortech" className="landing-nav-link hidden text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-accent)] md:inline">Why Fortech</a>
            <Link href="/onboarding" className="landing-button inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-accent)] sm:px-5">Start profile</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section: Positioning on Left, Working Instant Admission Check on Right */}
      <section id="instant-check" className="relative border-b border-black/10 px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-10">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="landing-hero-meta flex items-center justify-between gap-5">
            <Label>01 / Instant admission check</Label>
            <p className="hidden text-sm text-[var(--landing-muted)] sm:block">100% deterministic · Real university facts</p>
          </div>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(18rem,.85fr)_minmax(0,1.15fr)] lg:gap-14 xl:gap-20">
            {/* Left Column: Concise Positioning */}
            <div className="landing-hero-copy lg:sticky lg:top-28">
              <h1 aria-label="Know where you stand. Know what to do next." className="text-[clamp(2.8rem,6.5vw,5.5rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-forest-900">
                <span>
                  <span className="block">Know where</span>
                  <span className="block">you stand. <span className="relative inline-block"><span className="relative z-10">Know what</span><span className="absolute inset-x-0 bottom-[.03em] h-[.17em] -rotate-1 bg-sand-300" /></span></span>
                  <span className="block">to do next.</span>
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-7 text-[var(--landing-muted)] sm:text-xl sm:leading-8">
                Choose a real target program and compare its verified requirements with the information you already know today.
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">✓</span>
                  <span><strong>Official requirements:</strong> Real published thresholds, never guessed</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">✓</span>
                  <span><strong>Deterministic gap analysis:</strong> Exact score comparisons in seconds</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">✓</span>
                  <span><strong>Unknown stays unknown:</strong> Missing scores are never treated as failure</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="font-semibold text-forest-900">{coverage.programs} programs</span>
                <span>·</span>
                <span className="font-semibold text-forest-900">{coverage.universities} universities</span>
                <span>·</span>
                <span className="font-semibold text-forest-900">{coverage.countries} countries</span>
              </div>
            </div>

            {/* Right Column: Interactive Instant Admission Check */}
            <div className="landing-preview-enter w-full">
              <InstantAdmissionCheck />
            </div>
          </div>
        </div>
      </section>

      {/* Section 02: Product Loop ("How it works") */}
      <section id="journey" className="scroll-mt-20 border-b border-black/15 bg-[var(--landing-surface)] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-32">
        <div className="mx-auto grid w-full max-w-[1600px] gap-12 lg:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)] lg:gap-20">
          <div className="landing-reveal-mask lg:sticky lg:top-28 lg:self-start">
            <Label>02 / One connected journey</Label>
            <h2 className="mt-6 max-w-xl text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-forest-900">From uncertainty to a next move.</h2>
            <p className="mt-6 max-w-md text-base leading-7 text-ink/70 sm:text-lg">Every stage feeds the next. Your current profile and chosen program remain the single source of truth.</p>
          </div>

          <ol className="border-t border-black/20">
            {journey.map(([number, title, detail]) => (
              <li key={number} className="landing-journey-step landing-reveal group grid gap-4 border-b border-black/20 py-7 sm:grid-cols-[4rem_minmax(0,.75fr)_minmax(0,1fr)] sm:py-10">
                <span className="font-mono text-sm text-forest-600">{number}</span>
                <h3 className="text-xl font-semibold leading-7 tracking-[-0.03em] text-forest-900 transition-transform duration-300 group-hover:translate-x-1.5 sm:text-2xl">{title}</h3>
                <p className="max-w-lg leading-6 text-ink/65 text-sm sm:text-base">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 03: The Trust Model */}
      <section id="why-fortech" className="landing-trust scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-32">
        <div className="landing-trust-inner mx-auto w-full max-w-[1600px]">
          <Label light>03 / The trust model</Label>
          <h2 className="landing-reveal-mask mt-6 max-w-[1400px] text-[clamp(2.8rem,7.5vw,7rem)] font-semibold leading-[0.88] tracking-[-0.065em]">
            Facts first.<br /><span className="text-sand-300">AI explains them.</span>
          </h2>

          <div className="mt-14 grid border-t border-white/20 lg:grid-cols-2">
            <article className="landing-reveal border-b border-white/20 py-8 lg:border-b-0 lg:border-r lg:pr-16">
              <p className="font-mono text-xs text-forest-100">01 / DETERMINISTIC</p>
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.035em] sm:text-4xl">Admission facts stay fixed.</h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-forest-100 sm:text-lg">
                Eligibility, Fit Score, data coverage, requirement states, and roadmap priorities come from deterministic logic and structured program records.
              </p>
            </article>
            <article className="landing-reveal py-8 lg:pl-16">
              <p className="font-mono text-xs text-forest-100">02 / AI-ASSISTED</p>
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.035em] sm:text-4xl">Explanations become easier to use.</h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-forest-100 sm:text-lg">
                AI rewrites complex admissions reasoning into clear language. It cannot add requirements, change scores, or fabricate acceptance likelihood.
              </p>
            </article>
          </div>

          <div className="mt-12 rounded-xl border border-white/20 bg-white/5 p-5 text-sm sm:text-base leading-6 text-forest-100">
            <strong>Fit Score measures profile alignment, not admission probability.</strong> Missing facts never become automatic passes, failures, or estimates.
          </div>
        </div>
      </section>

      {/* Section 04: Short Final CTA */}
      <section className="landing-cta-section px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <div className="relative z-10 mx-auto w-full max-w-[1600px]">
          <Label>04 / Your next step</Label>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
            <div>
              <h2 className="landing-reveal-mask max-w-4xl text-[clamp(2.5rem,6.5vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-forest-900">
                Know where you stand.<br />Leave with a plan.
              </h2>
              <p className="mt-4 max-w-xl text-base text-forest-900/80 sm:text-lg">
                Start with a target above, or jump straight into building your complete admission profile.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#instant-check" className="landing-button landing-reveal inline-flex min-h-14 items-center justify-center rounded-full px-7 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Check target now <span aria-hidden="true" className="landing-button-arrow ml-3">↑</span>
              </a>
              <Link href="/onboarding" className="inline-flex min-h-14 items-center justify-center rounded-full border border-forest-900/30 px-7 text-base font-semibold text-forest-900 hover:border-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Full onboarding flow →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="landing-reveal mx-auto grid w-full max-w-[1600px] gap-12 lg:grid-cols-[minmax(0,1fr)_repeat(2,minmax(10rem,.35fr))]">
          <div>
            <Link href="/" aria-label="Fortech home" className="inline-flex items-center gap-3 text-2xl font-semibold tracking-[-0.04em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <span className="flex size-10 items-center justify-center rounded-full bg-white text-sm font-bold text-forest-900">F</span>Fortech
            </Link>
            <p className="mt-6 max-w-lg text-sm leading-6 text-forest-100">Know where you stand. Understand why. Know what to do next.</p>
          </div>
          <nav aria-label="Footer navigation">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-100">Explore</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm">
              <a href="#journey" className="landing-footer-link">How it works</a>
              <a href="#why-fortech" className="landing-footer-link">Why Fortech</a>
              <Link href="/onboarding" className="landing-footer-link">Start profile</Link>
            </div>
          </nav>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-100">Data context</p>
            <p className="mt-4 text-sm leading-6 text-forest-100">{verificationMessage}</p>
            <p className="mt-3 text-xs leading-5 text-forest-100/75">Built for the LOCUS Startup Hackathon 2026.</p>
          </div>
        </div>
        <p className="mx-auto mt-14 w-full max-w-[1600px] border-t border-white/15 pt-6 text-xs text-forest-100/70">Fortech supports decisions; universities make admission decisions.</p>
      </footer>
    </main>
  );
}
