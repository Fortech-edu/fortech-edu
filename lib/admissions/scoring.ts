import type {
  Requirement,
  ScoreBreakdown,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";

const weights = {
  fieldFit: 25,
  academicFit: 20,
  budgetFit: 20,
  languageFit: 15,
  countryPreference: 10,
  timelineFit: 10,
} as const;

const relatedFieldGroups: readonly (readonly string[])[] = [
  ["computer science", "software engineering", "data science", "information technology"],
  ["business", "business administration", "international business", "finance", "business analytics"],
];

const round = (value: number) => Math.round(value * 10) / 10;
const normalized = (value: string) => value.trim().toLowerCase();

export function fieldsMatch(profileField: string, programField: string) {
  const profileValue = normalized(profileField);
  const programValue = normalized(programField);

  return (
    profileValue === programValue ||
    relatedFieldGroups.some(
      (group) => group.includes(profileValue) && group.includes(programValue),
    )
  );
}

function requirementScore(
  value: number | null,
  requirement: Requirement | null,
  weight: number,
) {
  if (requirement?.isRequired === false) return weight;
  if (
    value === null ||
    requirement?.isRequired !== true ||
    requirement.minimumScore === null
  ) {
    return null;
  }

  return round(weight * Math.min(1, Math.max(0, value / requirement.minimumScore)));
}

function extractYear(value: string) {
  return value.match(/\b20\d{2}\b/)?.[0] ?? null;
}

export function calculateFit(
  profile: StudentProfile,
  program: UniversityProgram,
): { fitScore: number; dataCoverage: number; breakdown: ScoreBreakdown } {
  const fieldFit =
    profile.intendedField === null
      ? null
      : fieldsMatch(profile.intendedField, program.field)
        ? weights.fieldFit
        : 0;

  const academicFit = requirementScore(
    profile.gpa,
    program.academicRequirement,
    weights.academicFit,
  );

  const budgetFit =
    profile.annualBudget === null ||
    profile.budgetCurrency === null ||
    program.tuition === null ||
    program.tuitionCurrency === null ||
    normalized(profile.budgetCurrency) !== normalized(program.tuitionCurrency) ||
    program.tuitionPeriod !== "year"
      ? null
      : round(
          weights.budgetFit *
            Math.min(1, Math.max(0, profile.annualBudget / program.tuition)),
        );

  const languageFit = requirementScore(
    profile.ieltsScore,
    program.ieltsRequirement,
    weights.languageFit,
  );

  const countryPreference =
    program.country === null
      ? null
      : profile.preferredCountries.length === 0
        ? weights.countryPreference
      : profile.preferredCountries.some(
            (country) => normalized(country) === normalized(program.country!),
          )
        ? weights.countryPreference
        : 0;

  const intakeYear =
    profile.targetIntake === null ? null : extractYear(profile.targetIntake);
  const deadlineYear = program.deadline === null ? null : extractYear(program.deadline);
  const timelineFit =
    intakeYear === null || deadlineYear === null
      ? null
      : intakeYear === deadlineYear
        ? weights.timelineFit
        : 0;

  const breakdown = {
    fieldFit,
    academicFit,
    budgetFit,
    languageFit,
    countryPreference,
    timelineFit,
  };

  const knownWeight = (Object.keys(breakdown) as Array<keyof ScoreBreakdown>).reduce(
    (sum, component) =>
      breakdown[component] === null ? sum : sum + weights[component],
    0,
  );
  const earnedPoints = Object.values(breakdown).reduce<number>(
    (sum, score) => sum + (score ?? 0),
    0,
  );
  const fitScore =
    knownWeight === 0
      ? 0
      : round(Math.min(100, Math.max(0, (earnedPoints / knownWeight) * 100)));

  return { fitScore, dataCoverage: knownWeight, breakdown };
}
