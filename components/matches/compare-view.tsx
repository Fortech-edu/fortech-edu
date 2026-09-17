"use client";

import Link from "next/link";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import {
  eligibilityLabels,
  formatRequirement,
  formatScoreComponent,
  formatTuition,
  getProgramSource,
  scoreComponents,
} from "../../lib/admissions/presentation.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import { loadCompareSelection } from "../../lib/storage/selection.ts";
import type { Recommendation } from "../../types/admissions.ts";

export function CompareView() {
  const ready = useClientReady();
  if (!ready) return <div className="rounded-3xl bg-white p-8 text-center text-muted">Restoring your comparison…</div>;

  const stored = loadStoredProfile();
  const selectedIds = loadCompareSelection();
  const matches = stored?.completed ? getPrimaryMatches(stored.profile) : [];
  const recommendations = selectedIds
    .map((id) => matches.find(({ program }) => program.id === id))
    .filter((item): item is Recommendation => item !== undefined);

  if (recommendations.length !== 2) {
    return (
      <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-forest-900">Select two current matches</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">Your comparison is incomplete or the saved programs no longer match your latest profile.</p>
        <Link href={stored?.completed ? "/matches" : "/onboarding"} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{stored?.completed ? "Choose programs" : "Complete profile"}</Link>
      </section>
    );
  }

  return <Comparison recommendations={recommendations} />;
}

function Comparison({ recommendations }: { recommendations: [Recommendation, Recommendation] | Recommendation[] }) {
  const [first, second] = recommendations;
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-forest-900 p-6 text-white sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-forest-100">Program comparison</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">See the differences clearly.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-forest-100">Compare two current matches without treating either as an automatic winner.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Back to matches</Link>
          <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Edit profile</Link>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 md:grid-cols-2">
        <ComparisonCard recommendation={first} other={second} />
        <ComparisonCard recommendation={second} other={first} />
      </div>
    </div>
  );
}

function ComparisonCard({ recommendation, other }: { recommendation: Recommendation; other: Recommendation }) {
  const { program } = recommendation;
  const source = getProgramSource(program);
  const facts = [
    ["Profile match", `${recommendation.fitScore} / 100`, `${other.fitScore} / 100`],
    ["Data coverage", `${recommendation.dataCoverage}%`, `${other.dataCoverage}%`],
    ["Eligibility", eligibilityLabels[recommendation.eligibility], eligibilityLabels[other.eligibility]],
    ["Country", program.country ?? "Unknown", other.program.country ?? "Unknown"],
    ["Field", program.field || "Unknown", other.program.field || "Unknown"],
    ["Tuition", formatTuition(program), formatTuition(other.program)],
    ["IELTS", formatRequirement(program.ieltsRequirement), formatRequirement(other.program.ieltsRequirement)],
    ["SAT", formatRequirement(program.satRequirement), formatRequirement(other.program.satRequirement)],
    ["Academic", formatRequirement(program.academicRequirement), formatRequirement(other.program.academicRequirement)],
    ["Deadline", program.deadline ?? "Unknown", other.program.deadline ?? "Unknown"],
  ];

  return (
    <article className="min-w-0 rounded-3xl border border-forest-100 bg-white p-5 shadow-[0_16px_50px_rgba(23,52,41,.06)] sm:p-7">
      <p className="text-sm font-semibold text-forest-600">{program.universityName}</p>
      <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight text-forest-900">{program.programName}</h2>
      <p className="mt-3 text-xs leading-5 text-muted">Fit Score is profile match, not admission probability.</p>

      <dl className="mt-5 space-y-2">
        {facts.map(([label, value, otherValue]) => (
          <div key={label} className={`rounded-xl px-3 py-2.5 ${value !== otherValue ? "bg-sand-100/70" : "bg-forest-50"}`}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6">
        <h3 className="font-semibold text-forest-900">Score breakdown</h3>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {scoreComponents.map(({ key, label }) => (
            <div key={key} className="rounded-xl bg-forest-50 px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{formatScoreComponent(recommendation.breakdown[key])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <CompareList title="Strengths" items={recommendation.reasons} />
      <CompareList title="Gaps" items={recommendation.gaps} />

      <div className="mt-6 border-t border-forest-100 pt-4 text-sm">
        {source ? <a href={source.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{source.label}</a> : <span className="text-muted">No source link provided</span>}
      </div>
    </article>
  );
}

function CompareList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h3 className="font-semibold text-forest-900">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-5 text-ink">
        {items.length ? items.map((item) => <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">{item}</li>) : <li className="text-muted">None identified.</li>}
      </ul>
    </section>
  );
}
