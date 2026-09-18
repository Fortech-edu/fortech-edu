"use client";

import { useState } from "react";
import Link from "next/link";
import { getProgramById } from "../../data/programs.ts";
import type { ChangeImpact, RoadmapTaskChange } from "../../lib/admissions/change-impact.ts";
import { impactCounts, presentChangedInput } from "../../lib/admissions/change-impact-presentation.ts";
import {
  diagnoseTarget,
  type DiagnosisVerificationItem,
  type TargetDiagnosis,
} from "../../lib/admissions/diagnosis.ts";
import type { ComparisonStatus, ProfileProgramCriterion } from "../../lib/admissions/presentation.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { clearRecentChangeImpact, loadRecentChangeImpact } from "../../lib/storage/change-impact.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import { loadSelectedProgram } from "../../lib/storage/selection.ts";
import type { RoadmapItem, RoadmapPriority, StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { DiagnosisEnhancement } from "../ai/enhancements.tsx";
import { ProfileProgramComparison } from "../matches/program-presentation.tsx";

const statusStyles: Record<ComparisonStatus, string> = {
  Match: "bg-forest-100 text-forest-700",
  "Action needed": "bg-amber-100 text-amber-900",
  "Needs verification": "bg-slate-100 text-slate-700",
  "Not required": "bg-forest-50 text-forest-700",
  "Not comparable": "bg-sand-100 text-amber-900",
};

const priorityStyles = {
  "Confirmed gap": "bg-amber-100 text-amber-900",
  "Missing current value": "bg-slate-100 text-slate-700",
  "Needs verification": "bg-slate-100 text-slate-700",
} as const;

const phaseLabels = { now: "Now", prepare: "Prepare", apply: "Apply" } as const;

function show(value: string | number | null, fallback = "Not provided") {
  return value === null || value === "" ? fallback : String(value);
}

export function DiagnosisView() {
  const ready = useClientReady();

  if (!ready) {
    return <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center text-muted shadow-sm">Loading your diagnosis…</div>;
  }

  const stored = loadStoredProfile();
  if (!stored?.completed) {
    return <EmptyState title="Complete your profile first" copy="Finish the admission profile so the full diagnosis can compare your current state with a selected target." action="Continue onboarding" />;
  }

  const program = getProgramById(loadSelectedProgram());
  const diagnosis = diagnoseTarget(stored.profile, program);
  if (!program || !diagnosis) {
    return <EmptyState title="Choose a target first" copy="Select a university program in onboarding so this diagnosis can use its current verified requirements." action="Choose a target" />;
  }

  return <DiagnosisContent profile={stored.profile} program={program} diagnosis={diagnosis} />;
}

const priorityChangeLabels: Record<RoadmapPriority, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

const criterionDisplayLabels: Record<ProfileProgramCriterion["key"], string> = {
  field: "Study field",
  academic: "Academic requirement",
  ielts: "IELTS requirement",
  sat: "SAT requirement",
  languageOfInstruction: "Language of instruction",
  tuition: "Tuition / budget",
  timeline: "Intake / deadline",
};

function roadmapTaskChangeCopy(change: RoadmapTaskChange): string {
  if (change.change === "added") return `New step: ${change.title}.`;
  if (change.change === "priority_changed") {
    return `${change.title} is now ${priorityChangeLabels[change.nextPriority]} priority.`;
  }
  return change.previousPriority === "high"
    ? `${change.title} is no longer a high-priority task.`
    : `${change.title} is no longer part of your roadmap.`;
}

function RecentImpactPanel({ impact }: { impact: ChangeImpact }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const targetPlan = impact.targetPlan;
  const inputChanges = impact.changedInputs.slice(0, 3).map(presentChangedInput);
  const criterionChanges = (targetPlan?.criterionChanges ?? []).slice(0, 3);
  const roadmapChanges = (targetPlan?.roadmapTaskChanges ?? []).slice(0, 2);
  const nextActionChange = targetPlan?.nextActionChange ?? null;
  const matchCounts = impactCounts(impact);
  const hasContent =
    inputChanges.length > 0 ||
    criterionChanges.length > 0 ||
    roadmapChanges.length > 0 ||
    nextActionChange !== null ||
    matchCounts.length > 0;
  if (!hasContent) return null;

  return (
    <section className="accent-section p-5 sm:p-7" aria-labelledby="recent-impact-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Change impact</p>
          <h2 id="recent-impact-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Your plan updated</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Recalculated from your saved profile. This comparison expires after a while.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearRecentChangeImpact();
            setDismissed(true);
          }}
          className="min-h-11 rounded-full px-3 text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
        >
          Dismiss
        </button>
      </div>

      {inputChanges.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {inputChanges.map(({ label, previous, next }) => (
            <span key={label} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-forest-900">
              {label}
              <span aria-hidden="true">·</span>
              <span>
                {previous ?? next}
                {previous && next ? <span aria-hidden="true"> → </span> : null}
                {previous && next ? next : null}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {criterionChanges.length ? (
        <ul className="mt-5 space-y-2">
          {criterionChanges.map((change) => (
            <li key={change.key} className="flex flex-wrap items-center gap-2 text-sm">
              <strong className="text-forest-900">{criterionDisplayLabels[change.key]}:</strong>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[change.previousStatus]}`}>{change.previousStatus}</span>
              <span aria-hidden="true" className="font-semibold text-muted">→</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[change.nextStatus]}`}>{change.nextStatus}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {nextActionChange ? (
        <p className="mt-5 text-sm font-semibold leading-6 text-forest-900">
          {nextActionChange.previousTitle && nextActionChange.nextTitle
            ? <>Next action changed: {nextActionChange.previousTitle} <span aria-hidden="true">→</span> {nextActionChange.nextTitle}</>
            : nextActionChange.nextTitle
              ? <>Next action: {nextActionChange.nextTitle}</>
              : <>All current roadmap steps are complete.</>}
        </p>
      ) : null}

      {roadmapChanges.length ? (
        <ul className="mt-3 space-y-1.5">
          {roadmapChanges.map((change) => (
            <li key={`${change.change}:${change.taskId}`} className="text-sm leading-6 text-ink">{roadmapTaskChangeCopy(change)}</li>
          ))}
        </ul>
      ) : null}

      {matchCounts.length ? (
        <p className="mt-5 border-t border-sand-300 pt-4 text-sm font-semibold text-forest-900">
          Match updates: {matchCounts.join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

function DiagnosisContent({
  profile,
  program,
  diagnosis,
}: {
  profile: StudentProfile;
  program: UniversityProgram;
  diagnosis: TargetDiagnosis;
}) {
  const { profileDiagnosis, recommendation } = diagnosis;
  const recentImpact = loadRecentChangeImpact();

  return (
    <div className="diagnosis-view space-y-8">
      <TargetSummary profile={profile} program={program} />

      {recentImpact ? <RecentImpactPanel impact={recentImpact} /> : null}

      <div className="editorial-section p-6 sm:p-8">
        <ProfileProgramComparison profile={profile} recommendation={recommendation} criteria={diagnosis.requirementCoverage} eyebrow="Requirement coverage" />
      </div>

      <section className="editorial-section p-6 sm:p-8" aria-labelledby="diagnosis-strengths-title">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Strengths</p>
        <h2 id="diagnosis-strengths-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">What we can use now</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted">Known profile information from the existing deterministic diagnosis. Activities are planning context only and never change Fit Score.</p>
        <AnalysisItems items={profileDiagnosis.strengths} marker="✓" empty="No known profile strengths are available yet." />
      </section>

      <BiggestGaps gaps={diagnosis.biggestGaps} />
      <VerificationItems items={diagnosis.unknowns} />
      <Priorities items={diagnosis.priorities} />
      <RoadmapPreview items={diagnosis.roadmapPreview} />

      <DiagnosisEnhancement profile={profile} diagnosis={profileDiagnosis} />
    </div>
  );
}

function TargetSummary({ profile, program }: { profile: StudentProfile; program: UniversityProgram }) {
  return (
    <section className="product-hero" aria-labelledby="diagnosis-target-title">
      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.75fr)]">
        <div className="p-6 sm:p-9 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-100">Your target</p>
          <p className="mt-5 font-semibold text-forest-100">{program.universityName}</p>
          <h1 id="diagnosis-target-title" className="mt-2 max-w-4xl text-4xl font-semibold leading-[0.92] sm:text-6xl lg:text-7xl">{program.programName}</h1>
          <p className="mt-4 text-forest-100">{program.country ?? "Country unknown"} · Target intake: {profile.targetIntake ?? "Not provided"}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 px-5 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Edit profile or target</Link>
            <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full px-5 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Review matches</Link>
          </div>
        </div>

        <div className="border-t border-white/15 bg-white/7 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-100">Current state used</p>
          <dl className="mt-5 divide-y divide-white/15">
            <ProfileGroup title="Study stage" values={[show(profile.currentStudyStage)]} />
            <ProfileGroup title="Academics" values={[`GPA ${show(profile.gpa)}`, `IELTS ${show(profile.ieltsScore)}`, `SAT ${show(profile.satScore)}`]} />
            <ProfileGroup title="Goal" values={[show(profile.targetDegree, "Degree not selected"), show(profile.intendedField, "Field not selected")]} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function BiggestGaps({ gaps }: { gaps: ProfileProgramCriterion[] }) {
  return (
    <section className="accent-section p-6 sm:p-8" aria-labelledby="diagnosis-gaps-title">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Biggest gaps</p>
      <h2 id="diagnosis-gaps-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Confirmed requirement gaps</h2>
      <p className="mt-2 max-w-2xl leading-7 text-ink/80">Only known, directly comparable academic or test requirements appear here.</p>
      {gaps.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {gaps.map((gap) => (
            <article key={gap.key} className="rounded-2xl border border-amber-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-semibold text-forest-900">{gap.label}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[gap.status]}`}>{gap.status}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">Current: {gap.profileValue}</p>
              <p className="mt-1 text-sm font-semibold text-ink">Requirement: {gap.programValue}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{gap.detail}</p>
            </article>
          ))}
        </div>
      ) : <p className="mt-5 rounded-xl bg-white p-4 text-sm leading-6 text-muted">No confirmed gap appears in the comparable academic and test values provided. This is not an admission guarantee.</p>}
    </section>
  );
}

function VerificationItems({ items }: { items: DiagnosisVerificationItem[] }) {
  return (
    <section className="editorial-section p-6 sm:p-8" aria-labelledby="diagnosis-unknown-title">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Unknown / needs verification</p>
      <h2 id="diagnosis-unknown-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">What still needs confirmation</h2>
      <p className="mt-2 max-w-2xl leading-7 text-muted">Missing or non-comparable information stays separate from confirmed gaps.</p>
      {items.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.key} className="rounded-2xl border border-forest-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-forest-900">{item.label}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[item.status]}`}>{item.status}</span>
              </div>
              {item.currentValue ? <p className="mt-3 text-sm text-ink">Current: <strong>{item.currentValue}</strong></p> : null}
              <p className="mt-1 text-sm text-ink">Requirement: <strong>{item.requirementValue}</strong></p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
            </article>
          ))}
        </div>
      ) : <p className="mt-5 text-sm leading-6 text-muted">No current requirement or profile fact is waiting for verification.</p>}
    </section>
  );
}

function Priorities({ items }: { items: TargetDiagnosis["priorities"] }) {
  return (
    <section aria-labelledby="diagnosis-priorities-title">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Recommended priorities</p>
      <h2 id="diagnosis-priorities-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">What to do next — and why</h2>
      <ol className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="editorial-section grid gap-4 p-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:p-6">
            <span className="flex size-9 items-center justify-center rounded-full bg-forest-700 text-sm font-bold text-white">{index + 1}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-forest-900">{item.title}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priorityStyles[item.basis]}`}>{item.basis}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">Related requirement: {item.relatedRequirement}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              <SourceLink label={item.officialSourceLabel} url={item.officialSourceUrl} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RoadmapPreview({ items }: { items: RoadmapItem[] }) {
  return (
    <section className="editorial-section p-6 sm:p-8" aria-labelledby="diagnosis-roadmap-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Roadmap preview</p>
          <h2 id="diagnosis-roadmap-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Your first plan steps</h2>
          <p className="mt-2 max-w-2xl leading-7 text-muted">A preview from the current deterministic roadmap. Progress and the full phase view live in Roadmap.</p>
        </div>
        <Link href="/roadmap" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Open full roadmap</Link>
      </div>
      <ol className="mt-6 grid gap-4 lg:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-2xl border border-forest-100 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-600">{String(index + 1).padStart(2, "0")} · {phaseLabels[item.phase]}</p>
            <h3 className="mt-2 font-semibold text-forest-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
            <SourceLink label={item.officialSourceLabel} url={item.officialSourceUrl} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function SourceLink({ label, url }: { label: string | null; url: string | null }) {
  return url && label ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View {label}</a> : null;
}

function ProfileGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-100">{title}</dt>
      <dd className="mt-2 space-y-1 text-sm font-medium leading-5 text-white">{values.map((value, index) => <p key={`${title}-${index}`}>{value}</p>)}</dd>
    </div>
  );
}

function AnalysisItems({ items, marker, empty }: { items: string[]; marker: string; empty: string }) {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.length ? items.map((item) => (
        <li key={item} className="flex gap-3 rounded-xl border border-forest-100 bg-white p-4 text-sm leading-6 text-ink">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700" aria-hidden="true">{marker}</span>
          <span>{item}</span>
        </li>
      )) : <li className="text-sm text-muted">{empty}</li>}
    </ul>
  );
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action: string }) {
  return (
    <section className="rounded-3xl border border-forest-100 bg-white p-7 text-center shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold text-forest-900">{title}</h1>
      <p className="mx-auto mt-3 max-w-md leading-7 text-muted">{copy}</p>
      <Link href="/onboarding" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">{action}</Link>
    </section>
  );
}
