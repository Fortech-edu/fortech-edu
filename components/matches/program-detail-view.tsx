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
  ProgramFacts,
  ReasonsAndGaps,
  ScoreBreakdown,
  ScoreSummary,
  SourceState,
} from "./program-presentation.tsx";
import { RecommendationEnhancement } from "../ai/enhancements.tsx";
import type { StudentProfile } from "../../types/admissions.ts";

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

  return <ProgramDetail profile={profile} recommendation={recommendation} validIds={matches.map(({ program }) => program.id)} />;
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
    <div className="space-y-5">
      <Link href="/matches" className="inline-flex min-h-11 items-center rounded-full px-2 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">← Back to matches</Link>
      <article className="rounded-3xl border border-forest-100 bg-white p-6 shadow-[0_18px_60px_rgba(23,52,41,.07)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><EligibilityBadge status={recommendation.eligibility} /><SourceState recommendation={recommendation} /></div>
            <p className="mt-5 font-semibold text-forest-600">{program.universityName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">{program.programName}</h1>
            <p className="mt-2 text-muted">{program.degreeLevel ?? "Unknown degree"} · {program.field} · {program.country ?? "Unknown country"}</p>
          </div>
          <div className="w-full lg:w-72"><ScoreSummary recommendation={recommendation} /></div>
        </div>

        <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">Fit Score measures how well this program matches your profile. It is not your probability of admission.</p>

        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <section>
            <h2 className="text-xl font-semibold text-forest-900">Program facts</h2>
            <div className="mt-4"><ProgramFacts recommendation={recommendation} /></div>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-forest-900">Fit details</h2>
            <div className="mt-4"><ReasonsAndGaps recommendation={recommendation} /></div>
          </section>
        </div>

        <RecommendationEnhancement profile={profile} recommendation={recommendation} />

        <section className="mt-7 border-t border-forest-100 pt-7">
          <h2 className="text-xl font-semibold text-forest-900">Score breakdown</h2>
          <div className="mt-4"><ScoreBreakdown recommendation={recommendation} /></div>
        </section>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={toggle} disabled={selected.length === 2 && !isSelected} aria-pressed={isSelected} className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-45">{isSelected ? "Remove from compare" : "Compare"}</button>
          <button type="button" onClick={choose} className="min-h-12 rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{chosen ? "Open roadmap" : "Choose this program"}</button>
          {selected.length === 2 && <Link href="/compare" className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-900 px-6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Compare programs</Link>}
        </div>
      </article>
    </div>
  );
}
