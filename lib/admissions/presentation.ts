import type {
  EligibilityStatus,
  Recommendation,
  Requirement,
  ScoreBreakdown,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import { fieldsMatch } from "./scoring.ts";

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
  if (requirement?.isRequired !== true) return "Unknown";
  if (requirement.minimumScore === null) return "Required; exact threshold unknown";
  return `${requirement.minimumScore} minimum`;
}

export type TargetRequirementFact = {
  key: "academic" | "ielts" | "sat" | "language" | "documents" | "deadline";
  label: string;
  value: string;
  detail: string;
  state: "known" | "unknown" | "not_required";
};

function targetRequirementFact(
  key: "academic" | "ielts" | "sat",
  label: string,
  requirement: Requirement | null,
): TargetRequirementFact {
  if (requirement === null || requirement.isRequired === null) {
    return { key, label, value: "Unknown", detail: "The current verified data does not state this requirement.", state: "unknown" };
  }
  return {
    key,
    label,
    value: `${requirement.label} · ${formatRequirement(requirement)}`,
    detail: requirement.notes ?? "No additional verified note is available.",
    state: requirement.isRequired ? "known" : "not_required",
  };
}

export function buildTargetRequirementFacts(program: UniversityProgram): TargetRequirementFact[] {
  const documents = program.applicationDocuments;
  const documentValue = documents
    ? [
        `Motivation letter: ${documents.motivationLetter === null ? "Needs verification" : documents.motivationLetter ? "Required" : "Not required"}`,
        `Recommendation letters: ${documents.recommendationLetters === null ? "Needs verification" : documents.recommendationLetters ? "Required" : "Not required"}`,
      ].join(" · ")
    : "Unknown";
  const documentState = !documents || documents.motivationLetter === null || documents.recommendationLetters === null
    ? "unknown"
    : documents.motivationLetter || documents.recommendationLetters
      ? "known"
      : "not_required";

  return [
    targetRequirementFact("academic", "Academic requirement", program.academicRequirement),
    targetRequirementFact("ielts", "English requirement", program.ieltsRequirement),
    targetRequirementFact("sat", "Standardized test", program.satRequirement),
    {
      key: "language",
      label: "Language of instruction",
      value: formatLanguageOfInstruction(program),
      detail: program.languageOfInstruction === null ? "The current verified data does not state the teaching language." : "Published program language.",
      state: program.languageOfInstruction === null ? "unknown" : "known",
    },
    {
      key: "documents",
      label: "Motivation and recommendations",
      value: documentValue,
      detail: documents ? "Only document requirements represented in the current program data are shown." : "The current verified data does not state these document requirements.",
      state: documentState,
    },
    {
      key: "deadline",
      label: "Application deadline",
      value: program.deadline ?? "Unknown",
      detail: program.deadline === null ? "No verified deadline is available in the current data." : "Published deadline; recheck the official source before applying.",
      state: program.deadline === null ? "unknown" : "known",
    },
  ];
}

export function formatTuition(program: UniversityProgram) {
  if (program.tuition === null || program.tuitionCurrency === null) return "Unknown";
  const amount = `${program.tuitionCurrency.toUpperCase()} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(program.tuition)}`;
  return program.tuitionPeriod ? `${amount} / ${program.tuitionPeriod}` : amount;
}

export function formatLanguageOfInstruction(program: UniversityProgram) {
  return program.languageOfInstruction ?? "Unknown";
}

export function formatScoreComponent(value: number | null) {
  return value === null ? "Unknown" : `${value} points`;
}

export function getProgramSource(program: UniversityProgram) {
  const source = program.sources[0];
  return source ? { href: source.url, label: source.title } : null;
}

export const sourceTypeLabels = {
  admissions: "Admissions",
  tuition: "Tuition",
  deadline: "Deadline",
  program: "Program page",
} as const;

export type ComparisonStatus =
  | "Match"
  | "Action needed"
  | "Needs verification"
  | "Not required"
  | "Not comparable";

export type ProfileProgramCriterion = {
  key: "field" | "academic" | "ielts" | "sat" | "languageOfInstruction" | "tuition" | "timeline";
  label: string;
  profileValue: string;
  programValue: string;
  status: ComparisonStatus;
  detail: string;
};

export type ProgramComparisonCriterion = {
  key: string;
  label: string;
  firstValue: string;
  secondValue: string;
  different: boolean;
  note: string | null;
};

const normalized = (value: string) => value.trim().toLowerCase();
const formatNumber = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const formatBudget = (profile: StudentProfile) => {
  if (profile.annualBudget === null) return "Not provided";
  if (profile.budgetCurrency === null) return `${formatNumber(profile.annualBudget)} / year · currency not provided`;
  return `${profile.budgetCurrency.toUpperCase()} ${formatNumber(profile.annualBudget)} / year`;
};

