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
  ];
  const businessFields = [
    "business",
    "business administration",
    "international business",
    "finance",
    "business analytics",
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

export function stepErrors(step: number, profile: StudentProfile) {
  const errors: Partial<Record<OnboardingErrorKey, string>> = {};

  if (step === 1) {
    if (!profile.currentStudyStage) errors.currentStudyStage = "Choose your current study stage.";
    if (profile.targetDegree !== "Bachelor") errors.targetDegree = "Choose the supported Bachelor journey.";
    if (!profile.intendedField) errors.intendedField = "Choose the field you want to study.";
  }

  if (step === 2) {
    if (profile.gpa !== null && (profile.gpa < 0 || profile.gpa > 4)) {
      errors.gpa = "Enter a GPA between 0 and 4.";
    }
    if (profile.ieltsScore !== null && (profile.ieltsScore < 0 || profile.ieltsScore > 9)) {
      errors.ieltsScore = "Enter an IELTS score between 0 and 9.";
    }
    if (profile.satScore !== null && (profile.satScore < 400 || profile.satScore > 1600)) {
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
