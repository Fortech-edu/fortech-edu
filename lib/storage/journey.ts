import {
  loadProgress,
  parseProgress,
  saveProgress,
} from "./progress.ts";
import {
  loadCompareSelection,
  loadSelectedProgram,
  parseCompareSelection,
  saveCompareSelection,
  saveSelectedProgram,
} from "./selection.ts";
import {
  loadJourneyUpdatedAt,
  recordPersistenceChange,
} from "./sync-events.ts";

export type JourneyState = {
  selectedProgramId: string | null;
  compareProgramIds: string[];
  completedTaskIds: Record<string, string[]>;
  updatedAt: string;
};

export function loadJourneyState(): JourneyState {
  return {
    selectedProgramId: loadSelectedProgram(),
    compareProgramIds: loadCompareSelection(),
    completedTaskIds: loadProgress().byProgram,
    updatedAt: loadJourneyUpdatedAt(),
  };
}

export function parseJourneyState(value: unknown): JourneyState | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const state = value as Record<string, unknown>;
  if (
    (state.selectedProgramId !== null && typeof state.selectedProgramId !== "string") ||
    (typeof state.selectedProgramId === "string" && state.selectedProgramId.length > 200) ||
    typeof state.updatedAt !== "string" ||
    Number.isNaN(Date.parse(state.updatedAt))
  ) return null;

  const compareProgramIds = parseCompareSelection(JSON.stringify(state.compareProgramIds));
  if (!Array.isArray(state.compareProgramIds) || compareProgramIds.length !== state.compareProgramIds.length) return null;

  const progress = parseProgress(JSON.stringify({ version: 1, byProgram: state.completedTaskIds }));
  if (
    typeof state.completedTaskIds !== "object" ||
    state.completedTaskIds === null ||
    Array.isArray(state.completedTaskIds) ||
    !Object.values(state.completedTaskIds).every(
      (taskIds) => Array.isArray(taskIds) && taskIds.every((id) => typeof id === "string"),
    )
  ) return null;

  return {
    selectedProgramId: state.selectedProgramId,
    compareProgramIds,
    completedTaskIds: progress.byProgram,
    updatedAt: state.updatedAt,
  };
}

export function applyJourneyState(state: JourneyState) {
  const options = { source: "remote" as const, updatedAt: state.updatedAt, notify: false };
  const saved = [
    saveSelectedProgram(state.selectedProgramId, options),
    saveCompareSelection(state.compareProgramIds, options),
    saveProgress({ version: 1, byProgram: state.completedTaskIds }, options),
  ].every(Boolean);

  if (saved) recordPersistenceChange("journey", { source: "remote", updatedAt: state.updatedAt });
  return saved;
}