function requirementCriterion(
  key: "academic" | "ielts" | "sat",
  label: string,
  value: number | null,
  requirement: Requirement | null,
): ProfileProgramCriterion {
  const profileValue = value === null ? "Not provided" : key === "academic" ? `GPA ${formatNumber(value)}` : formatNumber(value);

  if (requirement?.isRequired === false) {
    return { key, label, profileValue, programValue: "Not required", status: "Not required", detail: "A missing score is not treated as a problem for this program." };
  }
  if (requirement?.isRequired !== true) {
    return { key, label, profileValue, programValue: "Unknown", status: "Needs verification", detail: "The current verified data does not state whether this is required." };
  }
  if (requirement.minimumScore === null) {
    return {
      key,
      label,
      profileValue,
      programValue: key === "academic" ? `${requirement.label} · qualification-specific criteria` : `${requirement.label} · exact threshold unknown`,
      status: "Needs verification",
      detail: key === "academic" ? "Academic requirements depend on your qualification or background." : "The program requires this, but no comparable minimum is available.",
    };
  }

  if (key === "academic" && normalized(requirement.label) !== "gpa") {
    return {
      key,
      label,
      profileValue,
      programValue: `${requirement.label} ${formatNumber(requirement.minimumScore)} minimum`,
      status: "Not comparable",
      detail: "Your GPA and this academic requirement use different scales, so no numeric gap is calculated.",
    };
  }

  const programValue = `${requirement.label} ${formatNumber(requirement.minimumScore)} minimum`;
  if (value === null) {
    return { key, label, profileValue, programValue, status: "Needs verification", detail: "Your current value is not provided, so this is not treated as a confirmed gap." };
  }
  return value >= requirement.minimumScore
    ? { key, label, profileValue, programValue, status: "Match", detail: "Your provided score meets this published minimum." }
    : { key, label, profileValue, programValue, status: "Action needed", detail: `Your score is ${formatNumber(requirement.minimumScore - value)} below the published minimum.` };
}

export function buildProfileProgramCriteria(
  profile: StudentProfile,
  recommendation: Recommendation,
): ProfileProgramCriterion[] {
  const { program } = recommendation;
  const field: ProfileProgramCriterion = profile.intendedField === null
    ? { key: "field", label: "Study field", profileValue: "Not provided", programValue: program.field || "Unknown", status: "Needs verification", detail: "Add an intended field to compare it with this program." }
    : fieldsMatch(profile.intendedField, program.field)
      ? {
          key: "field",
          label: "Study field",
          profileValue: profile.intendedField,
          programValue: program.field || "Unknown",
          status: "Match",
          detail: normalized(profile.intendedField) === normalized(program.field) ? "Same field." : "Related field under the current matching rules.",
        }
      : { key: "field", label: "Study field", profileValue: profile.intendedField, programValue: program.field || "Unknown", status: "Action needed", detail: "These fields are not treated as related by the current matching rules." };

  const academic = requirementCriterion("academic", "Academic requirement", profile.gpa, program.academicRequirement);
  const ielts = requirementCriterion("ielts", "IELTS", profile.ieltsScore, program.ieltsRequirement);
  const sat = requirementCriterion("sat", "SAT", profile.satScore, program.satRequirement);

  const languageOfInstruction: ProfileProgramCriterion =
    profile.preferredLanguage == null
      ? { key: "languageOfInstruction", label: "Language of instruction", profileValue: "No preference", programValue: formatLanguageOfInstruction(program), status: "Not required", detail: "No language preference is set, so this does not affect your profile alignment." }
      : program.languageOfInstruction === null
        ? { key: "languageOfInstruction", label: "Language of instruction", profileValue: profile.preferredLanguage, programValue: "Unknown", status: "Needs verification", detail: "The current verified program data does not state the teaching language." }
        : normalized(profile.preferredLanguage) === normalized(program.languageOfInstruction)
          ? { key: "languageOfInstruction", label: "Language of instruction", profileValue: profile.preferredLanguage, programValue: program.languageOfInstruction, status: "Match", detail: "This program is taught in your preferred language." }
          : { key: "languageOfInstruction", label: "Language of instruction", profileValue: profile.preferredLanguage, programValue: program.languageOfInstruction, status: "Action needed", detail: "The program language differs from your preference. Confirm that it works for you." };

  const profileBudget = formatBudget(profile);
  const programTuition = formatTuition(program);
  let tuition: ProfileProgramCriterion;
  if (profile.annualBudget === null || profile.budgetCurrency === null) {
    tuition = { key: "tuition", label: "Tuition / budget", profileValue: profileBudget, programValue: programTuition, status: "Needs verification", detail: "Add an annual budget and currency to compare costs." };
  } else if (program.tuition === null || program.tuitionCurrency === null) {
    tuition = { key: "tuition", label: "Tuition / budget", profileValue: profileBudget, programValue: "Unknown", status: "Needs verification", detail: "The current verified program data does not include tuition." };
  } else if (normalized(profile.budgetCurrency) !== normalized(program.tuitionCurrency) || program.tuitionPeriod !== "year") {
    tuition = { key: "tuition", label: "Tuition / budget", profileValue: profileBudget, programValue: programTuition, status: "Not comparable", detail: "Currencies or billing periods differ. We don't guess exchange rates." };
  } else if (profile.annualBudget >= program.tuition) {
    tuition = { key: "tuition", label: "Tuition / budget", profileValue: profileBudget, programValue: programTuition, status: "Match", detail: "Published annual tuition is within your annual budget." };
  } else {
    tuition = { key: "tuition", label: "Tuition / budget", profileValue: profileBudget, programValue: programTuition, status: "Action needed", detail: `Published annual tuition is ${program.tuitionCurrency.toUpperCase()} ${formatNumber(program.tuition - profile.annualBudget)} above your annual budget.` };
  }

  let timeline: ProfileProgramCriterion;
  if (profile.targetIntake === null || program.deadline === null || recommendation.breakdown.timelineFit === null) {
    timeline = { key: "timeline", label: "Intake / deadline", profileValue: profile.targetIntake ?? "Not provided", programValue: program.deadline ?? "Unknown", status: "Needs verification", detail: program.deadline === null ? "No verified deadline is available in the current data." : "Add a target intake to compare timing." };
  } else if (recommendation.breakdown.timelineFit > 0) {
    timeline = { key: "timeline", label: "Intake / deadline", profileValue: profile.targetIntake, programValue: program.deadline, status: "Match", detail: "The deadline year aligns with your target intake year." };
  } else {
    timeline = { key: "timeline", label: "Intake / deadline", profileValue: profile.targetIntake, programValue: program.deadline, status: "Action needed", detail: "The published deadline year differs from your target intake year." };
  }

  return [field, academic, ielts, sat, languageOfInstruction, tuition, timeline];
}

