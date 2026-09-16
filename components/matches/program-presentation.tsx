import Link from "next/link";
import type { EligibilityStatus, Recommendation } from "../../types/admissions.ts";
import {
  eligibilityLabels,
  formatRequirement,
  formatScoreComponent,
  formatTuition,
  getProgramSource,
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
  const source = getProgramSource(program);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {program.isDemo && <span className="rounded-full bg-sand-100 px-2.5 py-1 font-bold text-amber-900">Demo data</span>}
      {source ? (
        <a href={source.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
          {source.label}
        </a>
      ) : <span className="text-muted">No source link provided</span>}
    </div>
  );
}

export function RecommendationCard({ recommendation, selected, disabled, onCompare }: { recommendation: Recommendation; selected: boolean; disabled: boolean; onCompare: () => void }) {
  const { program } = recommendation;
  return (
    <article className="rounded-3xl border border-forest-100 bg-white p-5 shadow-[0_16px_50px_rgba(23,52,41,.06)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><EligibilityBadge status={recommendation.eligibility} /><SourceState recommendation={recommendation} /></div>
          <p className="mt-4 text-sm font-semibold text-forest-600">{program.universityName}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-forest-900">{program.programName}</h2>
          <p className="mt-1 text-sm text-muted">{program.country ?? "Unknown country"} · {program.field}</p>
        </div>
        <div className="w-full lg:w-72"><ScoreSummary recommendation={recommendation} /></div>
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        Fit Score measures how well this program matches your profile. It is not your probability of admission.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <ProgramFacts recommendation={recommendation} />
        <ReasonsAndGaps recommendation={recommendation} />
      </div>

      <details className="mt-5 rounded-2xl border border-forest-100 p-4">
        <summary className="cursor-pointer font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">See score breakdown</summary>
        <div className="mt-4"><ScoreBreakdown recommendation={recommendation} /></div>
      </details>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href={`/matches/${program.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest-700 px-5 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View details</Link>
        <button type="button" aria-pressed={selected} disabled={disabled} onClick={onCompare} className="min-h-11 rounded-full border border-forest-200 px-5 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-45">
          {selected ? "Remove from compare" : "Compare"}
        </button>
      </div>
    </article>
  );
}
