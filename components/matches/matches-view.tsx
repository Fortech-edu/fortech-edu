"use client";

import { useState } from "react";
import Link from "next/link";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import {
  loadCompareSelection,
  saveCompareSelection,
  toggleCompareSelection,
} from "../../lib/storage/selection.ts";
import { loadJourneyUpdatedAt } from "../../lib/storage/sync-events.ts";
import { RecommendationCard } from "./program-presentation.tsx";

export function MatchesView() {
  const ready = useClientReady();
  if (!ready) return <LoadingState />;
  return <MatchesContent />;
}

function MatchesContent() {
  const stored = loadStoredProfile();
  if (!stored?.completed) {
    return <EmptyState title="Complete your profile first" copy="Your matches need a completed profile with a study goal and preferences." href="/onboarding" action="Go to onboarding" />;
  }

  const recommendations = getPrimaryMatches(stored.profile);
  if (!recommendations.length) {
    return <EmptyState title="No suitable matches yet" copy="No verified programs match your selected degree, field, and current eligibility. Edit your profile to review the available options." href="/onboarding" action="Edit profile" />;
  }

  return <RecommendationList key={loadJourneyUpdatedAt()} recommendations={recommendations} />;
}

function RecommendationList({ recommendations }: { recommendations: ReturnType<typeof getPrimaryMatches> }) {
  const validIds = recommendations.map(({ program }) => program.id);
  const [selected, setSelected] = useState(() => loadCompareSelection(validIds));

  function toggle(id: string) {
    const next = toggleCompareSelection(selected, id);
    setSelected(next);
    saveCompareSelection(next);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-forest-900 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-forest-100">Your recommendations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Relevant programs, clearly explained.</h1>
            <p className="mt-3 max-w-2xl leading-7 text-forest-100">Ranked within your field by eligibility first, then profile match. Scores are recalculated from your latest saved profile.</p>
          </div>
          <Link href="/onboarding" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/35 px-5 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Edit profile</Link>
        </div>
      </section>

      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.program.id}
          recommendation={recommendation}
          selected={selected.includes(recommendation.program.id)}
          disabled={selected.length === 2 && !selected.includes(recommendation.program.id)}
          onCompare={() => toggle(recommendation.program.id)}
        />
      ))}

      <aside className="sticky bottom-3 z-10 rounded-2xl border border-forest-200 bg-white/95 p-4 shadow-[0_16px_45px_rgba(23,52,41,.16)] backdrop-blur sm:flex sm:items-center sm:justify-between" aria-label="Comparison selection">
        <div>
          <p className="font-semibold text-forest-900">{selected.length} of 2 selected</p>
          <p className="mt-0.5 text-sm text-muted">Choose exactly two programs to compare.</p>
        </div>
        {selected.length === 2 ? (
          <Link href="/compare" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 sm:mt-0 sm:w-auto">Compare programs</Link>
        ) : (
          <button type="button" disabled className="mt-3 min-h-11 w-full rounded-full bg-slate-200 px-5 font-semibold text-slate-500 sm:mt-0 sm:w-auto">Compare programs</button>
        )}
      </aside>
    </div>
  );
}

function LoadingState() {
  return <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center text-muted shadow-sm">Loading your recommendations…</div>;
}

function EmptyState({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return (
    <section className="rounded-3xl border border-forest-100 bg-white p-7 text-center shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold text-forest-900">{title}</h1>
      <p className="mx-auto mt-3 max-w-md leading-7 text-muted">{copy}</p>
      <Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{action}</Link>
    </section>
  );
}
