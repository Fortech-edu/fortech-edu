"use client";

import { useState } from "react";
import Link from "next/link";
import { getProgramById } from "../../data/programs.ts";
import { assessProgram } from "../../lib/admissions/recommend.ts";
import {
  generateRoadmap,
  getNextAction,
  getPrioritizedRoadmapItems,
  getRoadmapProgress,
  hasStrongProfileState,
  roadmapHorizons,
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
import type { Recommendation, RoadmapHorizon, RoadmapItem, RoadmapPriority } from "../../types/admissions.ts";
import { EligibilityBadge } from "../matches/program-presentation.tsx";

const priorityStyles: Record<RoadmapPriority, string> = {
  high: "bg-amber-100 text-amber-900",
  medium: "bg-forest-50 text-forest-700",
  low: "bg-slate-100 text-slate-600",
};

const priorityLabels: Record<RoadmapPriority, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const emptyHorizonCopy: Record<RoadmapHorizon, string> = {
  now: "No confirmed requirement gap needs immediate action for this program.",
  next_30_days: "No program requirement currently needs verification.",
  this_semester: "No preparation task belongs in this horizon yet.",
  before_application: "No application step belongs in this horizon yet.",
};

export function RoadmapView() {
  const ready = useClientReady();
  if (!ready) return <div className="rounded-3xl bg-white p-8 text-center text-muted">Loading your roadmap…</div>;

  const stored = loadStoredProfile();
  if (!stored?.completed) {
    return <EmptyState title="Build your profile first" copy="Your roadmap needs a completed profile and a selected current match." href="/onboarding" action="Build profile" />;
  }

  const selectedId = loadSelectedProgram();
  if (!selectedId) {
    return <EmptyState title="Choose a program first" copy="Select a current match before building its roadmap." href="/matches" action="Choose a program" />;
  }

  const program = getProgramById(selectedId);
  if (!program) {
    return <EmptyState title="Selected program is no longer available" copy="Choose another program from the current verified set; we will not replace your target automatically." href="/matches" action="Back to matches" />;
  }

  const recommendation = assessProgram(stored.profile, program);
  const items = generateRoadmap(stored.profile, recommendation.program);
  return <RoadmapContent key={`${stored.updatedAt}:${loadJourneyUpdatedAt()}`} recommendation={recommendation} items={items} />;
}

function RoadmapContent({ recommendation, items }: { recommendation: Recommendation; items: RoadmapItem[] }) {
  const { program } = recommendation;
  const validIds = items.map(({ id }) => id);
  const [completedIds, setCompletedIds] = useState(() => loadCompletedTaskIds(program.id, validIds));
  const progress = getRoadmapProgress(items, completedIds);
  const nextAction = getNextAction(items, completedIds);
  const knownComparableRequirementsMet = hasStrongProfileState(items);
  const orderedItems = getPrioritizedRoadmapItems(items);

  function toggle(taskId: string) {
    const next = toggleCompletedTask(completedIds, taskId);
    setCompletedIds(next);
    saveCompletedTaskIds(program.id, next);
  }

  return (
    <div className="roadmap-view space-y-8">
      <section className="roadmap-hero overflow-hidden">
        <div className="bg-[var(--surface)] p-6 sm:p-9 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-600">Your path to this program</p>
          <p className="mt-5 font-semibold text-forest-600">{program.universityName}</p>
          <h1 className="mt-3 max-w-5xl break-words text-4xl font-semibold leading-[0.92] text-forest-900 sm:text-6xl">{program.programName}</h1>
          <p className="mt-3 text-sm text-muted">{program.country ?? "Country unknown"} · {program.degreeLevel ?? "Degree unknown"}</p>
          <div className="mt-5"><EligibilityBadge status={recommendation.eligibility} /></div>
        </div>
        <nav className="flex flex-col gap-2 border-t border-forest-100 p-5 sm:flex-row sm:flex-wrap sm:px-9" aria-label="Roadmap navigation">
          <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Back to matches</Link>
          <Link href={`/matches/${program.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Program details</Link>
          <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Edit profile</Link>
        </nav>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="product-hero p-6 text-white sm:p-8" aria-labelledby="next-action-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-100">Next action</p>
          {nextAction ? (
            <div className="mt-4">
              <h2 id="next-action-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{nextAction.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-forest-100 sm:text-base sm:leading-7">{nextAction.description}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-forest-100"><span className="font-semibold text-white">Why now: </span>{nextAction.reason}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{nextAction.relatedRequirement}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${nextAction.priority === "high" ? "bg-amber-200 text-amber-950" : "bg-white/15 text-white"}`}>{priorityLabels[nextAction.priority]}</span>
                {nextAction.dueDate ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">Published deadline: {nextAction.dueDate}</span> : null}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="button" onClick={() => toggle(nextAction.id)} className="min-h-12 rounded-full bg-white px-6 font-semibold text-forest-900 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Mark this step complete</button>
                {nextAction.officialSourceUrl ? <OfficialSourceLink item={nextAction} inverted /> : null}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <h2 id="next-action-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Current roadmap complete</h2>
              <p className="mt-3 text-forest-100">Every current step is complete. Recheck official program information before applying.</p>
            </div>
          )}
        </section>

        <section className="editorial-section p-6" aria-labelledby="progress-title">
          <h2 id="progress-title" className="text-lg font-semibold text-forest-900">Completed roadmap steps</h2>
          <p className="mt-3 text-4xl font-semibold text-forest-700">{progress.percentage}%</p>
          <p className="mt-1 text-sm text-muted">{progress.completed} of {progress.total} tasks completed</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-forest-100" role="progressbar" aria-label="Completed roadmap steps" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>
            <div className="h-full rounded-full bg-forest-600 transition-[width]" style={{ width: `${progress.percentage}%` }} />
          </div>
        </section>
      </div>

      {knownComparableRequirementsMet ? (
        <section className="rounded-3xl border border-forest-200 bg-forest-50 p-5 sm:p-6" aria-labelledby="requirements-state-title">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest-600">Current profile state</p>
          <h2 id="requirements-state-title" className="mt-2 text-xl font-semibold text-forest-900">Your profile currently meets the published comparable requirements we can verify.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Verification and application steps still matter because some program information may be qualification-specific or unknown.</p>
        </section>
      ) : null}

      <section className="pt-3" aria-labelledby="roadmap-title">
        <div className="px-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest-600">Program-specific roadmap</p>
          <h2 id="roadmap-title" className="mt-2 text-2xl font-semibold text-forest-900 sm:text-3xl">What to do, and when</h2>
        </div>
        <div className="mt-8 space-y-10">
          {roadmapHorizons.map((horizon) => {
            const horizonItems = orderedItems.filter((item) => item.horizon === horizon.id);
            return (
              <section key={horizon.id} className="roadmap-phase overflow-hidden" aria-labelledby={`horizon-${horizon.id}`}>
                <header className="border-b border-forest-100 px-5 py-6 sm:px-7">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-600">{horizon.label}</p>
                  <h3 id={`horizon-${horizon.id}`} className="mt-1 text-xl font-semibold text-forest-900">{horizon.description}</h3>
                </header>
                {horizonItems.length ? (
                  <ol className="divide-y divide-forest-100">
                    {horizonItems.map((item) => {
                      const completed = completedIds.includes(item.id);
                      const descriptionId = `${item.id}-description`;
                      return (
                        <li key={item.id} className={`grid gap-4 p-5 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:px-7 ${completed ? "bg-forest-50/60" : ""}`}>
                          <label className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-forest-200 bg-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest-600">
                            <input type="checkbox" checked={completed} onChange={() => toggle(item.id)} aria-label={`Mark ${item.title} ${completed ? "incomplete" : "complete"}`} aria-describedby={descriptionId} className="size-5 accent-forest-600" />
                          </label>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{completed ? "Completed" : item.relatedRequirement}</p>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priorityStyles[item.priority]}`}>{priorityLabels[item.priority]}</span>
                              {item.dueDate ? <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Published deadline: {item.dueDate}</span> : null}
                            </div>
                            <h4 className={`mt-2 break-words text-lg font-semibold ${completed ? "text-forest-700 line-through decoration-forest-300" : "text-forest-900"}`}>{item.title}</h4>
                            <p id={descriptionId} className="mt-2 max-w-3xl text-sm leading-6 text-muted">{item.description}</p>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/80"><span className="font-semibold text-forest-700">Why it matters: </span>{item.reason}</p>
                            {item.officialSourceUrl ? <div className="mt-3"><OfficialSourceLink item={item} /></div> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="px-5 py-6 text-sm leading-6 text-muted sm:px-7">{emptyHorizonCopy[horizon.id]}</p>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function OfficialSourceLink({ item, inverted = false }: { item: RoadmapItem; inverted?: boolean }) {
  if (!item.officialSourceUrl || !item.officialSourceLabel) return null;
  return (
    <a href={item.officialSourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${item.officialSourceLabel} (opens in a new tab)`} className={`inline-flex min-h-11 max-w-full items-center break-words rounded-full px-4 py-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 ${inverted ? "border border-white/35 text-white focus-visible:outline-white" : "bg-forest-50 text-forest-700 decoration-forest-200 focus-visible:outline-forest-600"}`}>View {item.officialSourceLabel}</a>
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
