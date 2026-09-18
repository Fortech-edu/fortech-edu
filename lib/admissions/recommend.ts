import type {
  Recommendation,
  Requirement,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import { evaluateEligibility } from "./eligibility.ts";
import { calculateFit, fieldsMatch } from "./scoring.ts";

const formatScore = (score: number) => score.toString();
const eligibilityPriority = {
  eligible_now: 0,
  with_actions: 1,
  requires_verification: 2,
  not_eligible: 3,
} as const;

function addRequirementSummary(
  label: string,
  value: number | null,
  requirement: Requirement | null,
  reasons: string[],
  gaps: string[],
) {
  if (
    requirement === null ||
    requirement.isRequired === null ||
    (requirement.isRequired && requirement.minimumScore === null)
  ) {
    gaps.push(`${label} requirement needs verification`);
    return;
  }

  if (!requirement.isRequired) return;
  if (value === null) {
    gaps.push(`${label} score is required`);
    return;
  }

  if (value >= requirement.minimumScore!) {
    reasons.push(`Your ${label} meets the requirement`);
  } else {
    gaps.push(
      `${label} needs improvement from ${formatScore(value)} to ${formatScore(requirement.minimumScore!)}`,
    );
  }
}

function explain(profile: StudentProfile, program: UniversityProgram) {
  const reasons: string[] = [];
  const gaps: string[] = [];

  if (profile.intendedField === null) {
    gaps.push("Field match needs verification");
  } else if (fieldsMatch(profile.intendedField, program.field)) {
    reasons.push("Matches your selected field");
  } else {
    gaps.push("Program field differs from your selected field");
  }

  addRequirementSummary(
    "academic",
    profile.gpa,
    program.academicRequirement,
    reasons,
    gaps,
  );
  addRequirementSummary(
    "IELTS",
    profile.ieltsScore,
    program.ieltsRequirement,
    reasons,
    gaps,
  );
  addRequirementSummary(
    "SAT",
    profile.satScore,
    program.satRequirement,
    reasons,
    gaps,
  );

  if (profile.preferredLanguage) {
    if (program.languageOfInstruction === null) {
      gaps.push("Language of instruction needs verification");
    } else if (profile.preferredLanguage.toLowerCase() === program.languageOfInstruction.toLowerCase()) {
      reasons.push("Taught in your preferred language");
    } else {
      gaps.push(`Program is taught in ${program.languageOfInstruction}; your preference is ${profile.preferredLanguage}`);
    }
  }

  if (
    profile.annualBudget === null ||
    profile.budgetCurrency === null ||
    program.tuition === null ||
    program.tuitionCurrency === null ||
    profile.budgetCurrency.toLowerCase() !== program.tuitionCurrency.toLowerCase() ||
    program.tuitionPeriod !== "year"
  ) {
    gaps.push("Budget fit needs verification");
  } else if (profile.annualBudget >= program.tuition) {
    reasons.push("Within your annual budget");
  } else {
    gaps.push("Program exceeds your annual budget");
  }

  if (
    program.country !== null &&
    profile.preferredCountries.some(
      (country) => country.toLowerCase() === program.country!.toLowerCase(),
    )
  ) {
    reasons.push("Matches your preferred country");
  }

  return { reasons, gaps };
}

export function recommendPrograms(
  profile: StudentProfile,
  programs: UniversityProgram[],
): Recommendation[] {
  const { intendedField } = profile;
  if (intendedField === null || profile.targetDegree !== "Bachelor") return [];

  return programs
    .filter((program) => fieldsMatch(intendedField, program.field))
    .map((program) => assessProgram(profile, program))
    .filter((recommendation) => recommendation.eligibility !== "not_eligible")
    .sort(
      (a, b) =>
        eligibilityPriority[a.eligibility] - eligibilityPriority[b.eligibility] ||
        b.fitScore - a.fitScore ||
        b.dataCoverage - a.dataCoverage,
    );
}

export function assessProgram(
  profile: StudentProfile,
  program: UniversityProgram,
): Recommendation {
  const { fitScore, dataCoverage, breakdown } = calculateFit(profile, program);
  const { reasons, gaps } = explain(profile, program);

  return {
    program,
    fitScore,
    dataCoverage,
    breakdown,
    eligibility: evaluateEligibility(profile, program),
    reasons,
    gaps,
  };
}
