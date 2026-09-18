"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChangeImpact } from "../../lib/admissions/change-impact.ts";
import {
  impactCounts,
  presentChangedInput,
  programChangeDescription,
  recentChangeLabel,
} from "../../lib/admissions/change-impact-presentation.ts";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadRecentChangeImpact } from "../../lib/storage/change-impact.ts";
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

  return <RecommendationList key={loadJourneyUpdatedAt()} profile={stored.profile} recommendations={recommendations} impact={loadRecentChangeImpact()} />;
}

function RecommendationList({ profile, recommendations, impact }: { profile: NonNullable<ReturnType<typeof loadStoredProfile>>["profile"]; recommendations: ReturnType<typeof getPrimaryMatches>; impact: ChangeImpact | null }) {
  const validIds = recommendations.map(({ program }) => program.id);
  const [selected, setSelected] = useState(() => loadCompareSelection(validIds));
  const recentChanges = new Map(impact?.programChanges.map((change) => [change.programId, change]));

  function toggle(id: string) {
    const next = toggleCompareSelection(selected, id);
    setSelected(next);
    saveCompareSelection(next);
  }

  return (
    <div className="matches-view space-y-8">
      <section className="product-hero" aria-labelledby="matches-title">
        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.75fr)]">
          <div className="p-6 sm:p-9">
            <nav aria-label="Profile journey" className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-100">Profile <span aria-hidden="true">→</span> Diagnosis <span aria-hidden="true">→</span> <span className="text-white">Matches</span></nav>
            <h1 id="matches-title" className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.92] sm:text-6xl lg:text-7xl">Programs for your profile</h1>
            <p className="mt-4 max-w-2xl leading-7 text-forest-100">Ranked by the existing deterministic matching system: eligibility, then Fit Score, then data coverage.</p>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white">Fit Score measures profile alignment — not admission probability.</p>
            <Link href="/onboarding" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/35 px-5 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Edit profile</Link>
          </div>
          <div className="border-t border-white/15 bg-white/7 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-100">Profile in use</p>
            <dl className="mt-5 space-y-5">
              <ProfileContext label="Field" value={profile.intendedField ?? "Not provided"} />
              <ProfileContext label="Countries" value={profile.preferredCountries.join(" + ") || "Not provided"} />
              <ProfileContext label="Intake" value={profile.targetIntake ?? "Not provided"} />
            </dl>
          </div>
        </div>
      </section>

      {impact && impact.programChanges.length > 0 ? <ImpactPanel impact={impact} /> : null}

      <div className="flex items-end justify-between gap-4 px-1 pt-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Ranked shortlist</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-forest-900">{recommendations.length} programs to review</h2>
        </div>
        <p className="hidden text-sm text-muted sm:block">Highest-ranked first</p>
      </div>

      <aside id="comparison-selection" className="comparison-bar p-4 sm:flex sm:items-center sm:justify-between" aria-label="Comparison selection">
        <div>
          <p className="font-semibold text-forest-900">{selected.length} selected</p>
          <p className="mt-0.5 text-sm text-muted">{selected.length === 2 ? "Your comparison is ready." : `Select ${2 - selected.length} more to compare.`}</p>
        </div>
        {selected.length === 2 ? (
          <Link href="/compare" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 sm:mt-0 sm:w-auto">Compare programs</Link>
        ) : (
          <button type="button" disabled className="mt-3 min-h-11 w-full rounded-full bg-slate-200 px-5 font-semibold text-slate-500 sm:mt-0 sm:w-auto">Compare programs</button>
        )}
      </aside>

      {recommendations.map((recommendation, index) => (
        <RecommendationCard
          key={recommendation.program.id}
          recommendation={recommendation}
          profile={profile}
          rank={index + 1}
          recentChange={recentChangeLabel(recentChanges.get(recommendation.program.id))}
          selected={selected.includes(recommendation.program.id)}
          disabled={selected.length === 2 && !selected.includes(recommendation.program.id)}
          compareReady={selected.length === 2}
          onCompare={() => toggle(recommendation.program.id)}
        />
      ))}
    </div>
  );
}

function ProfileContext({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-100">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-white">{value}</dd>
    </div>
  );
}

function ImpactPanel({ impact }: { impact: ChangeImpact }) {
  const counts = impactCounts(impact);
  const inputs = impact.changedInputs.slice(0, 3).map(presentChangedInput);
  const programs = impact.programChanges.slice(0, 3);

  return (
    <section className="accent-section p-5 sm:p-7" aria-labelledby="impact-title">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Recent change impact</p>
          <h2 id="impact-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Your profile changed</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/80">This updated how your profile compares with verified program requirements.</p>

          {inputs.length > 0 ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {inputs.map(({ label, previous, next }) => (
                <div key={label} className="border-l-2 border-forest-600 pl-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-forest-600">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold leading-6 text-forest-900">
                    {previous && next ? <>{previous} <span aria-hidden="true">→</span> {next}</> : previous ?? next}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {impact.changedInputs.length > 3 ? <p className="mt-3 text-xs text-muted">+{impact.changedInputs.length - 3} more profile changes</p> : null}

          {counts.length > 0 ? (
            <p className="mt-5 text-sm font-semibold leading-6 text-forest-900" aria-live="polite">{counts.join(" · ")}</p>
          ) : null}
        </div>

        <div className="border-t border-sand-300 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 className="text-sm font-semibold text-forest-900">Important program changes</h3>
          <ul className="mt-3 space-y-3">
            {programs.map((change) => (
              <li key={change.programId} className="text-sm leading-5">
                <p className="font-semibold text-ink">{change.universityName}</p>
                <p className="text-muted">{change.programName} · {programChangeDescription(change)}</p>
              </li>
            ))}
          </ul>
          {impact.programChanges.length > 3 ? <p className="mt-3 text-xs text-muted">Showing 3 of {impact.programChanges.length} program changes.</p> : null}
        </div>
      </div>
    </section>
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
