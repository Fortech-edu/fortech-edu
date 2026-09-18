import type { StudentProfile, UniversityProgram } from "../types/admissions.ts";

export const emptyProfile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: null,
  targetDegree: null,
  intendedField: null,
  preferredCountries: [],
  preferredLanguage: null,
  activitiesAndAchievements: null,
  targetIntake: null,
  gpa: null,
  ieltsScore: null,
  satScore: null,
  annualBudget: null,
  budgetCurrency: "USD",
};

export type OnboardingErrorKey =
  | "currentStudyStage"
  | "targetDegree"
  | "intendedField"
  | "gpa"
  | "ieltsScore"
  | "satScore"
  | "annualBudget"
  | "targetIntake";

export function numberOrNull(value: string) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toggleCountry(profile: StudentProfile, country: string): StudentProfile {
  return {
    ...profile,
    preferredCountries: profile.preferredCountries.includes(country)
      ? profile.preferredCountries.filter((item) => item !== country)
      : [...profile.preferredCountries, country],
  };
}

export function transferInstantProfile(
  profile: StudentProfile,
  instantProfile: StudentProfile,
): StudentProfile {
  return {
    ...profile,
    currentStudyStage: instantProfile.currentStudyStage ?? profile.currentStudyStage,
    gpa: instantProfile.gpa ?? profile.gpa,
    ieltsScore: instantProfile.ieltsScore ?? profile.ieltsScore,
    satScore: instantProfile.satScore ?? profile.satScore,
  };
}

export function inferFieldFromTarget(field: string | null | undefined): string | null {
  if (!field) return null;
  const normalized = field.trim().toLowerCase();
  const csFields = [
    "computer science",
    "software engineering",
    "data science",
    "information technology",
    "artificial intelligence",
    "cybersecurity",
  ];
  const businessFields = [
    "business",
    "business administration",
    "international business",
    "finance",
    "business analytics",
    "economics",
  ];

  if (csFields.includes(normalized)) return "Computer Science";
  if (businessFields.includes(normalized)) return "Business";
  return null;
}

export function applyTargetProfileDefaults(
  profile: StudentProfile,
  target: UniversityProgram | null | undefined,
  previousTarget?: UniversityProgram | null,
): StudentProfile {
  if (!target) return profile;

  const targetDegree =
    profile.targetDegree ??
    (target.degreeLevel?.toLowerCase().startsWith("bachelor") ? "Bachelor" : profile.targetDegree);

  const targetField = inferFieldFromTarget(target.field);
  const previousField = previousTarget ? inferFieldFromTarget(previousTarget.field) : null;

  const isTargetDerived =
    profile.intendedField === null ||
    (previousField !== null && profile.intendedField === previousField);

  const intendedField = isTargetDerived
    ? (targetField ?? profile.intendedField)
    : profile.intendedField;

  return {
    ...profile,
    targetDegree,
    intendedField,
  };
}

export function isScoreValid(key: "academic" | "ielts" | "sat", value: number | null): boolean {
  if (value === null) return true;
  if (key === "academic") return value >= 0 && value <= 4;
  if (key === "ielts") return value >= 0 && value <= 9;
  if (key === "sat") return value >= 400 && value <= 1600;
  return true;
}

export function stepErrors(step: number, profile: StudentProfile) {
  const errors: Partial<Record<OnboardingErrorKey, string>> = {};

  if (step === 1) {
    if (!profile.currentStudyStage) errors.currentStudyStage = "Choose your current study stage.";
    if (profile.targetDegree !== "Bachelor") errors.targetDegree = "Choose the supported Bachelor journey.";
    if (!profile.intendedField) errors.intendedField = "Choose the field you want to study.";
  }

  if (step === 2) {
    if (profile.gpa !== null && !isScoreValid("academic", profile.gpa)) {
      errors.gpa = "Enter a GPA between 0 and 4.";
    }
    if (profile.ieltsScore !== null && !isScoreValid("ielts", profile.ieltsScore)) {
      errors.ieltsScore = "Enter an IELTS score between 0 and 9.";
    }
    if (profile.satScore !== null && !isScoreValid("sat", profile.satScore)) {
      errors.satScore = "Enter an SAT score between 400 and 1600.";
    }
  }

  if (step === 3) {
    if (profile.annualBudget !== null && profile.annualBudget <= 0) {
      errors.annualBudget = "Enter a tuition budget greater than 0, or leave it blank.";
    }
    if (!profile.targetIntake) errors.targetIntake = "Choose a target intake.";
  }

  if (step === 4 && !profile.targetIntake) {
    errors.targetIntake = "Add a target intake in Preferences before analysis.";
  }

  return errors;
}

export function validStep(step: number, profile: StudentProfile) {
  return Object.keys(stepErrors(step, profile)).length === 0;
}

export function createLandingInstantProfile(
  program: UniversityProgram,
  currentState: {
    currentStudyStage: string | null;
    gpa: number | null;
    ieltsScore: number | null;
    satScore: number | null;
  },
  existingProfile?: StudentProfile | null,
  previousTarget?: UniversityProgram | null,
): StudentProfile {
  const base = existingProfile ?? emptyProfile;
  const profileWithScores: StudentProfile = {
    ...base,
    currentStudyStage: currentState.currentStudyStage,
    gpa: currentState.gpa,
    ieltsScore: currentState.ieltsScore,
    satScore: currentState.satScore,
  };
  return applyTargetProfileDefaults(profileWithScores, program, previousTarget);
}