function compareValue(value: string | null | undefined) {
  return value?.trim() || "Unknown";
}

function formatAcademicRequirement(requirement: Requirement | null) {
  if (requirement?.isRequired === false) return "Not required";
  if (requirement?.isRequired !== true) return "Unknown";
  return requirement.minimumScore === null
    ? `${requirement.label} · qualification-specific criteria`
    : `${requirement.label} ${formatNumber(requirement.minimumScore)} minimum`;
}

export function buildProgramComparisonCriteria(
  first: Recommendation,
  second: Recommendation,
): ProgramComparisonCriterion[] {
  const a = first.program;
  const b = second.program;
  const rows = [
    ["eligibility", "Eligibility", eligibilityLabels[first.eligibility], eligibilityLabels[second.eligibility], null],
    ["fit", "Fit Score", `${first.fitScore} / 100`, `${second.fitScore} / 100`, "Profile alignment — not admission probability."],
    ["coverage", "Data coverage", `${first.dataCoverage}%`, `${second.dataCoverage}%`, "Share of weighted Fit inputs backed by known, comparable data."],
    ["country", "Country", compareValue(a.country), compareValue(b.country), null],
    ["field", "Field", compareValue(a.field), compareValue(b.field), null],
    ["ielts", "IELTS", formatRequirement(a.ieltsRequirement), formatRequirement(b.ieltsRequirement), null],
    ["sat", "SAT", formatRequirement(a.satRequirement), formatRequirement(b.satRequirement), null],
    ["academic", "Academic requirements", formatAcademicRequirement(a.academicRequirement), formatAcademicRequirement(b.academicRequirement), "Qualification-specific requirements still need individual verification."],
    ["language", "Language of instruction", formatLanguageOfInstruction(a), formatLanguageOfInstruction(b), null],
    ["tuition", "Tuition", formatTuition(a), formatTuition(b), tuitionComparisonNote(a, b)],
    ["deadline", "Deadline / timing", compareValue(a.deadline), compareValue(b.deadline), null],
    ["verification", "Verification status", a.verificationDate ? `Verified ${a.verificationDate}` : "Verification date unknown", b.verificationDate ? `Verified ${b.verificationDate}` : "Verification date unknown", null],
  ] satisfies Array<[string, string, string, string, string | null]>;

  return rows
    .filter(([key, , firstValue, secondValue]) => key === "fit" || key === "coverage" || firstValue !== "Unknown" || secondValue !== "Unknown")
    .map(([key, label, firstValue, secondValue, note]) => ({ key, label, firstValue, secondValue, different: firstValue !== secondValue, note }));
}

function tuitionComparisonNote(first: UniversityProgram, second: UniversityProgram) {
  if (first.tuition === null || first.tuitionCurrency === null || second.tuition === null || second.tuitionCurrency === null) return null;
  if (normalized(first.tuitionCurrency) !== normalized(second.tuitionCurrency) || first.tuitionPeriod !== second.tuitionPeriod) {
    return "Not directly comparable — currencies or billing periods differ.";
  }
  return "Directly comparable: same currency and billing period.";
}

export function resolveComparison(
  selectedIds: readonly string[],
  recommendations: readonly Recommendation[],
): [Recommendation, Recommendation] | null {
  if (new Set(selectedIds).size !== 2) return null;
  const selected = selectedIds.map((id) => recommendations.find(({ program }) => program.id === id));
  return selected[0] && selected[1] ? [selected[0], selected[1]] : null;
}
