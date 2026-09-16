import type { StudentProfile } from "../../types/admissions.ts";

export const PROFILE_STORAGE_KEY = "admission-journey:v1:profile";

export type StoredProfile = {
  version: 1;
  profile: StudentProfile;
  step: number;
  completed: boolean;
};

const isNullableString = (value: unknown) => value === null || typeof value === "string";
const isNullableNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

function isStudentProfile(value: unknown): value is StudentProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Record<string, unknown>;

  return (
    isNullableString(profile.fullName) &&
    isNullableString(profile.nationality) &&
    isNullableString(profile.countryOfResidence) &&
    isNullableString(profile.currentStudyStage) &&
    isNullableString(profile.targetDegree) &&
    isNullableString(profile.intendedField) &&
    Array.isArray(profile.preferredCountries) &&
    profile.preferredCountries.every((country) => typeof country === "string") &&
    isNullableString(profile.targetIntake) &&
    isNullableNumber(profile.gpa) &&
    isNullableNumber(profile.ieltsScore) &&
    isNullableNumber(profile.satScore) &&
    isNullableNumber(profile.annualBudget) &&
    isNullableString(profile.budgetCurrency)
  );
}

function isStoredProfile(value: unknown): value is StoredProfile {
  if (typeof value !== "object" || value === null) return false;
  const stored = value as Record<string, unknown>;

  return (
    stored.version === 1 &&
    Number.isInteger(stored.step) &&
    Number(stored.step) >= 1 &&
    Number(stored.step) <= 4 &&
    typeof stored.completed === "boolean" &&
    isStudentProfile(stored.profile)
  );
}

export function loadStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredProfile(
  profile: StudentProfile,
  step: number,
  completed: boolean,
) {
  if (typeof window === "undefined") return false;

  try {
    const value: StoredProfile = { version: 1, profile, step, completed };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
