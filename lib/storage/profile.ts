import type { StudentProfile } from "../../types/admissions.ts";
import { recordPersistenceChange } from "./sync-events.ts";
import type { StorageWriteOptions } from "./sync-events.ts";

export const PROFILE_STORAGE_KEY = "admission-journey:v1:profile";

export type StoredProfile = {
  version: 1;
  profile: StudentProfile;
  step: number;
  completed: boolean;
  updatedAt: string;
};

const isNullableString = (value: unknown) => value === null || typeof value === "string";
const isNullableNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

export function isStudentProfile(value: unknown): value is StudentProfile {
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
    (profile.preferredLanguage === undefined || isNullableString(profile.preferredLanguage)) &&
    (profile.activitiesAndAchievements === undefined || isNullableString(profile.activitiesAndAchievements)) &&
    isNullableString(profile.targetIntake) &&
    isNullableNumber(profile.gpa) &&
    isNullableNumber(profile.ieltsScore) &&
    isNullableNumber(profile.satScore) &&
    isNullableNumber(profile.annualBudget) &&
    isNullableString(profile.budgetCurrency)
  );
}

function parseStoredProfileValue(value: unknown): StoredProfile | null {
  if (typeof value !== "object" || value === null) return null;
  const stored = value as Record<string, unknown>;

  if (!(
    stored.version === 1 &&
    Number.isInteger(stored.step) &&
    Number(stored.step) >= 1 &&
    Number(stored.step) <= 4 &&
    typeof stored.completed === "boolean" &&
    isStudentProfile(stored.profile)
  )) return null;

  const updatedAt =
    typeof stored.updatedAt === "string" && !Number.isNaN(Date.parse(stored.updatedAt))
      ? stored.updatedAt
      : new Date(0).toISOString();

  return {
    version: 1,
    profile: {
      ...stored.profile,
      preferredLanguage: stored.profile.preferredLanguage ?? null,
      activitiesAndAchievements: stored.profile.activitiesAndAchievements?.trim() || null,
    },
    step: Number(stored.step),
    completed: stored.completed,
    updatedAt,
  };
}

export function parseStoredProfile(raw: string | null) {
  if (raw === null) return null;
  try {
    return parseStoredProfileValue(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function loadStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;

  try {
    return parseStoredProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveStoredProfile(
  profile: StudentProfile,
  step: number,
  completed: boolean,
  options: StorageWriteOptions = {},
) {
  if (typeof window === "undefined") return false;

  try {
    const value: StoredProfile = {
      version: 1,
      profile,
      step,
      completed,
      updatedAt: options.updatedAt ?? new Date().toISOString(),
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(value));
    recordPersistenceChange("profile", options);
    return true;
  } catch {
    return false;
  }
}
