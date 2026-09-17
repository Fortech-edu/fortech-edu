import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { programs } from "@/data/programs";

/**
 * Coverage is derived from the dataset, never typed by hand.
 * If a program is added or removed, the landing page stays truthful on its own.
 */
const coverage = {
  programs: programs.length,
  universities: new Set(programs.map((item) => item.universityName)).size,
  countries: new Set(programs.map((item) => item.country).filter(Boolean)).size,
  /** The two directions a student can pick in onboarding, not the finer program taxonomy. */
  directions: ["Computer Science", "Business"],
  verifiedOn: programs.find((item) => item.verificationDate)?.verificationDate ?? null,
};

const stats = [
  [String(coverage.programs), "verified programs", "Each one checked against the university's own pages."],
  [String(coverage.universities), "universities", "A curated sample, not a global catalogue."],
  [String(coverage.countries), "countries", "Where those programs are taught."],
] as const;

const steps = [
  ["01", "Tell us about yourself", "Share your goals, academics, budget, and timeline."],
  ["02", "See programs that match you", "Compare profile fit separately from admission eligibility."],
  ["03", "Get your admission roadmap", "Turn missing requirements into practical next actions."],
] as const;

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_right,#dcece3_0,transparent_34rem)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Brand />
        <span className="rounded-full border border-forest-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-forest-700">
          Built for students
        </span>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-20 lg:pb-24">
        <div>
          <p className="mb-5 inline-flex rounded-full bg-forest-100 px-3 py-1.5 text-sm font-semibold text-forest-700">
            A clearer path to university
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-forest-900 sm:text-6xl sm:leading-[1.05]">
            Turn admission uncertainty into a plan you can follow.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Build your student profile, understand what is ready and what needs work,
            then move toward programs that fit your goals.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/onboarding"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(32,79,61,.2)] transition-colors hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              Build my admission plan
            </Link>
            <span className="text-center text-sm text-muted sm:text-left">
              Takes about 3 minutes · Saves on this device
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-sand-100/70 blur-2xl" />
          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(23,52,41,.12)] sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-forest-100 pb-5">
              <div>
                <p className="text-sm font-medium text-muted">Your journey</p>
                <h2 className="mt-1 text-xl font-semibold text-forest-900">A plan built around you</h2>
              </div>
              <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-700">
                Profile first
              </span>
            </div>
            <div className="space-y-3 py-5">
              {[
                ["Profile diagnosis", "See strengths and missing information"],
                ["Relevant matches", "Focus on your chosen study field"],
                ["Next actions", "Know what to work on first"],
              ].map(([title, detail], index) => (
                <div key={title} className="flex gap-4 rounded-2xl bg-forest-50 p-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-forest-700 shadow-sm">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="rounded-2xl border border-sand-300/70 bg-sand-100/60 px-4 py-3 text-sm leading-6 text-forest-900">
              Fit Score describes profile match. It is never an admission probability.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-forest-100 bg-white/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-forest-600">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            Three steps from questions to direction.
          </h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, detail]) => (
              <article key={number} className="rounded-3xl border border-forest-100 bg-white p-6">
                <span className="text-sm font-bold text-forest-500">{number}</span>
                <h3 className="mt-8 text-xl font-semibold text-forest-900">{title}</h3>
                <p className="mt-3 leading-7 text-muted">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Scope stated up front: the case requires the coverage limit to be visible in the product, not only in the README. */}
      <section className="border-t border-forest-100">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-forest-600">What is inside</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            A small, checked dataset beats a large, unchecked one.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Every requirement, fee and deadline in this product comes from an official university page,
            and every program card links back to it. Where a university does not publish a clear value,
            we show <span className="font-semibold text-forest-900">Unknown</span> instead of guessing.
          </p>

          <dl className="mt-9 grid gap-4 sm:grid-cols-3">
            {stats.map(([value, label, detail]) => (
              <div key={label} className="rounded-3xl border border-forest-100 bg-white p-6">
                <dt className="text-4xl font-semibold tracking-tight text-forest-900 tabular-nums">{value}</dt>
                <p className="mt-1 font-semibold text-forest-700">{label}</p>
                <dd className="mt-2 text-sm leading-6 text-muted">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-3xl border border-sand-300/70 bg-sand-100/60 px-6 py-5">
            <p className="font-semibold text-forest-900">Current limits, stated plainly</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-forest-900 sm:grid-cols-2">
              <li>Bachelor programs only.</li>
              <li>Two study directions: {coverage.directions.join(" and ")}.</li>
              <li>Fit Score is a profile match, never a probability of admission.</li>
              <li>Requirements change — always confirm on the university page before applying.</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-forest-100 bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand />
          <p className="text-sm leading-6 text-muted">
            {coverage.verifiedOn
              ? `Program data verified on ${coverage.verifiedOn}.`
              : "Program data verified against official university sources."}{" "}
            Built for the LOCUS Startup Hackathon 2026.
          </p>
        </div>
      </footer>
    </main>
  );
}
