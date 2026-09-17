"use client";

import { useState } from "react";
import Link from "next/link";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import {
  generateRoadmap,
  getNextAction,
  getRoadmapProgress,
} from "../../lib/admissions/roadmap.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import {
  loadCompletedTaskIds,
  saveCompletedTaskIds,
  toggleCompletedTask,
} from "../../lib/storage/progress.ts";
import { loadSelectedProgram } from "../../lib/storage/selection.ts";
import { loadJourneyUpdatedAt } from "../../lib/storage/sync-events.ts";
import type { Recommendation, RoadmapItem } from "../../types/admissions.ts";
import { EligibilityBadge } from "../matches/program-presentation.tsx";

export function RoadmapView() {
  const ready = useClientReady();
  if (!ready) return <div className="rounded-3xl bg-white p-8 text-center text-muted">Loading your roadmap…</div>;

  const stored = loadStoredProfile();
  if (!stored?.completed) {
    return <EmptyState title="Complete your profile first" copy="Your roadmap needs a completed student profile." href="/onboarding" action="Go to onboarding" />;
  }

  const selectedId = loadSelectedProgram();
  if (!selectedId) {
    return <EmptyState title="Choose a program first" copy="Select a program from your recommendations before building a roadmap." href="/matches" action="View matches" />;
  }

  const recommendation = getPrimaryMatches(stored.profile).find(({ program }) => program.id === selectedId);
  if (!recommendation) {
    return <EmptyState title="Selected program is no longer a current match" copy="Your profile changed or this program is no longer available. Choose a program from your latest recommendations." href="/matches" action="Choose another program" />;
  }

  const items = generateRoadmap(stored.profile, recommendation.program);
  return <RoadmapContent key={`${stored.updatedAt}:${loadJourneyUpdatedAt()}`} recommendation={recommendation} items={items} />;
}

function RoadmapContent({ recommendation, items }: { recommendation: Recommendation; items: RoadmapItem[] }) {
  const { program } = recommendation;
  const validIds = items.map(({ id }) => id);
  const [completedIds, setCompletedIds] = useState(() => loadCompletedTaskIds(program.id, validIds));
  const progress = getRoadmapProgress(items, completedIds);
  const nextAction = getNextAction(items, completedIds);

  function toggle(taskId: string) {
    const next = toggleCompletedTask(completedIds, taskId);
    setCompletedIds(next);
    saveCompletedTaskIds(program.id, next);
  }

  if (!items.length) {
    return <EmptyState title="No roadmap steps are currently available" copy="Review the selected program or edit your profile to regenerate the plan." href={`/matches/${program.id}`} action="Review program" />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-forest-900 p-6 text-white shadow-[0_18px_60px_rgba(23,52,41,.12)] sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-forest-100">Next action</p>
        {nextAction ? (
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{nextAction.title}</h1>
              <p className="mt-3 max-w-2xl leading-7 text-forest-100">{nextAction.description}</p>
            </div>
            <button type="button" onClick={() => toggle(nextAction.id)} className="min-h-12 shrink-0 rounded-full bg-white px-6 font-semibold text-forest-900 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Mark complete</button>
          </div>
        ) : (
          <div className="mt-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Roadmap complete</h1>
            <p className="mt-3 text-forest-100">Every current step is complete. Recheck official program information before applying.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-forest-100 bg-white p-5 sm:p-7" aria-labelledby="progress-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="progress-title" className="text-lg font-semibold text-forest-900">Your progress</h2>
            <p className="mt-1 text-sm text-muted">{progress.completed} of {progress.total} steps completed</p>
          </div>
          <p className="text-2xl font-semibold text-forest-700">{progress.percentage}%</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-forest-100" role="progressbar" aria-label="Roadmap progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>
          <div className="h-full rounded-full bg-forest-600 transition-[width]" style={{ width: `${progress.percentage}%` }} />
        </div>
      </section>

      <section className="rounded-3xl border border-forest-100 bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-forest-600">Selected goal</p>
            <p className="mt-3 font-semibold text-forest-600">{program.universityName}</p>
            <h2 className="mt-1 text-2xl font-semibold text-forest-900">{program.programName}</h2>
            <p className="mt-1 text-sm text-muted">{program.country ?? "Unknown country"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <EligibilityBadge status={recommendation.eligibility} />
            <div className="rounded-2xl bg-forest-50 px-4 py-3">
              <p className="text-xs text-muted">Profile match</p>
              <p className="text-xl font-semibold text-forest-900">{recommendation.fitScore} / 100</p>
            </div>
          </div>
        </div>
        <nav className="mt-5 flex flex-col gap-2 border-t border-forest-100 pt-5 sm:flex-row" aria-label="Roadmap navigation">
          <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Back to matches</Link>
          <Link href={`/matches/${program.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Program details</Link>
          <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Edit profile</Link>
        </nav>
      </section>

      <section aria-labelledby="roadmap-title">
        <div className="px-1">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-forest-600">Your roadmap</p>
          <h2 id="roadmap-title" className="mt-2 text-2xl font-semibold text-forest-900">An ordered plan for this program</h2>
        </div>
        <ol className="mt-5 space-y-3">
          {items.map((item, index) => {
            const completed = completedIds.includes(item.id);
            return (
              <li key={item.id} className={`rounded-3xl border p-5 sm:p-6 ${completed ? "border-forest-200 bg-forest-50" : "border-forest-100 bg-white"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${completed ? "bg-forest-600 text-white" : "bg-sand-100 text-amber-900"}`} aria-hidden="true">{completed ? "✓" : index + 1}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Step {index + 1} · {completed ? "Completed" : "To do"}</p>
                      </div>
                      <h3 className={`mt-1 text-lg font-semibold ${completed ? "text-forest-700 line-through decoration-forest-300" : "text-forest-900"}`}>{item.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{item.description}</p>
                      {item.dueDate && <p className="mt-2 text-sm font-semibold text-forest-700">Listed deadline: {item.dueDate}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={() => toggle(item.id)} aria-pressed={completed} className={`min-h-11 shrink-0 rounded-full px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 ${completed ? "border border-forest-200 bg-white text-forest-700" : "bg-forest-700 text-white hover:bg-forest-600"}`}>{completed ? "Mark incomplete" : "Mark complete"}</button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function EmptyState({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return (
    <section className="rounded-3xl border border-forest-100 bg-white p-8 text-center">
      <h1 className="text-2xl font-semibold text-forest-900">{title}</h1>
      <p className="mx-auto mt-3 max-w-md leading-7 text-muted">{copy}</p>
      <Link href={href} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{action}</Link>
    </section>
  );
}
