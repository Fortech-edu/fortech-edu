import type { Metadata } from "next";
import Link from "next/link";
import { programs } from "@/data/programs";

export const metadata: Metadata = {
  title: "Fortech | Know where you stand",
  description: "Build your profile, understand your admission position, compare programs, and leave with a program-specific roadmap.",
};

const verificationDates = [...new Set(programs.flatMap(({ verificationDate }) => verificationDate ? [verificationDate] : []))];
const coverage = {
  programs: programs.length,
  universities: new Set(programs.map(({ universityName }) => universityName)).size,
  countries: new Set(programs.flatMap(({ country }) => country?.trim() ? [country.trim()] : [])).size,
};
const previewProgram = programs.find(({ id }) => id === "lut-software-systems-engineering")!;

const journey = [
  ["01", "Build your profile", "Set your study direction, add the scores you know, and leave unknown information blank."],
  ["02", "Understand your position", "See strengths, missing information, and the highest-value details to resolve next."],
  ["03", "Discover matching programs", "Review current matches ranked by deterministic eligibility, Fit Score, and data coverage."],
  ["04", "Compare requirements", "Read program facts criterion by criterion without winner labels or hidden assumptions."],
  ["05", "Build your roadmap", "Turn the selected program’s known gaps and verification needs into NOW, PREPARE, and APPLY."],
] as const;

const comparisonRows = [
  ["Eligibility", "Needs verification", "status"],
  ["IELTS", `${previewProgram.ieltsRequirement?.minimumScore ?? "Unknown"} minimum`, "known"],
  ["Academic", "Qualification-specific", "verify"],
  ["SAT", previewProgram.satRequirement?.isRequired === false ? "Not required" : "Needs verification", "neutral"],
] as const;

