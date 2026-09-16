export const ROADMAP_PROGRESS_KEY = "admission-journey:v1:roadmap-progress";

type StoredProgress = {
  version: 1;
  byProgram: Record<string, string[]>;
};

const emptyProgress = (): StoredProgress => ({ version: 1, byProgram: {} });

export function parseProgress(raw: string | null): StoredProgress {
  if (raw === null) return emptyProgress();
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return emptyProgress();
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== 1 || typeof candidate.byProgram !== "object" || candidate.byProgram === null) return emptyProgress();

    const byProgram: Record<string, string[]> = {};
    for (const [programId, taskIds] of Object.entries(candidate.byProgram)) {
      if (Array.isArray(taskIds)) {
        byProgram[programId] = [...new Set(taskIds.filter((id): id is string => typeof id === "string"))];
      }
    }
    return { version: 1, byProgram };
  } catch {
    return emptyProgress();
  }
}

function loadProgress() {
  if (typeof window === "undefined") return emptyProgress();
  try {
    return parseProgress(window.localStorage.getItem(ROADMAP_PROGRESS_KEY));
  } catch {
    return emptyProgress();
  }
}

export function loadCompletedTaskIds(programId: string, validIds: readonly string[]) {
  const valid = new Set(validIds);
  return (loadProgress().byProgram[programId] ?? []).filter((id) => valid.has(id));
}

export function saveCompletedTaskIds(programId: string, completedIds: readonly string[]) {
  if (typeof window === "undefined") return false;
  try {
    const current = loadProgress();
    current.byProgram[programId] = [...new Set(completedIds)];
    window.localStorage.setItem(ROADMAP_PROGRESS_KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}

export function toggleCompletedTask(current: readonly string[], taskId: string) {
  return current.includes(taskId)
    ? current.filter((id) => id !== taskId)
    : [...current, taskId];
}
