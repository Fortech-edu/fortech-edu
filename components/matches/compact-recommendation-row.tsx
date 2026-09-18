import Link from "next/link";
import type { Recommendation, StudentProfile } from "../../types/admissions.ts";
import { emptyProfile } from "../../lib/onboarding.ts";
import {
  buildCardEvidence,
  formatLanguageOfInstruction,
  formatTuition,
  getCompareButtonPresentation,
} from "../../lib/admissions/presentation.ts";
import { UniversityIdentity } from "../ui/university-identity.tsx";
import { comparisonStatusStyles, EligibilityBadge } from "./program-presentation.tsx";

export function CompactRecommendationRow({
  recommendation,
  profile,
  rank,
  recentChange,
  selected,
  disabled,
  compareReady,
  expanded,
  onCompare,
  onExpand,
}: {
  recommendation: Recommendation;
  profile?: StudentProfile;
  rank: number;
  recentChange?: string | null;
  selected: boolean;
  disabled: boolean;
  compareReady: boolean;
  expanded: boolean;
  onCompare: () => void;
  onExpand: () => void;
}) {
  const { program } = recommendation;
  const evidence = buildCardEvidence(profile ?? emptyProfile, recommendation);
  const compareButton = getCompareButtonPresentation({
    isSelected: selected,
    isFull: disabled,
    programName: program.programName,
  });
  const location = [program.country, program.city].filter(Boolean).join(" · ") || "Location unknown";

  return (
    <article className={`match-result ${expanded ? "is-expanded" : ""}`}>
      <button
        type="button"
        className="match-result-trigger"
        aria-expanded={expanded}
        aria-controls={`match-details-${program.id}`}
        onClick={onExpand}
      >
        <span className="match-rank" aria-label={`Rank ${rank}`}>{String(rank).padStart(2, "0")}</span>
        <UniversityIdentity
          universityName={program.universityName}
          programName={program.programName}
          location={location}
          degreeLevel={program.degreeLevel}
          showMonogram
          size="lg"
          className="text-left"
        />
        <span className="match-result-score">
          <EligibilityBadge status={recommendation.eligibility} />
          <strong>Fit {recommendation.fitScore}</strong>
          <small>{recommendation.dataCoverage}% coverage</small>
        </span>
        <span className={`match-chevron ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
      </button>

      {expanded ? (
        <div id={`match-details-${program.id}`} className="match-result-details">
          {recentChange ? <p className="mb-4 text-sm font-semibold text-[var(--status-action-text)]">{recentChange}</p> : null}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,.75fr)]">
            <section aria-labelledby={`why-${program.id}`}>
              <h3 id={`why-${program.id}`} className="text-sm font-semibold text-text-primary">Why this program appears</h3>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {evidence.map((criterion) => (
                  <div key={criterion.key} className="grid gap-2 py-3 sm:grid-cols-[minmax(8rem,.6fr)_minmax(0,1.5fr)_auto] sm:items-center">
                    <span className="text-sm font-semibold text-text-primary">{criterion.label}</span>
                    <span className="text-sm leading-5 text-text-muted">{criterion.programValue} · {criterion.detail}</span>
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${comparisonStatusStyles[criterion.status]}`}>{criterion.status}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-4" aria-label="Key admissions facts">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Main concern</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-primary">{recommendation.gaps[0] ?? "No confirmed concern in the known comparable data."}</p>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-text-muted">Tuition</dt><dd className="mt-1 font-semibold text-text-primary">{formatTuition(program)}</dd></div>
                <div><dt className="text-text-muted">Deadline</dt><dd className="mt-1 font-semibold text-text-primary">{program.deadline ?? "Needs verification"}</dd></div>
                <div><dt className="text-text-muted">Language</dt><dd className="mt-1 font-semibold text-text-primary">{formatLanguageOfInstruction(program)}</dd></div>
                <div><dt className="text-text-muted">Source state</dt><dd className="mt-1 font-semibold text-text-primary">{program.verificationDate ? `Verified ${program.verificationDate}` : "Needs verification"}</dd></div>
              </dl>
            </section>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Link href={`/matches/${program.id}`} className="product-button-primary">View program</Link>
            <button type="button" aria-pressed={selected} disabled={disabled} onClick={onCompare} title={compareButton.title} aria-label={compareButton.ariaLabel} className="product-button-secondary disabled:cursor-not-allowed disabled:opacity-45">{compareButton.text}</button>
            {compareReady ? <Link href="/compare" className="product-button-primary">Compare 2 programs</Link> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
