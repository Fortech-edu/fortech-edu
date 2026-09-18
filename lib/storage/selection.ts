import { recordPersistenceChange } from "./sync-events.ts";
import type { StorageWriteOptions } from "./sync-events.ts";

export const COMPARE_STORAGE_KEY = "admission-journey:v1:compare";
export const SELECTED_PROGRAM_STORAGE_KEY = "admission-journey:v1:selected-program";
export const MAX_COMPARE_SELECTION = 2;

export function parseCompareSelection(raw: string | null) {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0))].slice(0, MAX_COMPARE_SELECTION);
  } catch {
    return [];
  }
}

export function loadCompareSelection(validIds?: readonly string[]) {
  if (typeof window === "undefined") return [];
  try {
    const selected = parseCompareSelection(window.localStorage.getItem(COMPARE_STORAGE_KEY));
    return validIds ? selected.filter((id) => validIds.includes(id)) : selected;
  } catch {
    return [];
  }
}

export function saveCompareSelection(ids: readonly string[], options: StorageWriteOptions = {}) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify([...new Set(ids)].slice(0, MAX_COMPARE_SELECTION)));
    recordPersistenceChange("journey", options);
    return true;
  } catch {
    return false;
  }
}

export function clearCompareSelection(options: StorageWriteOptions = {}) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(COMPARE_STORAGE_KEY);
    recordPersistenceChange("journey", options);
    return true;
  } catch {
    return false;
  }
}

export function toggleCompareSelection(current: readonly string[], id: string) {
  const normalized = [...new Set(current)];
  if (normalized.includes(id)) {
    return normalized.filter((item) => item !== id);
  }
  return normalized.length < MAX_COMPARE_SELECTION ? [...normalized, id] : normalized.slice(0, MAX_COMPARE_SELECTION);
}

export function removeCompareSelection(current: readonly string[], id: string) {
  return current.filter((item) => item !== id);
}

export function saveSelectedProgram(id: string | null, options: StorageWriteOptions = {}) {
  if (typeof window === "undefined") return false;
  try {
    if (id === null) window.localStorage.removeItem(SELECTED_PROGRAM_STORAGE_KEY);
    else window.localStorage.setItem(SELECTED_PROGRAM_STORAGE_KEY, id);
    recordPersistenceChange("journey", options);
    return true;
  } catch {
    return false;
  }
}

export function loadSelectedProgram() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_PROGRAM_STORAGE_KEY);
  } catch {
    return null;
  }
}
