import type {
  EligibilityStatus,
  Requirement,
  ScoreBreakdown,
  UniversityProgram,
} from "../../types/admissions.ts";

export const eligibilityLabels: Record<EligibilityStatus, string> = {
  eligible_now: "Requirements met",
  with_actions: "Possible with actions",
  requires_verification: "Needs verification",
  not_eligible: "Not currently eligible",
};

export const scoreComponents: ReadonlyArray<{
  key: keyof ScoreBreakdown;
  label: string;
}> = [
  { key: "fieldFit", label: "Field" },
  { key: "academicFit", label: "Academic" },
  { key: "budgetFit", label: "Budget" },
  { key: "languageFit", label: "Language" },
  { key: "countryPreference", label: "Country" },
  { key: "timelineFit", label: "Timeline" },
];

export function formatRequirement(requirement: Requirement | null) {
  if (requirement?.isRequired === false) return "Not required";
  if (requirement?.isRequired !== true || requirement.minimumScore === null) {
    return "Unknown";
  }
  return `${requirement.minimumScore}+`;
}

export function formatTuition(program: UniversityProgram) {
  if (program.tuition === null || program.tuitionCurrency === null) return "Unknown";
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: program.tuitionCurrency,
    maximumFractionDigits: 0,
  }).format(program.tuition);
  return program.tuitionPeriod ? `${amount} / ${program.tuitionPeriod}` : amount;
}

export function formatScoreComponent(value: number | null) {
  return value === null ? "Unknown" : `${value} points`;
}

export function getProgramSource(program: UniversityProgram) {
  return program.sourceUrl
    ? { href: program.sourceUrl, label: `View source for ${program.programName}` }
    : null;
}
