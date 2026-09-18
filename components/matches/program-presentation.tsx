import Link from "next/link";
import type { EligibilityStatus, Recommendation, StudentProfile } from "../../types/admissions.ts";
import { emptyProfile } from "../../lib/onboarding.ts";
import {
  buildCardEvidence,
  buildProfileProgramCriteria,
  eligibilityLabels,
  formatLanguageOfInstruction,
  formatRequirement,
  formatScoreComponent,
  formatTuition,
  getCompareButtonPresentation,
  scoreComponents,
  sourceTypeLabels,
} from "../../lib/admissions/presentation.ts";
import type { ComparisonStatus } from "../../lib/admissions/presentation.ts";

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
        <p className="text-xs font-medium text-forest-100">Profile alignment</p>
        <p className="mt-1 text-3xl font-semibold">Fit {recommendation.fitScore}</p>
        <p className="text-xs text-forest-100">not admission probability</p>
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
    ["Language of instruction", formatLanguageOfInstruction(program)],
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

export const comparisonStatusStyles: Record<ComparisonStatus, string> = {
  "Match": "bg-forest-100 text-forest-700",
  "Action needed": "bg-amber-100 text-amber-900",
  "Needs verification": "bg-slate-100 text-slate-700",
  "Not required": "bg-forest-50 text-forest-700",
  "Not comparable": "bg-slate-100 text-slate-700",
};

export function ProfileProgramComparison({
  profile,
  recommendation,
  criteria: providedCriteria,
  eyebrow = "The decision view",
}: {
  profile: StudentProfile;
  recommendation: Recommendation;
  criteria?: ReturnType<typeof buildProfileProgramCriteria>;
  eyebrow?: string;
}) {
  const criteria = providedCriteria ?? buildProfileProgramCriteria(profile, recommendation);
  return (
    <section aria-labelledby="profile-comparison-title">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">{eyebrow}</p>
        <h2 id="profile-comparison-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900 sm:text-3xl">Your profile vs this program</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Known facts are compared directly. Missing or non-comparable information stays explicit.</p>
      </div>

      <div className="mt-8 hidden grid-cols-[minmax(9rem,.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,.8fr)] gap-5 border-b border-forest-200 px-4 pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:grid" aria-hidden="true">
        <span>Criterion</span><span>Your profile</span><span>Program</span><span>Status</span>
      </div>
      <div className="divide-y divide-forest-100 border-y border-forest-100 md:border-t-0">
        {criteria.map((criterion) => (
          <article key={criterion.key} className="grid gap-3 py-6 md:grid-cols-[minmax(9rem,.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,.8fr)] md:gap-5 md:px-4">
            <h3 className="font-semibold text-forest-900">{criterion.label}</h3>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:sr-only">Your profile</p>
              <p className="mt-1 break-words text-sm font-semibold text-ink md:mt-0">{criterion.profileValue}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:sr-only">Program</p>
              <p className="mt-1 break-words text-sm font-semibold text-ink md:mt-0">{criterion.programValue}</p>
            </div>
            <div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${comparisonStatusStyles[criterion.status]}`}>{criterion.status}</span>
              <p className="mt-2 text-xs leading-5 text-muted">{criterion.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WhyProgramAppears({ recommendation }: { recommendation: Recommendation }) {
  return (
    <section aria-labelledby="why-program-title">
      <h2 id="why-program-title" className="text-xl font-semibold text-forest-900">Why this program appears</h2>
      <ul className="mt-3 space-y-2">
        {recommendation.reasons.slice(0, 3).map((reason) => (
          <li key={reason} className="flex gap-2.5 text-sm leading-6 text-ink">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[11px] font-bold text-forest-700" aria-hidden="true">✓</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </section>
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
            <li key={`${source.type}:${source.url}`} className="border-t border-black/10 first:border-t-0">
              <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.title} (opens in a new tab)`} className="block px-1 py-3 text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
                <span className="mr-2 text-xs uppercase tracking-wide text-muted">{sourceTypeLabels[source.type]}</span>{source.title}
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

export function RecommendationCard({
  recommendation,
  profile,
  rank,
  recentChange,
  selected,
  disabled,
  compareReady,
  onCompare,
}: {
  recommendation: Recommendation;
  profile?: StudentProfile;
  rank: number;
  recentChange?: string | null;
  selected: boolean;
  disabled: boolean;
  compareReady: boolean;
  onCompare: () => void;
}) {
  const { program } = recommendation;
  const cardProfile = profile ?? emptyProfile;
  const evidence = buildCardEvidence(cardProfile, recommendation);
  const compareButton = getCompareButtonPresentation({
    isSelected: selected,
    isFull: disabled,
    programName: program.programName,
  });

  return (
    <article className="recommendation-row py-7 sm:py-10">
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
        <p className="font-mono text-4xl font-semibold tracking-[-0.06em] text-forest-600 sm:text-5xl" aria-label={`Rank ${rank}`}>{String(rank).padStart(2, "0")}</p>
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
        <div className="border-l-4 border-[var(--accent)] bg-forest-900 px-5 py-4 text-white sm:min-w-36 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-100">Profile match</p>
          <p className="mt-1 text-3xl font-semibold">Fit {recommendation.fitScore}</p>
          <p className="mt-1 max-w-48 text-xs leading-5 text-forest-100">Based on {recommendation.dataCoverage}% comparable known inputs</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 border-t border-forest-100 pt-5 md:grid-cols-[minmax(0,1.25fr)_minmax(15rem,.75fr)]">
        <section aria-labelledby={`why-${program.id}`}>
          <h3 id={`why-${program.id}`} className="text-sm font-semibold text-forest-900">Why this program appears</h3>
          <div className="mt-3 space-y-2">
            {evidence.map((criterion) => (
              <div
                key={criterion.key}
                className="flex flex-col gap-1 rounded-xl bg-forest-50/60 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
                    <span className="font-semibold text-forest-900">{criterion.label}</span>
                    <span className="text-muted">· {criterion.programValue}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">{criterion.detail}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:self-center ${comparisonStatusStyles[criterion.status]}`}
                >
                  {criterion.status}
                </span>
              </div>
            ))}
          </div>
        </section>
        <div>
          <div className="rounded-2xl border border-forest-100 bg-forest-50/40 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Published tuition</p>
              <p className="mt-1 font-semibold text-forest-900">{formatTuition(program)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Application deadline</p>
              <p className="mt-1 font-semibold text-forest-900">{program.deadline ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Teaching language</p>
              <p className="mt-1 font-semibold text-forest-900">{formatLanguageOfInstruction(program)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-forest-100 pt-5 sm:flex-row sm:justify-end">
        <Link href={`/matches/${program.id}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">View program</Link>
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onCompare}
          title={compareButton.title}
          aria-label={compareButton.ariaLabel}
          className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {compareButton.text}
        </button>
        {compareReady ? <Link href="/compare" className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-900 px-6 font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Compare 2 programs</Link> : null}
      </div>
    </article>
  );
}
