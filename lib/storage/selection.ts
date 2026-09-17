import { recordPersistenceChange } from "./sync-events.ts";
import type { StorageWriteOptions } from "./sync-events.ts";

export const COMPARE_STORAGE_KEY = "admission-journey:v1:compare";
export const SELECTED_PROGRAM_STORAGE_KEY = "admission-journey:v1:selected-program";

export function parseCompareSelection(raw: string | null) {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string"))].slice(0, 2);
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
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify([...new Set(ids)].slice(0, 2)));
    recordPersistenceChange("journey", options);
    return true;
  } catch {
    return false;
  }
}

export function toggleCompareSelection(current: readonly string[], id: string) {
  if (current.includes(id)) return current.filter((item) => item !== id);
  return current.length < 2 ? [...current, id] : [...current];
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