const roadmapPreview = [
  ["NOW", "Verify academic criteria", "Check how your school qualification is evaluated."],
  ["PREPARE", "Confirm application documents", "Use the official admissions source before assembling materials."],
  ["APPLY", "Recheck the final deadline", previewProgram.deadline ?? "Confirm the deadline on the official page."],
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

      <section className="relative min-h-[calc(100svh-72px)] border-b border-black/10 px-5 pb-8 pt-8 sm:px-8 sm:pb-12 sm:pt-10 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100svh-120px)] w-full max-w-[1600px] flex-col">
          <div className="landing-hero-meta flex items-center justify-between gap-5">
            <Label>01 / Admission clarity</Label>
            <p className="hidden text-sm text-[var(--landing-muted)] sm:block">Built for students choosing their next move.</p>
          </div>

          <h1 aria-label="Know where you stand. Know what to do next." className="mt-8 max-w-[1450px] text-[clamp(3.4rem,10.4vw,9.4rem)] font-semibold leading-[0.84] tracking-[-0.075em] text-forest-900">
            <span aria-hidden="true">
              <span className="landing-hero-line"><span className="landing-hero-line-inner">Know where</span></span>
              <span className="landing-hero-line"><span className="landing-hero-line-inner">you stand. <span className="relative inline-block"><span className="relative z-10">Know what</span><span className="absolute inset-x-0 bottom-[.03em] h-[.17em] -rotate-1 bg-sand-300" /></span></span></span>
              <span className="landing-hero-line"><span className="landing-hero-line-inner">to do next.</span></span>
            </span>
          </h1>

          <div className="mt-auto grid gap-8 pt-10 lg:grid-cols-[minmax(18rem,.7fr)_minmax(0,1.3fr)] lg:items-end lg:gap-16">
            <div className="landing-hero-copy max-w-xl">
              <p className="text-lg leading-7 text-[var(--landing-muted)] sm:text-xl sm:leading-8">Build your profile, understand the facts behind every match, and leave with a plan for one real program.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/onboarding" className="landing-button inline-flex min-h-14 items-center justify-center rounded-full px-7 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-accent)]">Build my profile <span aria-hidden="true" className="landing-button-arrow ml-3">↗</span></Link>
                <a href="#journey" className="landing-text-link inline-flex min-h-12 items-center justify-center px-5 text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-accent)]">See how it works</a>
              </div>
            </div>

            <div className="landing-preview-enter relative lg:translate-y-6" aria-label="Fortech product preview using current program facts">
              <div className="landing-product-grid landing-preview-drift overflow-hidden rounded-[1.25rem] border border-black/15 bg-[var(--landing-surface)] shadow-[0_24px_70px_rgba(38,38,38,.12)]">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-forest-700"><span className="size-2 rounded-full bg-[var(--landing-accent-warm)]" /> Illustrative profile</div>
                  <span className="text-xs text-muted">Current program facts → Roadmap</span>
                </div>
                <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(14rem,.7fr)]">
                  <div className="p-4 sm:p-6">
                    <p className="text-xs font-semibold text-forest-600">{previewProgram.universityName}</p>
                    <h2 className="mt-1 max-w-xl text-xl font-semibold tracking-[-0.035em] text-forest-900 sm:text-3xl">{previewProgram.programName}</h2>
                    <div className="landing-preview-rows mt-5 border-y border-black/10">
                      {comparisonRows.map(([label, value, tone]) => (
                        <div key={label} className="landing-preview-row grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 border-b border-black/10 py-2.5 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
                          <span className="text-xs text-muted">{label}</span>
                          <strong className="text-sm font-semibold text-ink">{value}</strong>
                          <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:inline ${tone === "known" ? "bg-forest-100 text-forest-700" : tone === "verify" || tone === "status" ? "bg-sand-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>{tone === "known" ? "Known" : tone === "neutral" ? "Clear" : "Check"}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-muted">Fit Score measures profile alignment—not admission probability.</p>
                  </div>
                  <div className="border-t border-black/10 bg-forest-900 p-4 text-white sm:p-5 lg:border-l lg:border-t-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-forest-100">Next action</p>
                    <p className="mt-3 text-lg font-semibold leading-5">Verify academic criteria</p>
                    <div className="mt-5 space-y-3">
                      {["NOW", "PREPARE", "APPLY"].map((phase, index) => (
                        <div key={phase} className="landing-preview-phase flex items-center gap-3 border-t border-white/15 pt-3">
                          <span className={`size-2 rounded-full ${index === 0 ? "bg-[var(--landing-accent-warm)]" : "bg-white/25"}`} />
                          <span className="text-[10px] font-bold tracking-[0.16em] text-forest-100">{phase}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="journey" className="scroll-mt-20 border-b border-black/15 bg-[var(--landing-surface)] px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
        <div className="mx-auto grid w-full max-w-[1600px] gap-16 lg:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)] lg:gap-24">
          <div className="landing-reveal-mask lg:sticky lg:top-28 lg:self-start">
            <Label>02 / One connected journey</Label>
            <h2 className="mt-6 max-w-xl text-[clamp(3rem,6.4vw,6.5rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-forest-900">From uncertainty to a next move.</h2>
            <p className="mt-7 max-w-md text-lg leading-8 text-ink/65">Every stage feeds the next. Your current profile and chosen program remain the source of truth.</p>
          </div>

          <ol className="border-t border-black/20">
            {journey.map(([number, title, detail]) => (
              <li key={number} className="landing-journey-step landing-reveal group grid gap-5 border-b border-black/20 py-9 sm:grid-cols-[4rem_minmax(0,.75fr)_minmax(0,1fr)] sm:py-12">
                <span className="font-mono text-sm text-forest-600">{number}</span>
                <h3 className="text-2xl font-semibold leading-7 tracking-[-0.035em] text-forest-900 transition-transform duration-300 group-hover:translate-x-2 sm:text-3xl sm:leading-8">{title}</h3>
                <p className="max-w-lg leading-7 text-ink/65">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="why-fortech" className="landing-trust scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-0">
        <div className="landing-trust-inner mx-auto w-full max-w-[1600px]">
          <Label light>03 / The trust model</Label>
          <h2 className="landing-reveal-mask mt-8 max-w-[1400px] text-[clamp(3.7rem,9.5vw,9rem)] font-semibold leading-[0.86] tracking-[-0.075em]">Facts first.<br /><span className="text-sand-300">AI explains them.</span></h2>
          <div className="mt-20 grid border-t border-white/20 lg:grid-cols-2">
            <article className="landing-reveal border-b border-white/20 py-8 lg:border-b-0 lg:border-r lg:pr-16">
              <p className="font-mono text-xs text-forest-100">01 / DETERMINISTIC</p>
              <h3 className="mt-7 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Admission facts stay fixed.</h3>
              <p className="mt-5 max-w-xl text-lg leading-8 text-forest-100">Eligibility, Fit Score, data coverage, requirement states, and roadmap steps come from deterministic logic and structured program data.</p>
            </article>
            <article className="landing-reveal py-8 lg:pl-16">
              <p className="font-mono text-xs text-forest-100">02 / AI-ASSISTED</p>
              <h3 className="mt-7 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Explanations become easier to use.</h3>
              <p className="mt-5 max-w-xl text-lg leading-8 text-forest-100">AI may rewrite the explanation in clearer language. It cannot add requirements, change scores, or make an admission decision.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-black/15 bg-[var(--landing-page)] px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-end">
            <div className="landing-reveal-mask">
              <Label>04 / Explainable matching</Label>
              <h2 className="mt-6 max-w-3xl text-[clamp(3.2rem,7vw,7rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-forest-900">See the reason behind every result.</h2>
            </div>
            <p className="landing-reveal max-w-xl text-lg leading-8 text-ink/65 lg:justify-self-end">Fortech separates eligibility from profile alignment and tells you when the underlying data is known, unknown, or not comparable.</p>
          </div>

          <div className="landing-reveal-scale mt-16 overflow-hidden border-y border-black/20 bg-[var(--landing-surface)]">
            <div className="grid border-b border-black/15 px-4 py-4 text-[10px] font-bold uppercase tracking-[0.17em] text-muted sm:grid-cols-[minmax(9rem,.7fr)_repeat(3,minmax(0,1fr))] sm:px-7">
              <span>Decision signal</span><span className="hidden sm:block">Example profile</span><span className="hidden sm:block">Program</span><span className="hidden sm:block">State</span>
            </div>
            {[
              ["IELTS", "6.0", "6.5 minimum", "Action needed"],
              ["Academic", "GPA 3.5", "Qualification-specific", "Needs verification"],
              ["SAT", "Not provided", "Not required", "Not required"],
              ["Tuition", "USD budget", "EUR / year", "Not comparable"],
            ].map(([signal, profile, program, state]) => (
              <div key={signal} className="grid gap-3 border-b border-black/10 px-4 py-5 last:border-b-0 sm:grid-cols-[minmax(9rem,.7fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:px-7">
                <strong className="text-lg text-forest-900">{signal}</strong>
                <p className="text-sm"><span className="mr-2 text-[10px] font-bold uppercase tracking-wide text-muted sm:hidden">You</span>{profile}</p>
                <p className="text-sm"><span className="mr-2 text-[10px] font-bold uppercase tracking-wide text-muted sm:hidden">Program</span>{program}</p>
                <p><span className="inline-flex rounded-full bg-sand-100 px-3 py-1.5 text-xs font-bold text-amber-900">{state}</span></p>
              </div>
            ))}
          </div>

          <p className="landing-reveal mt-8 border-l-4 border-sand-300 pl-5 text-xl font-semibold leading-8 text-forest-900 sm:text-3xl sm:leading-10">Fit Score measures profile alignment, not admission probability.</p>
        </div>
      </section>

      <section className="landing-roadmap-section px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
        <div className="mx-auto w-full max-w-[1600px]">
          <Label>05 / From match to movement</Label>
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.6fr)] lg:items-end">
            <h2 className="landing-reveal-mask text-[clamp(3.5rem,8vw,8rem)] font-semibold leading-[0.87] tracking-[-0.07em] text-forest-900">A match matters when it tells you what to do next.</h2>
            <p className="landing-reveal text-lg leading-8 text-ink/65">Roadmaps are regenerated from your current profile and the selected program—never from generic task templates.</p>
          </div>

          <ol className="mt-16 grid border-t border-forest-900/25 lg:grid-cols-3">
            {roadmapPreview.map(([phase, title, detail], index) => (
              <li key={phase} className={`landing-roadmap-step landing-reveal min-h-72 border-b border-black/25 py-8 lg:border-b-0 lg:px-8 ${index > 0 ? "lg:border-l" : "lg:pl-0"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tracking-[0.18em] text-forest-700">{phase}</span>
                  <span className="text-sm text-forest-700">0{index + 1}</span>
                </div>
                <h3 className="mt-16 max-w-sm text-3xl font-semibold leading-8 tracking-[-0.04em] text-forest-900">{title}</h3>
                <p className="mt-4 max-w-sm leading-7 text-ink/65">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-black/15 bg-[var(--landing-surface)] px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,.65fr)_minmax(0,1.35fr)]">
            <div className="landing-reveal-mask">
              <Label>06 / Curated coverage</Label>
              <h2 className="mt-6 text-4xl font-semibold leading-[0.95] tracking-[-0.055em] text-forest-900 sm:text-6xl">Small enough to check.<br />Useful enough to act.</h2>
            </div>
            <dl className="border-t border-black/20">
              {[
                [coverage.programs, "programs", "Current structured records with official source links."],
                [coverage.universities, "universities", "A deliberate sample rather than a global catalogue."],
                [coverage.countries, "countries", "Coverage across the supported study directions."],
              ].map(([value, label, detail]) => (
                <div key={label} className="landing-reveal grid grid-cols-[6rem_minmax(0,1fr)] gap-5 border-b border-black/20 py-8 sm:grid-cols-[9rem_minmax(10rem,.6fr)_minmax(0,1fr)] sm:items-baseline">
                  <dt className="text-5xl font-semibold tracking-[-0.06em] text-forest-900 tabular-nums sm:text-7xl">{value}</dt>
                  <dd className="text-xl font-semibold text-forest-900 sm:text-2xl">{label}</dd>
                  <dd className="col-start-2 max-w-md text-sm leading-6 text-ink/60 sm:col-start-auto">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="landing-reveal mt-20 grid gap-8 border-t border-black/20 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="font-semibold text-forest-900">Bachelor-first</p><p className="mt-2 text-sm leading-6 text-muted">The current recommendation pool supports Bachelor programs.</p></div>
            <div><p className="font-semibold text-forest-900">Two directions</p><p className="mt-2 text-sm leading-6 text-muted">Computer Science and Business are supported today.</p></div>
            <div><p className="font-semibold text-forest-900">Official sources</p><p className="mt-2 text-sm leading-6 text-muted">Program pages retain their source titles, links, and verification state.</p></div>
            <div><p className="font-semibold text-forest-900">Unknown stays unknown</p><p className="mt-2 text-sm leading-6 text-muted">Missing facts never become automatic passes, failures, or estimates.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-cta-section px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
        <div className="relative z-10 mx-auto w-full max-w-[1600px]">
          <Label>07 / Your next step</Label>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
            <h2 className="landing-reveal-mask max-w-6xl text-[clamp(3.8rem,9vw,9rem)] font-semibold leading-[0.86] tracking-[-0.075em] text-forest-900">Build your profile.<br />Leave with a plan.</h2>
            <Link href="/onboarding" className="landing-button landing-reveal inline-flex min-h-16 items-center justify-center rounded-full px-8 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Start now <span aria-hidden="true" className="landing-button-arrow ml-4">↗</span></Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="landing-reveal mx-auto grid w-full max-w-[1600px] gap-12 lg:grid-cols-[minmax(0,1fr)_repeat(2,minmax(10rem,.35fr))]">
          <div>
            <Link href="/" aria-label="Fortech home" className="inline-flex items-center gap-3 text-2xl font-semibold tracking-[-0.04em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><span className="flex size-10 items-center justify-center rounded-full bg-white text-sm font-bold text-forest-900">F</span>Fortech</Link>
            <p className="mt-6 max-w-lg text-sm leading-6 text-forest-100">Know where you stand. Understand why. Know what to do next.</p>
          </div>
          <nav aria-label="Footer navigation">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-100">Explore</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm"><a href="#journey" className="landing-footer-link">How it works</a><a href="#why-fortech" className="landing-footer-link">Why Fortech</a><Link href="/onboarding" className="landing-footer-link">Start profile</Link></div>
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
