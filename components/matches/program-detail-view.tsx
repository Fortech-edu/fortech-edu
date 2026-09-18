"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import {
  loadCompareSelection,
  loadSelectedProgram,
  saveCompareSelection,
  saveSelectedProgram,
  toggleCompareSelection,
} from "../../lib/storage/selection.ts";
import {
  EligibilityBadge,
  ProfileProgramComparison,
  ProgramSources,
  ScoreBreakdown,
  ScoreSummary,
  SourceState,
  WhyProgramAppears,
} from "./program-presentation.tsx";
import { RecommendationEnhancement } from "../ai/enhancements.tsx";
import type { StudentProfile } from "../../types/admissions.ts";
import { loadJourneyUpdatedAt } from "../../lib/storage/sync-events.ts";

export function ProgramDetailView({ programId }: { programId: string }) {
  const ready = useClientReady();
  if (!ready) return <div className="rounded-3xl bg-white p-8 text-center text-muted">Loading program details…</div>;

  const stored = loadStoredProfile();
  const profile = stored?.completed ? stored.profile : null;
  const matches = profile ? getPrimaryMatches(profile) : [];
  const recommendation = matches.find(({ program }) => program.id === programId);

  if (!recommendation || !profile) {
    return (
      <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-forest-900">This program is not in your current matches</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">It may be unavailable, outside your current field, or no longer viable after a profile change.</p>
        <Link href={stored?.completed ? "/matches" : "/onboarding"} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
          {stored?.completed ? "Back to matches" : "Complete profile"}
        </Link>
      </section>
    );
  }

  return <ProgramDetail key={loadJourneyUpdatedAt()} profile={profile} recommendation={recommendation} validIds={matches.map(({ program }) => program.id)} />;
}

function ProgramDetail({ profile, recommendation, validIds }: { profile: StudentProfile; recommendation: ReturnType<typeof getPrimaryMatches>[number]; validIds: string[] }) {
  const router = useRouter();
  const { program } = recommendation;
  const [selected, setSelected] = useState(() => loadCompareSelection(validIds));
  const [chosen, setChosen] = useState(() => loadSelectedProgram() === program.id);
  const isSelected = selected.includes(program.id);

  function toggle() {
    const next = toggleCompareSelection(selected, program.id);
    setSelected(next);
    saveCompareSelection(next);
  }

  function choose() {
    if (saveSelectedProgram(program.id)) {
      setChosen(true);
      router.push("/roadmap");
    }
  }

  return (
    <div className="program-detail space-y-5">
      <Link href="/matches" className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">← Back to matches</Link>
      <article className="program-detail-surface overflow-hidden">
        <header className="border-b border-forest-100 bg-[var(--surface)] p-6 sm:p-9 lg:p-12">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-forest-600">{program.universityName}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.92] text-forest-900 sm:text-6xl">{program.programName}</h1>
              <p className="mt-3 text-muted">{program.country ?? "Unknown country"} · {program.degreeLevel ?? "Unknown degree"}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2"><EligibilityBadge status={recommendation.eligibility} /><SourceState recommendation={recommendation} /></div>
            </div>
            <div className="w-full lg:w-72"><ScoreSummary recommendation={recommendation} /></div>
          </div>
        </header>

        <div className="p-6 sm:p-9">
          <ProfileProgramComparison profile={profile} recommendation={recommendation} />

          <div className="mt-9 grid gap-8 border-t border-forest-100 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.7fr)]">
            <WhyProgramAppears recommendation={recommendation} />
            <details className="group border-y border-black/10 bg-forest-50 p-4">
              <summary className="min-h-11 cursor-pointer list-none py-2 font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">How Fit {recommendation.fitScore} is calculated <span aria-hidden="true" className="float-right group-open:rotate-180">⌄</span></summary>
              <div className="mt-3"><ScoreBreakdown recommendation={recommendation} /></div>
            </details>
          </div>

          <RecommendationEnhancement profile={profile} recommendation={recommendation} />

          <ProgramSources recommendation={recommendation} />

          <section className="mt-8 border-t border-forest-100 pt-8" aria-labelledby="next-step-title">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Next step</p>
            <h2 id="next-step-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Turn this match into a plan</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Build a task roadmap from this program’s current requirements and your profile.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={choose} className="min-h-12 rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{chosen ? "Open roadmap for this program" : "Build my roadmap for this program"}</button>
              <button type="button" onClick={toggle} disabled={selected.length === 2 && !isSelected} aria-pressed={isSelected} className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-45">{isSelected ? "Remove from compare" : "Add to compare"}</button>
              {selected.length === 2 && <Link href="/compare" className="inline-flex min-h-12 items-center justify-center rounded-full px-5 font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Compare selected programs</Link>}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
