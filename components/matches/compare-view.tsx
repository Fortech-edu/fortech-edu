"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import {
  buildProgramComparisonCriteria,
  resolveComparison,
} from "../../lib/admissions/presentation.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import { loadCompareSelection, saveSelectedProgram } from "../../lib/storage/selection.ts";
import type { Recommendation } from "../../types/admissions.ts";

export function CompareView() {
  const ready = useClientReady();
  if (!ready) return <div className="rounded-3xl bg-white p-8 text-center text-muted">Restoring your comparison…</div>;

  const stored = loadStoredProfile();
  const matches = stored?.completed ? getPrimaryMatches(stored.profile) : [];
  const recommendations = resolveComparison(loadCompareSelection(), matches);

  if (!recommendations) {
    return (
      <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-forest-900">Select two current matches</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">Your comparison is incomplete or a saved program no longer matches your latest profile. We will not replace it automatically.</p>
        <Link href={stored?.completed ? "/matches" : "/onboarding"} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{stored?.completed ? "Choose programs in Matches" : "Complete profile"}</Link>
      </section>
    );
  }

  return <Comparison recommendations={recommendations} />;
}

function Comparison({ recommendations }: { recommendations: [Recommendation, Recommendation] }) {
  const router = useRouter();
  const [first, second] = recommendations;
  const rows = buildProgramComparisonCriteria(first, second);

  function buildRoadmap(recommendation: Recommendation) {
    if (saveSelectedProgram(recommendation.program.id)) router.push("/roadmap");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-forest-900 p-6 text-white shadow-[0_20px_65px_rgba(23,52,41,.14)] sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-forest-100">Program comparison</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Compare what matters, criterion by criterion.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-forest-100">Differences are highlighted without choosing a winner. Unknown information stays unknown.</p>
        <Link href="/matches" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">← Back to matches</Link>
      </section>

      <section className="overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-[0_16px_50px_rgba(23,52,41,.06)]" aria-labelledby="comparison-matrix-title">
        <div className="p-6 sm:p-8">
          <h2 id="comparison-matrix-title" className="text-2xl font-semibold tracking-tight text-forest-900">Side-by-side facts</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Fit is profile alignment, not admission probability. Tuition is compared only when currency and billing period match.</p>

          <div className="mt-7 hidden grid-cols-[minmax(9rem,.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-forest-200 px-4 pb-5 md:grid">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Criterion</p>
            <ProgramHeading recommendation={first} />
            <ProgramHeading recommendation={second} />
          </div>

          <dl className="divide-y divide-forest-100 border-y border-forest-100 md:border-t-0">
            {rows.map((row) => (
              <div key={row.key} className="grid gap-4 py-5 md:grid-cols-[minmax(9rem,.7fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:px-4">
                <dt>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-forest-900">{row.label}</span>
                    {row.different ? <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Different</span> : null}
                  </div>
                  {row.note ? <p className="mt-2 text-xs leading-5 text-muted">{row.note}</p> : null}
                </dt>
                <ComparisonValue recommendation={first} value={row.firstValue} />
                <ComparisonValue recommendation={second} value={row.secondValue} />
              </div>
            ))}
          </dl>
        </div>

        <section className="border-t border-forest-100 bg-forest-50 p-6 sm:p-8" aria-labelledby="roadmap-choice-title">
          <h2 id="roadmap-choice-title" className="text-xl font-semibold text-forest-900">Build a roadmap for either program</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Both choices use the same existing roadmap flow.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[first, second].map((recommendation) => (
              <button key={recommendation.program.id} type="button" onClick={() => buildRoadmap(recommendation)} className="min-h-12 break-words rounded-2xl border border-forest-200 bg-white px-5 py-3 text-left font-semibold text-forest-700 hover:bg-forest-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
                Build roadmap for {recommendation.program.programName}
              </button>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function ProgramHeading({ recommendation }: { recommendation: Recommendation }) {
  const { program } = recommendation;
  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-forest-600">{program.universityName}</p>
      <h3 className="mt-1 break-words text-lg font-semibold leading-6 text-forest-900">{program.programName}</h3>
      <Link href={`/matches/${program.id}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View program</Link>
    </div>
  );
}

function ComparisonValue({ recommendation, value }: { recommendation: Recommendation; value: string }) {
  const { program } = recommendation;
  return (
    <dd className="min-w-0 border-l-2 border-forest-100 pl-3 md:border-l-0 md:pl-0">
      <p className="break-words text-xs font-semibold text-forest-600 md:sr-only">{program.universityName}</p>
      <p className="mt-0.5 break-words text-xs text-muted md:sr-only">{program.programName}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink md:mt-0">{value}</p>
    </dd>
  );
}
