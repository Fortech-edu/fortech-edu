import type {
  ChangeImpact,
  ChangedProfileInput,
  ProgramChange,
} from "./change-impact.ts";

const show = (value: string | number | null) =>
  value === null || value === "" ? "Not provided" : String(value);

const money = (value: number | null, currency: string | null) =>
  value === null
    ? "Not provided"
    : `${currency ?? "Unknown currency"} ${value.toLocaleString("en-US")}`;

export function presentChangedInput(change: ChangedProfileInput) {
  if (change.input === "preferredCountries") {
    return {
      label: "Countries",
      previous: change.removedCountries.length ? `Removed ${change.removedCountries.join(", ")}` : null,
      next: change.addedCountries.length ? `Added ${change.addedCountries.join(", ")}` : null,
    };
  }
  if (change.input === "annualBudget") {
    return {
      label: "Annual budget",
      previous: money(change.previousValue, change.previousCurrency),
      next: money(change.nextValue, change.nextCurrency),
    };
  }
  const labels = {
    intendedField: "Intended field",
    targetDegree: "Degree",
    gpa: "GPA",
    ieltsScore: "IELTS",
    satScore: "SAT",
  } as const;
  return {
    label: labels[change.input],
    previous: show(change.previousValue),
    next: show(change.nextValue),
  };
}

export function recentChangeLabel(change: ProgramChange | undefined) {
  if (!change) return null;
  if (change.structuralChange === "entered") return "New match";
  if (
    change.previousEligibility !== null &&
    change.nextEligibility !== null &&
    change.previousEligibility !== change.nextEligibility
  ) return "Eligibility updated";
  if (change.structuralChange === "moved_up") return "Moved up";
  if (change.structuralChange === "moved_down") return "Moved down";
  if (change.previousFitScore !== change.nextFitScore) return "Updated fit";
  return null;
}

export function programChangeDescription(change: ProgramChange) {
  const label = recentChangeLabel(change);
  if (change.structuralChange === "removed") return "No longer in your shortlist";
  if (change.structuralChange === "moved_up" || change.structuralChange === "moved_down") {
    return `#${change.previousRank} → #${change.nextRank}`;
  }
  return label ?? "Recommendation updated";
}

export function impactCounts(impact: ChangeImpact) {
  const fitUpdated = impact.programChanges.filter(
    ({ previousFitScore, nextFitScore }) =>
      previousFitScore !== null && nextFitScore !== null && previousFitScore !== nextFitScore,
  ).length;
  return [
    [impact.summary.entered, "new match", "new matches"],
    [impact.summary.removed, "removed match", "removed matches"],
    [impact.summary.movedUp, "moved up", "moved up"],
    [impact.summary.movedDown, "moved down", "moved down"],
    [impact.summary.eligibilityChanged, "eligibility updated", "eligibility updated"],
    [fitUpdated, "fit updated", "fit updated"],
  ].flatMap(([count, singular, plural]) =>
    Number(count) > 0 ? [`${count} ${Number(count) === 1 ? singular : plural}`] : [],
  );
}
