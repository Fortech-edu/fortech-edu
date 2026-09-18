"use client";

import { useState } from "react";
import Link from "next/link";
import { getProgramById } from "../../data/programs.ts";
import type { ChangeImpact, RoadmapTaskChange } from "../../lib/admissions/change-impact.ts";
import { impactCounts, presentChangedInput } from "../../lib/admissions/change-impact-presentation.ts";
import {
  buildDiagnosisSummary,
  diagnoseTarget,
  type DiagnosisVerificationItem,
  type TargetDiagnosis,
} from "../../lib/admissions/diagnosis.ts";
import type { ComparisonStatus, ProfileProgramCriterion } from "../../lib/admissions/presentation.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { clearRecentChangeImpact, loadRecentChangeImpact } from "../../lib/storage/change-impact.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import { loadSelectedProgram } from "../../lib/storage/selection.ts";
import type { RoadmapPriority, StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { DiagnosisEnhancement } from "../ai/enhancements.tsx";
import { ProfileProgramComparison } from "../matches/program-presentation.tsx";

const statusStyles: Record<ComparisonStatus, string> = {
  Match: "bg-forest-100 text-forest-700",
  "Action needed": "bg-amber-100 text-amber-900",
  "Needs verification": "bg-slate-100 text-slate-700",
  "Not required": "bg-forest-50 text-forest-700",
  "Not comparable": "bg-slate-100 text-slate-700",
};

const priorityStyles = {
  "Confirmed gap": "bg-amber-100 text-amber-900",
  "Missing current value": "bg-slate-100 text-slate-700",
  "Needs verification": "bg-slate-100 text-slate-700",
} as const;

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
  const targetChange = targetPlan?.targetChange ?? null;
  const inputChanges = impact.changedInputs.slice(0, 3).map(presentChangedInput);
  const criterionChanges = (targetPlan?.criterionChanges ?? []).slice(0, 3);
  const roadmapChanges = (targetPlan?.roadmapTaskChanges ?? []).slice(0, 2);
  const nextActionChange = targetPlan?.nextActionChange ?? null;
  const matchCounts = impactCounts(impact);
  const hasContent =
    targetChange !== null ||
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

      {targetChange ? (
        <p className="mt-5 text-sm font-semibold leading-6 text-forest-900">
          Target changed: {targetChange.previousName} <span aria-hidden="true">→</span> {targetChange.nextName}
        </p>
      ) : null}

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
    <div className="diagnosis-view space-y-6 sm:space-y-8">
      <TargetSummary profile={profile} program={program} />

      {recentImpact ? <RecentImpactPanel impact={recentImpact} /> : null}

      <DiagnosisSummaryPanel diagnosis={diagnosis} />

      <div className="editorial-section p-6 sm:p-8">
        <ProfileProgramComparison profile={profile} recommendation={recommendation} criteria={diagnosis.requirementCoverage} eyebrow="Requirement coverage" />
      </div>

      <DiagnosisEvidence gaps={diagnosis.biggestGaps} unknowns={diagnosis.unknowns} />
      <PlanPreview items={diagnosis.priorities} />

      <section className="editorial-section p-6 sm:p-8" aria-labelledby="diagnosis-strengths-title">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Supporting profile context</p>
        <h2 id="diagnosis-strengths-title" className="mt-2 text-xl font-semibold tracking-tight text-forest-900">What we can use now</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted">Known profile information from the existing deterministic diagnosis. Activities are planning context only and never change Fit Score.</p>
        <AnalysisItems items={profileDiagnosis.strengths} marker="✓" empty="No known profile strengths are available yet." />
      </section>

      <DiagnosisEnhancement profile={profile} diagnosis={profileDiagnosis} />
    </div>
  );
}

