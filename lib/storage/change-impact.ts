import type { ChangeImpact } from "../admissions/change-impact.ts";
import type { StudentProfile } from "../../types/admissions.ts";
import { isStudentProfile } from "./profile.ts";

export const EDIT_BASELINE_STORAGE_KEY = "admission-journey:v1:edit-baseline";
export const RECENT_IMPACT_STORAGE_KEY = "admission-journey:v1:recent-impact";
export const RECENT_IMPACT_TTL_MS = 30 * 60 * 1000;

type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function sessionStore(storage?: SessionStore) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNullableNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const isNullableString = (value: unknown) => value === null || typeof value === "string";

function isChangedInput(value: unknown) {
  if (!isRecord(value) || typeof value.input !== "string") return false;
  if (value.input === "preferredCountries") {
    return [value.addedCountries, value.removedCountries].every(
      (countries) => Array.isArray(countries) && countries.every((country) => typeof country === "string"),
    );
  }
  if (value.input === "annualBudget") {
    return (
      isNullableNumber(value.previousValue) &&
      isNullableNumber(value.nextValue) &&
      isNullableString(value.previousCurrency) &&
      isNullableString(value.nextCurrency)
    );
  }
  return (
    ["intendedField", "targetDegree", "ieltsScore", "satScore"].includes(value.input) &&
    (value.input === "ieltsScore" || value.input === "satScore"
      ? isNullableNumber(value.previousValue) && isNullableNumber(value.nextValue)
      : isNullableString(value.previousValue) && isNullableString(value.nextValue))
  );
}

function isProgramChange(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    [value.programId, value.universityName, value.programName].every((item) => typeof item === "string") &&
    [value.previousRank, value.nextRank, value.previousFitScore, value.nextFitScore].every(isNullableNumber) &&
    [value.previousEligibility, value.nextEligibility].every(
      (status) => status === null || ["eligible_now", "with_actions", "requires_verification", "not_eligible"].includes(String(status)),
    ) &&
    ["entered", "removed", "moved_up", "moved_down", "unchanged"].includes(String(value.structuralChange)) &&
    Array.isArray(value.fitComponentChanges) &&
    Array.isArray(value.reasonCodes) &&
    value.reasonCodes.every((code) => typeof code === "string")
  );
}

const COMPARISON_STATUSES = ["Match", "Action needed", "Needs verification", "Not required", "Not comparable"];
const ROADMAP_PRIORITIES = ["high", "medium", "low"];

function isTargetCriterionChange(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    COMPARISON_STATUSES.includes(String(value.previousStatus)) &&
    COMPARISON_STATUSES.includes(String(value.nextStatus)) &&
    typeof value.previousValue === "string" &&
    typeof value.nextValue === "string"
  );
}

function isRoadmapTaskChange(value: unknown) {
  if (!isRecord(value) || typeof value.taskId !== "string" || typeof value.title !== "string") return false;
  const change = String(value.change);
  if (change === "added") return ROADMAP_PRIORITIES.includes(String(value.priority));
  if (change === "removed") return ROADMAP_PRIORITIES.includes(String(value.previousPriority));
  if (change === "priority_changed") {
    return (
      ROADMAP_PRIORITIES.includes(String(value.previousPriority)) &&
      ROADMAP_PRIORITIES.includes(String(value.nextPriority))
    );
  }
  return false;
}

function isNextActionChange(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    (value.previousTitle === null || typeof value.previousTitle === "string") &&
    (value.nextTitle === null || typeof value.nextTitle === "string")
  );
}

function isTargetPlan(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.criterionChanges) &&
    value.criterionChanges.every(isTargetCriterionChange) &&
    Array.isArray(value.roadmapTaskChanges) &&
    value.roadmapTaskChanges.every(isRoadmapTaskChange) &&
    (value.nextActionChange === null || isNextActionChange(value.nextActionChange))
  );
}

function isChangeImpact(value: unknown): value is ChangeImpact {
  if (!isRecord(value) || !isRecord(value.summary)) return false;
  const summary = value.summary;
  if (!(
    Array.isArray(value.changedInputs) &&
    value.changedInputs.every(isChangedInput) &&
    Array.isArray(value.programChanges) &&
    value.programChanges.every(isProgramChange) &&
    ["entered", "removed", "movedUp", "movedDown", "eligibilityChanged"].every(
      (key) => Number.isInteger(summary[key]) && Number(summary[key]) >= 0,
    )
  )) return false;
  return value.targetPlan === undefined || isTargetPlan(value.targetPlan);
}

export function parseEditBaseline(raw: string | null): StudentProfile | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isStudentProfile(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveEditBaseline(profile: StudentProfile, storage?: SessionStore) {
  try {
    const target = sessionStore(storage);
    if (!target) return false;
    target.setItem(EDIT_BASELINE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadEditBaseline(storage?: SessionStore) {
  try {
    return parseEditBaseline(sessionStore(storage)?.getItem(EDIT_BASELINE_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function clearEditBaseline(storage?: SessionStore) {
  try {
    sessionStore(storage)?.removeItem(EDIT_BASELINE_STORAGE_KEY);
  } catch {}
}

export function parseRecentChangeImpact(
  raw: string | null,
  now = Date.now(),
  ttl = RECENT_IMPACT_TTL_MS,
): ChangeImpact | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || typeof value.savedAt !== "number" || !isChangeImpact(value.impact)) return null;
    return now - value.savedAt >= 0 && now - value.savedAt <= ttl ? value.impact : null;
  } catch {
    return null;
  }
}

export function saveRecentChangeImpact(impact: ChangeImpact, storage?: SessionStore, savedAt = Date.now()) {
  try {
    const target = sessionStore(storage);
    if (!target) return false;
    target.setItem(RECENT_IMPACT_STORAGE_KEY, JSON.stringify({ version: 1, savedAt, impact }));
    return true;
  } catch {
    return false;
  }
}

export function loadRecentChangeImpact(storage?: SessionStore, now = Date.now()) {
  try {
    const target = sessionStore(storage);
    if (!target) return null;
    const impact = parseRecentChangeImpact(target.getItem(RECENT_IMPACT_STORAGE_KEY), now);
    if (!impact) target.removeItem(RECENT_IMPACT_STORAGE_KEY);
    return impact;
  } catch {
    return null;
  }
}

export function clearRecentChangeImpact(storage?: SessionStore) {
  try {
    sessionStore(storage)?.removeItem(RECENT_IMPACT_STORAGE_KEY);
  } catch {}
}
