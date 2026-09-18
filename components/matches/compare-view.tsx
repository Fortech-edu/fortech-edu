"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import {
  buildProgramComparisonCriteria,
  resolveComparison,
} from "../../lib/admissions/presentation.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import {
  clearCompareSelection,
  loadCompareSelection,
  saveCompareSelection,
  saveSelectedProgram,
} from "../../lib/storage/selection.ts";
import type { Recommendation } from "../../types/admissions.ts";

export function CompareView() {
  const ready = useClientReady();
  if (!ready) return <div className="rounded-3xl bg-white p-8 text-center text-muted">Restoring your comparison…</div>;

  const stored = loadStoredProfile();
  if (!stored?.completed) {
    return (
      <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-forest-900">Complete your profile first</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
          Comparing programs requires a completed profile so requirements and eligibility can be evaluated accurately.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
        >
          Go to onboarding
        </Link>
      </section>
    );
  }

  const matches = getPrimaryMatches(stored.profile);
  if (!matches.length) {
    return (
      <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-forest-900">No eligible matches found</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
          No verified programs currently match your profile. Update your profile in onboarding to discover programs to compare.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
        >
          Edit profile
        </Link>
      </section>
    );
  }

  return <CompareManager matches={matches} />;
}

function CompareManager({ matches }: { matches: ReturnType<typeof getPrimaryMatches> }) {
  const validIds = matches.map(({ program }) => program.id);
  const [selectedIds, setSelectedIds] = useState(() => loadCompareSelection(validIds));
  const rawSaved = typeof window !== "undefined" ? loadCompareSelection() : [];
  const hadStaleIds = rawSaved.length > selectedIds.length;

  function handleRemove(id: string) {
    const next = selectedIds.filter((item) => item !== id);
    setSelectedIds(next);
    saveCompareSelection(next);
  }

  function handleClear() {
    setSelectedIds([]);
    clearCompareSelection();
  }

  const recommendations = resolveComparison(selectedIds, matches);

  if (!recommendations) {
    if (selectedIds.length === 1) {
      const selectedMatch = matches.find((m) => m.program.id === selectedIds[0]);
      const programName = selectedMatch?.program.programName ?? "1 program";
      return (
        <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
          <div className="mx-auto inline-flex rounded-full bg-forest-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-forest-700">
            1 of 2 selected
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-forest-900">Select one more program to compare</h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
            {hadStaleIds
              ? `A previously saved program is no longer available. You have selected "${programName}". Select 1 more program from Matches to view a side-by-side comparison.`
              : `You have selected "${programName}". Choose 1 more program from your matches to view a side-by-side comparison.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/matches"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              Choose second program in Matches
            </Link>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              Clear selection
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
        <div className="mx-auto inline-flex rounded-full bg-forest-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-forest-700">
          0 of 2 selected
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-forest-900">
          {hadStaleIds ? "Saved programs no longer available" : "Select two programs to compare"}
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
          {hadStaleIds
            ? "Your previously saved programs are no longer available in your current matches. Fortech does not automatically substitute programs. Please choose 2 current programs to compare."
            : "Select up to 2 programs from your Matches shortlist to compare them side-by-side criterion by criterion."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/matches"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
          >
            Choose programs in Matches
          </Link>
          {hadStaleIds && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              Reset compare selection
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <Comparison
      recommendations={recommendations}
      onRemove={handleRemove}
      onClear={handleClear}
    />
  );
}

function Comparison({
  recommendations,
  onRemove,
  onClear,
}: {
  recommendations: [Recommendation, Recommendation];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [first, second] = recommendations;
  const rows = buildProgramComparisonCriteria(first, second);

  function buildRoadmap(recommendation: Recommendation) {
    if (saveSelectedProgram(recommendation.program.id)) router.push("/roadmap");
  }

  return (
    <div className="compare-view space-y-8">
      <section className="product-hero p-6 text-white sm:p-9 lg:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-forest-100">Program comparison</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-[0.92] sm:text-6xl lg:text-7xl">Compare what matters, criterion by criterion.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-forest-100">Differences are highlighted without choosing a winner. Unknown information stays unknown.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">← Back to matches</Link>
          <button type="button" onClick={onClear} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-5 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Clear comparison</button>
        </div>
      </section>

      <section className="comparison-matrix overflow-hidden" aria-labelledby="comparison-matrix-title">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="comparison-matrix-title" className="text-2xl font-semibold tracking-tight text-forest-900">Side-by-side facts</h2>
            <span className="rounded-full bg-forest-100 px-3 py-0.5 text-xs font-bold text-forest-800">2 of 2 compared</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">Fit is profile alignment, not admission probability. Tuition is compared only when currency and billing period match.</p>

          <div className="mt-5 space-y-4 md:hidden">
            <div className="rounded-2xl border border-forest-100 bg-forest-50/40 p-4">
              <ProgramHeading recommendation={first} onRemove={() => onRemove(first.program.id)} />
            </div>
            <div className="rounded-2xl border border-forest-100 bg-forest-50/40 p-4">
              <ProgramHeading recommendation={second} onRemove={() => onRemove(second.program.id)} />
            </div>
          </div>

          <div className="mt-7 hidden grid-cols-[minmax(9rem,.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-forest-200 px-4 pb-5 md:grid">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Criterion</p>
            <ProgramHeading recommendation={first} onRemove={() => onRemove(first.program.id)} />
            <ProgramHeading recommendation={second} onRemove={() => onRemove(second.program.id)} />
          </div>

          <dl className="divide-y divide-forest-100 border-y border-forest-100 md:border-t-0">
            {rows.map((row) => (
              <div key={row.key} className="grid gap-4 py-6 md:grid-cols-[minmax(9rem,.7fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:px-4">
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

        <section className="border-t border-forest-100 bg-[color:var(--page)] p-6 sm:p-8" aria-labelledby="roadmap-choice-title">
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

function ProgramHeading({
  recommendation,
  onRemove,
}: {
  recommendation: Recommendation;
  onRemove?: () => void;
}) {
  const { program } = recommendation;
  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-forest-600">{program.universityName}</p>
      <h3 className="mt-1 break-words text-lg font-semibold leading-6 text-forest-900">{program.programName}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={`/matches/${program.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View program</Link>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 hover:text-red-700 underline decoration-slate-300 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
          >
            Remove from compare
          </button>
        )}
      </div>
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
