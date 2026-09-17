"use client";

import Link from "next/link";
import { diagnoseProfile } from "../../lib/admissions/diagnosis.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import type { StudentProfile } from "../../types/admissions.ts";
import { DiagnosisEnhancement } from "../ai/enhancements.tsx";

function show(value: string | number | null, fallback = "Not provided") {
  return value === null || value === "" ? fallback : String(value);
}

function budgetLabel(profile: StudentProfile) {
  if (profile.annualBudget === null) return "Not added";
  return `${profile.budgetCurrency ?? "Unknown currency"} ${profile.annualBudget.toLocaleString()} / year`;
}

export function DiagnosisView() {
  const ready = useClientReady();

  if (!ready) {
    return (
      <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center text-muted shadow-sm">
        Loading your profile analysis…
      </div>
    );
  }

  const profile = loadStoredProfile()?.profile ?? null;

  if (!profile) {
    return (
      <div className="rounded-3xl border border-forest-100 bg-white p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sand-100 text-xl" aria-hidden="true">↗</span>
        <h1 className="mt-5 text-2xl font-semibold text-forest-900">Build your profile first</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
          We need your study goals and available academic information before creating an analysis.
        </p>
        <Link href="/onboarding" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
          Start onboarding
        </Link>
      </div>
    );
  }

  const diagnosis = diagnoseProfile(profile);
  const knownCount = diagnosis.strengths.length;
  const unknownCount = diagnosis.missingInformation.length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-forest-900 text-white shadow-[0_20px_65px_rgba(23,52,41,.14)]" aria-labelledby="analysis-title">
        <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,.85fr)]">
          <div className="p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-100">Your profile analysis</p>
            <h1 id="analysis-title" className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Here’s where your profile stands
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-forest-100 sm:text-lg">
              {knownCount > 0
                ? `${knownCount} known profile ${knownCount === 1 ? "signal is" : "signals are"} ready to guide your next step.`
                : "Your profile does not yet contain a known planning signal."}
              {` ${unknownCount} ${unknownCount === 1 ? "item remains" : "items remain"} unknown and ${unknownCount === 1 ? "is" : "are"} not treated as success or failure.`}
            </p>
            <Link href="/onboarding" className="mt-6 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Edit admission profile
            </Link>
          </div>

          <div className="border-t border-white/15 bg-white/7 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-100">Profile used for this analysis</p>
            <dl className="mt-5 divide-y divide-white/15">
              <ProfileGroup title="Goal" values={[show(profile.targetDegree, "Not selected"), show(profile.intendedField, "Not selected"), show(profile.currentStudyStage, "Stage not provided")]} />
              <ProfileGroup title="Academics" values={[`GPA ${show(profile.gpa)}`, `IELTS ${show(profile.ieltsScore)}`, `SAT ${show(profile.satScore)}`]} />
              <ProfileGroup title="Preferences" values={[profile.preferredCountries.join(" · ") || "Countries not selected", budgetLabel(profile), show(profile.targetIntake, "Intake not selected")]} />
            </dl>
          </div>
        </div>
      </section>

      <DiagnosisEnhancement profile={profile} diagnosis={diagnosis} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <section className="rounded-3xl border border-forest-100 bg-white p-6 shadow-[0_16px_45px_rgba(23,52,41,.05)] sm:p-8" aria-labelledby="strongest-signals-title">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">What we can use now</p>
          <h2 id="strongest-signals-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Your strongest known signals</h2>
          <p className="mt-2 max-w-2xl leading-7 text-muted">Known information that can already guide program matching and planning.</p>
          <AnalysisItems items={diagnosis.strengths} marker="✓" empty="No known planning signals yet." />
        </section>

        <section className="rounded-3xl border border-sand-300 bg-sand-100 p-6 sm:p-8" aria-labelledby="focus-next-title">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Priorities</p>
          <h2 id="focus-next-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Focus next</h2>
          <p className="mt-2 leading-7 text-ink/80">The shortest list of profile-level actions worth your attention now.</p>
          <AnalysisItems items={diagnosis.gaps.slice(0, 3)} marker="→" empty="No profile-level actions are currently listed." />
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" aria-labelledby="unknown-title">
        <div className="grid gap-5 lg:grid-cols-[minmax(15rem,.7fr)_minmax(0,1.3fr)] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Needs verification</p>
            <h2 id="unknown-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Still unknown</h2>
            <p className="mt-2 leading-7 text-muted">We do not have enough information to treat these items as success or failure.</p>
          </div>
          <AnalysisItems items={diagnosis.missingInformation} marker="?" empty="No profile fields are currently listed as unknown." compact />
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-forest-200 bg-white p-6 shadow-[0_16px_45px_rgba(23,52,41,.05)] sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-labelledby="matches-cta-title">
        <div>
          <h2 id="matches-cta-title" className="text-xl font-semibold text-forest-900">See how your profile compares with verified programs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Matching remains deterministic. AI does not calculate Fit Score or eligibility.</p>
        </div>
        <Link href="/matches" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
          See programs for my profile
        </Link>
      </section>
    </div>
  );
}

function ProfileGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-100">{title}</dt>
      <dd className="mt-2 space-y-1 text-sm font-medium leading-5 text-white">
        {values.map((value, index) => <p key={`${title}-${index}`}>{value}</p>)}
      </dd>
    </div>
  );
}

function AnalysisItems({ items, marker, empty, compact = false }: { items: string[]; marker: string; empty: string; compact?: boolean }) {
  return (
    <ul className={`${compact ? "mt-0 grid gap-3 sm:grid-cols-2" : "mt-6 space-y-3"}`}>
      {items.length > 0 ? items.map((item) => (
        <li key={item} className="flex gap-3 rounded-2xl bg-[#fbfcfa] p-4 text-sm leading-6 text-ink">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700" aria-hidden="true">{marker}</span>
          <span>{item}</span>
        </li>
      )) : <li className="text-sm text-muted">{empty}</li>}
    </ul>
  );
}
