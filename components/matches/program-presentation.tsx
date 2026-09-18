import Link from "next/link";
import type { EligibilityStatus, Recommendation } from "../../types/admissions.ts";
import {
  eligibilityLabels,
  formatRequirement,
  formatScoreComponent,
  formatTuition,
  scoreComponents,
} from "../../lib/admissions/presentation.ts";

const statusStyles: Record<EligibilityStatus, string> = {
  eligible_now: "bg-forest-100 text-forest-700",
  with_actions: "bg-amber-100 text-amber-900",
  requires_verification: "bg-slate-100 text-slate-700",
  not_eligible: "bg-rose-100 text-rose-800",
};

export function EligibilityBadge({ status }: { status: EligibilityStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
      {eligibilityLabels[status]}
    </span>
  );
}

export function ScoreSummary({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-forest-900 p-4 text-white">
        <p className="text-xs font-medium text-forest-100">Profile match</p>
        <p className="mt-1 text-3xl font-semibold">{recommendation.fitScore}</p>
        <p className="text-xs text-forest-100">out of 100</p>
      </div>
      <div className="rounded-2xl bg-forest-50 p-4">
        <p className="text-xs font-medium text-muted">Data coverage</p>
        <p className="mt-1 text-3xl font-semibold text-forest-900">{recommendation.dataCoverage}%</p>
        <p className="text-xs text-muted">known score inputs</p>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {scoreComponents.map(({ key, label }) => {
          const value = recommendation.breakdown[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-forest-50 px-3 py-2.5 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className={`font-semibold ${value === null ? "text-slate-500" : "text-ink"}`}>
                {formatScoreComponent(value)}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted">
        Lower coverage means some profile or program information is still unknown.
      </p>
    </div>
  );
}

export function ProgramFacts({ recommendation }: { recommendation: Recommendation }) {
  const { program } = recommendation;
  const facts = [
    ["Country", program.country ?? "Unknown"],
    ["City", program.city ?? "Unknown"],
    ["Field", program.field || "Unknown"],
    ["Tuition", formatTuition(program)],
    ["IELTS", formatRequirement(program.ieltsRequirement)],
    ["SAT", formatRequirement(program.satRequirement)],
    ["Academic", formatRequirement(program.academicRequirement)],
    ["Deadline", program.deadline ?? "Unknown"],
  ];

  return (
    <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
      {facts.map(([term, value]) => (
        <div key={term}>
          <dt className="text-muted">{term}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReasonsAndGaps({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <List title="Why it fits" items={recommendation.reasons} marker="✓" markerClass="bg-forest-100 text-forest-700" />
      <List title="Pay attention to" items={recommendation.gaps} marker="!" markerClass="bg-sand-100 text-amber-900" />
    </div>
  );
}

function List({ title, items, marker, markerClass }: { title: string; items: string[]; marker: string; markerClass: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-forest-900">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.length ? items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-5 text-ink">
            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${markerClass}`} aria-hidden="true">{marker}</span>
            <span>{item}</span>
          </li>
        )) : <li className="text-sm text-muted">None identified.</li>}
      </ul>
    </div>
  );
}

export function SourceState({ recommendation }: { recommendation: Recommendation }) {
  const { program } = recommendation;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full bg-forest-50 px-2.5 py-1 font-semibold text-forest-700">
        {program.verificationDate ? `Verified ${program.verificationDate}` : "Verification date unknown"}
      </span>
    </div>
  );
}

export function ProgramSources({ recommendation }: { recommendation: Recommendation }) {
  const { program } = recommendation;
  return (
    <section className="mt-7 border-t border-forest-100 pt-7">
      <h2 className="text-xl font-semibold text-forest-900">Official sources</h2>
      <p className="mt-2 text-sm text-muted">Verified {program.verificationDate ?? "on an unknown date"}. Requirements and fees can change.</p>
      {program.sources.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {program.sources.map((source) => (
            <li key={`${source.type}:${source.url}`}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.title} (opens in a new tab)`} className="block rounded-xl bg-forest-50 px-3 py-2.5 text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
                <span className="mr-2 text-xs uppercase tracking-wide text-muted">{source.type}</span>{source.title}
              </a>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-muted">No official source link is available.</p>}
      <div className="mt-4 space-y-2 text-sm leading-6 text-muted">
        {program.tuitionNotes && <p><span className="font-semibold text-ink">Tuition note:</span> {program.tuitionNotes}</p>}
        {[program.academicRequirement, program.ieltsRequirement, program.satRequirement].map((requirement) => requirement?.notes && (
          <p key={requirement.label}><span className="font-semibold text-ink">{requirement.label} note:</span> {requirement.notes}</p>
        ))}
      </div>
    </section>
  );
}

export function RecommendationCard({ recommendation, rank, recentChange, selected, disabled, compareReady, onCompare }: { recommendation: Recommendation; rank: number; recentChange?: string | null; selected: boolean; disabled: boolean; compareReady: boolean; onCompare: () => void }) {
  const { program } = recommendation;
  const reasons = recommendation.reasons.slice(0, 2);
  const watchOut = recommendation.gaps[0];
  return (
    <article className="rounded-[1.75rem] border border-forest-100 bg-white p-5 shadow-[0_16px_50px_rgba(23,52,41,.06)] sm:p-7">
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
        <p className="text-2xl font-semibold tracking-tight text-forest-600" aria-label={`Rank ${rank}`}>#{rank}</p>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <EligibilityBadge status={recommendation.eligibility} />
            {recentChange ? <span className="inline-flex rounded-full border border-sand-300 bg-sand-100 px-3 py-1 text-xs font-bold text-forest-900">{recentChange}</span> : null}
          </div>
          <p className="mt-4 text-sm font-semibold text-forest-600">{program.universityName}</p>
          <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight text-forest-900 sm:text-[1.7rem]">{program.programName}</h2>
          <p className="mt-2 text-sm text-muted">{program.country ?? "Unknown country"} · {program.degreeLevel ?? "Degree unknown"}</p>
          <div className="mt-3"><SourceState recommendation={recommendation} /></div>
        </div>
        <div className="rounded-2xl bg-forest-900 px-5 py-4 text-white sm:min-w-36 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-100">Profile match</p>
          <p className="mt-1 text-3xl font-semibold">Fit {recommendation.fitScore}</p>
          <p className="mt-1 max-w-48 text-xs leading-5 text-forest-100">Based on {recommendation.dataCoverage}% comparable known inputs</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 border-t border-forest-100 pt-5 md:grid-cols-[minmax(0,1.25fr)_minmax(15rem,.75fr)]">
        <section aria-labelledby={`why-${program.id}`}>
          <h3 id={`why-${program.id}`} className="text-sm font-semibold text-forest-900">Why it matches you</h3>
          <ul className="mt-3 space-y-2">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5 text-sm leading-5 text-ink">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[11px] font-bold text-forest-700" aria-hidden="true">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>
        <div>
          {watchOut ? (
            <section aria-labelledby={`watch-${program.id}`}>
              <h3 id={`watch-${program.id}`} className="text-sm font-semibold text-forest-900">Watch first</h3>
              <p className="mt-3 flex gap-2.5 text-sm leading-5 text-ink">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sand-100 text-[11px] font-bold text-amber-900" aria-hidden="true">!</span>
                <span>{watchOut}</span>
              </p>
            </section>
          ) : null}
          <div className={watchOut ? "mt-5" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Tuition</p>
            <p className="mt-1 font-semibold text-forest-900">{formatTuition(program)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-forest-100 pt-5 sm:flex-row sm:justify-end">
        <Link href={`/matches/${program.id}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View program</Link>
        <button type="button" aria-pressed={selected} disabled={disabled} onClick={onCompare} className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-45">
          {selected ? "Selected · Remove" : disabled ? "Compare limit reached" : "Compare"}
        </button>
        {compareReady ? <Link href="/compare" className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-900 px-6 font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Compare 2 programs</Link> : null}
      </div>
    </article>
  );
}