function TargetSummary({ profile, program }: { profile: StudentProfile; program: UniversityProgram }) {
  return (
    <section className="product-hero" aria-labelledby="diagnosis-target-title">
      <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.75fr)]">
        <div className="p-5 sm:p-7 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-100">Your target</p>
          <p className="mt-3 font-semibold text-forest-100">{program.universityName}</p>
          <h1 id="diagnosis-target-title" className="mt-1 max-w-4xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{program.programName}</h1>
          <p className="mt-3 text-sm text-forest-100">{program.country ?? "Country unknown"} · Target intake: {profile.targetIntake ?? "Not provided"}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 px-2 text-center text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Edit profile or target</Link>
            <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-center text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Review matches</Link>
          </div>
        </div>

        <div className="border-t border-white/15 bg-white/7 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-100">Current state used</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
            <ProfileFact label="Study stage" value={show(profile.currentStudyStage)} />
            <ProfileFact label="GPA" value={show(profile.gpa)} />
            <ProfileFact label="IELTS" value={show(profile.ieltsScore)} />
            <ProfileFact label="SAT" value={show(profile.satScore)} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function DiagnosisSummaryPanel({ diagnosis }: { diagnosis: TargetDiagnosis }) {
  const summary = buildDiagnosisSummary(diagnosis);
  const countPills = [
    { label: "Match", count: summary.requirementCounts.match, style: statusStyles.Match },
    { label: "Action needed", count: summary.requirementCounts.actionNeeded, style: statusStyles["Action needed"] },
    { label: "Needs verification", count: summary.requirementCounts.needsVerification, style: statusStyles["Needs verification"] },
  ].filter(({ count }) => count > 0);
  const gap = summary.biggestConfirmedGap;
  const nextAction = summary.nextAction;

  return (
    <section className="editorial-section p-5 sm:p-8" aria-labelledby="diagnosis-summary-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Current deterministic result</p>
          <h2 id="diagnosis-summary-title" className="mt-2 text-3xl font-semibold tracking-tight text-forest-900">Your diagnosis</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">This is the current state. When shown above, Change Impact explains what changed.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Requirement state counts">
          {countPills.map(({ label, count, style }) => (
            <span key={label} className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${style}`}>{count} {label}</span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className={`rounded-2xl border p-5 ${gap ? "border-amber-300 bg-amber-50" : "border-forest-100 bg-forest-50/50"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-amber-900">Biggest confirmed gap</p>
            {gap ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[gap.status]}`}>{gap.status}</span> : null}
          </div>
          {gap ? (
            <>
              <h3 className="mt-3 text-xl font-semibold text-forest-900">{gap.label}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted">Current</dt><dd className="mt-1 font-semibold text-ink">{gap.profileValue}</dd></div>
                <div><dt className="text-muted">Requirement</dt><dd className="mt-1 font-semibold text-ink">{gap.programValue}</dd></div>
              </dl>
              <p className="mt-4 text-sm font-semibold leading-6 text-amber-950">{gap.detail}</p>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-xl font-semibold text-forest-900">No confirmed comparable gap</h3>
              <p className="mt-2 text-sm leading-6 text-muted">No provided value is below a directly comparable published minimum. This does not guarantee admission.</p>
            </>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-600">What still needs verification</p>
            {summary.verificationCount ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles["Needs verification"]}`}>Needs verification</span> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold text-forest-900">{summary.verificationCount} {summary.verificationCount === 1 ? "item" : "items"} still need verification</h3>
          {summary.verificationPreview.length ? (
            <>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink">{summary.verificationPreview.map(({ label }) => label).join(" · ")}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{summary.verificationPreview[0].detail}</p>
            </>
          ) : <p className="mt-2 text-sm leading-6 text-muted">No current requirement or profile fact is waiting for verification.</p>}
        </article>

        <article className="rounded-2xl bg-forest-900 p-5 text-white sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-100">Next action</p>
              {nextAction ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold sm:text-2xl">{nextAction.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priorityStyles[nextAction.basis]}`}>{nextAction.basis}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-forest-100">Related requirement: {nextAction.relatedRequirement}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-forest-100">{nextAction.description}</p>
                </>
              ) : (
                <>
                  <h3 className="mt-3 text-xl font-semibold">{summary.verificationCount ? "Verification is the next step" : "No current action is generated"}</h3>
                  <p className="mt-2 text-sm leading-6 text-forest-100">{summary.verificationCount ? "Confirm the remaining unknown information before drawing a stronger conclusion." : "Review the full roadmap and official sources before applying. This is not an admission guarantee."}</p>
                </>
              )}
            </div>
            <Link href="/roadmap" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 font-semibold text-forest-900 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Open roadmap</Link>
          </div>
        </article>
      </div>
    </section>
  );
}

function DiagnosisEvidence({ gaps, unknowns }: { gaps: ProfileProgramCriterion[]; unknowns: DiagnosisVerificationItem[] }) {
  return (
    <section aria-labelledby="diagnosis-evidence-title">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Evidence by state</p>
      <h2 id="diagnosis-evidence-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">Confirmed gaps and verification work</h2>
      <p className="mt-2 max-w-2xl leading-7 text-muted">Confirmed gaps use comparable published requirements. Unknown or non-comparable information stays neutral.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-forest-900">Action needed</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles["Action needed"]}`}>{gaps.length} confirmed</span>
          </div>
          {gaps.length ? (
            <div className="mt-4 space-y-3">
              {gaps.map((gap) => (
                <article key={gap.key} className="rounded-xl border border-amber-200 bg-white p-4">
                  <h4 className="font-semibold text-forest-900">{gap.label}</h4>
                  <p className="mt-2 text-sm font-semibold text-ink">Current: {gap.profileValue}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">Requirement: {gap.programValue}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{gap.detail}</p>
                </article>
              ))}
            </div>
          ) : <p className="mt-4 text-sm leading-6 text-muted">No confirmed comparable gap. This is not an admission guarantee.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-forest-900">Needs verification</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles["Needs verification"]}`}>{unknowns.length} to check</span>
          </div>
          {unknowns.length ? (
            <div className="mt-4 space-y-3">
              {unknowns.map((item) => (
                <article key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-semibold text-forest-900">{item.label}</h4>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[item.status]}`}>{item.status}</span>
                  </div>
                  {item.currentValue ? <p className="mt-2 text-sm text-ink">Current: <strong>{item.currentValue}</strong></p> : null}
                  <p className="mt-1 text-sm text-ink">Requirement: <strong>{item.requirementValue}</strong></p>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                </article>
              ))}
            </div>
          ) : <p className="mt-4 text-sm leading-6 text-muted">No current requirement or profile fact is waiting for verification.</p>}
        </div>
      </div>
    </section>
  );
}

function PlanPreview({ items }: { items: TargetDiagnosis["priorities"] }) {
  const following = items.slice(1, 3);
  return (
    <section className="editorial-section p-6 sm:p-8" aria-labelledby="diagnosis-plan-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Roadmap preview</p>
          <h2 id="diagnosis-plan-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">After your next action</h2>
          <p className="mt-2 max-w-2xl leading-7 text-muted">The diagnosis highlights what follows. Progress and the complete phase plan live in Roadmap.</p>
        </div>
        <Link href="/roadmap" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Open full roadmap</Link>
      </div>
      {following.length ? (
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {following.map((item, index) => (
            <li key={item.id} className="rounded-2xl border border-forest-100 bg-forest-50/40 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-white">{index + 2}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priorityStyles[item.basis]}`}>{item.basis}</span>
              </div>
              <h3 className="mt-3 font-semibold text-forest-900">{item.title}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">Related requirement: {item.relatedRequirement}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              <SourceLink label={item.officialSourceLabel} url={item.officialSourceUrl} />
            </li>
          ))}
        </ol>
      ) : <p className="mt-5 text-sm leading-6 text-muted">No further diagnosis priorities are generated. Review the full roadmap and official sources before applying.</p>}
    </section>
  );
}

function SourceLink({ label, url }: { label: string | null; url: string | null }) {
  return url && label ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View {label}</a> : null;
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-white/15 pt-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-forest-100">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-white">{value}</dd>
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
