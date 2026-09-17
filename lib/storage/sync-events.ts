export const PERSISTENCE_CHANGE_EVENT = "admission-journey:persistence-change";
export const JOURNEY_UPDATED_AT_KEY = "admission-journey:v1:journey-updated-at";

export type StorageWriteOptions = {
  source?: "local" | "remote";
  updatedAt?: string;
  notify?: boolean;
};

export function recordPersistenceChange(
  scope: "profile" | "journey",
  options: StorageWriteOptions = {},
) {
  if (typeof window === "undefined") return;
  const source = options.source ?? "local";
  const updatedAt = options.updatedAt ?? new Date().toISOString();

  if (scope === "journey") {
    window.localStorage.setItem(JOURNEY_UPDATED_AT_KEY, updatedAt);
  }

  if (options.notify !== false) {
    window.dispatchEvent(new CustomEvent(PERSISTENCE_CHANGE_EVENT, {
      detail: { source, scope },
    }));
  }
}

export function loadJourneyUpdatedAt() {
  if (typeof window === "undefined") return new Date(0).toISOString();
  try {
    const value = window.localStorage.getItem(JOURNEY_UPDATED_AT_KEY);
    return value && !Number.isNaN(Date.parse(value)) ? value : new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}
