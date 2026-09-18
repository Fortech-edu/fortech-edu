import type { Answers } from "../interests/riasec.ts";

export const INTERESTS_STORAGE_KEY = "admission-journey:v1:interests";

export type StoredInterests = {
  version: 1;
  answers: Answers;
  updatedAt: string;
};

function parseAnswers(value: unknown): Answers | null {
  if (typeof value !== "object" || value === null) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  const answers: Answers = {};

  for (const [id, answer] of entries) {
    if (answer !== 0 && answer !== 1 && answer !== 2) return null;
    answers[id] = answer;
  }

  return answers;
}

export function parseStoredInterests(raw: string | null): StoredInterests | null {
  if (raw === null) return null;

  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value !== "object" || value === null || value.version !== 1) return null;

    const answers = parseAnswers(value.answers);
    if (answers === null) return null;

    const updatedAt =
      typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt))
        ? value.updatedAt
        : new Date(0).toISOString();

    return { version: 1, answers, updatedAt };
  } catch {
    return null;
  }
}

export function loadStoredInterests(): StoredInterests | null {
  if (typeof window === "undefined") return null;

  try {
    return parseStoredInterests(window.localStorage.getItem(INTERESTS_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveStoredInterests(answers: Answers) {
  if (typeof window === "undefined") return false;

  try {
    const value: StoredInterests = { version: 1, answers, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredInterests() {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.removeItem(INTERESTS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
