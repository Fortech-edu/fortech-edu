import type {
  EligibilityStatus,
  Recommendation,
  RoadmapPriority,
  ScoreBreakdown,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import { generateRoadmap, getNextAction } from "./roadmap.ts";
import { assessProgram } from "./recommend.ts";
import {
  buildProfileProgramCriteria,
  canonicalEvidenceOrder,
  type ProfileProgramCriterion,
} from "./presentation.ts";

export type ChangedProfileInput =
  | {
      input: "intendedField" | "targetDegree";
      previousValue: string | null;
      nextValue: string | null;
    }
  | {
      input: "annualBudget";
      previousValue: number | null;
      nextValue: number | null;
      previousCurrency: string | null;
      nextCurrency: string | null;
    }
  | {
      input: "gpa" | "ieltsScore" | "satScore";
      previousValue: number | null;
      nextValue: number | null;
    }
  | {
      input: "preferredCountries";
      addedCountries: string[];
      removedCountries: string[];
    };

export type ProgramStructuralChange =
  | "entered"
  | "removed"
  | "moved_up"
  | "moved_down"
  | "unchanged";

export type FitComponent = keyof ScoreBreakdown;

export type FitComponentChange = {
  component: FitComponent;
  previousValue: number | null;
  nextValue: number | null;
};

export type ChangeReasonCode =
  | "field_fit_improved"
  | "field_fit_decreased"
  | "academic_fit_improved"
  | "academic_fit_decreased"
  | "budget_fit_improved"
  | "budget_fit_decreased"
  | "language_fit_improved"
  | "language_fit_decreased"
  | "country_preference_improved"
  | "country_preference_decreased"
  | "timeline_fit_improved"
  | "timeline_fit_decreased"
  | "eligibility_changed";

export type ProgramChange = {
  programId: string;
  universityName: string;
  programName: string;
  previousRank: number | null;
  nextRank: number | null;
  previousFitScore: number | null;
  nextFitScore: number | null;
  previousEligibility: EligibilityStatus | null;
  nextEligibility: EligibilityStatus | null;
  structuralChange: ProgramStructuralChange;
  fitComponentChanges: FitComponentChange[];
  reasonCodes: ChangeReasonCode[];
};

export type TargetCriterionChange = {
  key: ProfileProgramCriterion["key"];
  label: string;
  previousStatus: ProfileProgramCriterion["status"];
  nextStatus: ProfileProgramCriterion["status"];
  previousValue: string;
  nextValue: string;
};

export type RoadmapTaskChange =
  | {
      change: "added";
      taskId: string;
      title: string;
      priority: RoadmapPriority;
    }
  | {
      change: "removed";
      taskId: string;
      title: string;
      previousPriority: RoadmapPriority;
    }
  | {
      change: "priority_changed";
      taskId: string;
      title: string;
      previousPriority: RoadmapPriority;
      nextPriority: RoadmapPriority;
    };

export type NextActionChange = {
  previousTitle: string | null;
  nextTitle: string | null;
};

export type TargetChangeRecord = {
  previousProgramId: string;
  nextProgramId: string;
  previousName: string;
  nextName: string;
};

export type TargetPlanChange = {
  /**
   * Present only when the selected target changed between the baseline and the
   * saved profile. Criterion/roadmap/Next Action diffs stay empty in that case:
   * the previous plan was built for a different target, so a cross-target
   * before/after comparison would be fabricated.
   */
  targetChange?: TargetChangeRecord;
  criterionChanges: TargetCriterionChange[];
  roadmapTaskChanges: RoadmapTaskChange[];
  nextActionChange: NextActionChange | null;
};

export type ChangeImpact = {
  changedInputs: ChangedProfileInput[];
  programChanges: ProgramChange[];
  summary: {
    entered: number;
    removed: number;
    movedUp: number;
    movedDown: number;
    eligibilityChanged: number;
  };
  /** Deterministic selected-target requirement, roadmap, and Next Action diff. Optional for stored-payload backward safety. */
  targetPlan?: TargetPlanChange;
};

const fitComponents: FitComponent[] = [
  "fieldFit",
  "academicFit",
  "budgetFit",
  "languageFit",
  "countryPreference",
  "timelineFit",
];

const reasonNames: Record<
  FitComponent,
  readonly [improved: ChangeReasonCode, decreased: ChangeReasonCode]
> = {
  fieldFit: ["field_fit_improved", "field_fit_decreased"],
  academicFit: ["academic_fit_improved", "academic_fit_decreased"],
  budgetFit: ["budget_fit_improved", "budget_fit_decreased"],
  languageFit: ["language_fit_improved", "language_fit_decreased"],
  countryPreference: [
    "country_preference_improved",
    "country_preference_decreased",
  ],
  timelineFit: ["timeline_fit_improved", "timeline_fit_decreased"],
};

const countryKey = (country: string) => country.trim().toLowerCase();

function countryMap(countries: string[]) {
  const countriesByKey = new Map<string, string>();
  for (const country of countries) {
    const key = countryKey(country);
    const current = countriesByKey.get(key);
    if (current === undefined || country < current) countriesByKey.set(key, country);
  }
  return countriesByKey;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function compareCountries(previous: string[], next: string[]) {
  const previousByKey = countryMap(previous);
  const nextByKey = countryMap(next);
  const addedCountries = [...nextByKey]
    .filter(([key]) => !previousByKey.has(key))
    .sort(([a], [b]) => compareText(a, b))
    .map(([, country]) => country);
  const removedCountries = [...previousByKey]
    .filter(([key]) => !nextByKey.has(key))
    .sort(([a], [b]) => compareText(a, b))
    .map(([, country]) => country);

  return { addedCountries, removedCountries };
}

function changedInputs(
  previousProfile: StudentProfile,
  nextProfile: StudentProfile,
): ChangedProfileInput[] {
  const changes: ChangedProfileInput[] = [];

  if (previousProfile.intendedField !== nextProfile.intendedField) {
    changes.push({
      input: "intendedField",
      previousValue: previousProfile.intendedField,
      nextValue: nextProfile.intendedField,
    });
  }
  if (previousProfile.targetDegree !== nextProfile.targetDegree) {
    changes.push({
      input: "targetDegree",
      previousValue: previousProfile.targetDegree,
      nextValue: nextProfile.targetDegree,
    });
  }
  if (
    previousProfile.annualBudget !== nextProfile.annualBudget ||
    previousProfile.budgetCurrency !== nextProfile.budgetCurrency
  ) {
    changes.push({
      input: "annualBudget",
      previousValue: previousProfile.annualBudget,
      nextValue: nextProfile.annualBudget,
      previousCurrency: previousProfile.budgetCurrency,
      nextCurrency: nextProfile.budgetCurrency,
    });
  }

  const countryChanges = compareCountries(
    previousProfile.preferredCountries,
    nextProfile.preferredCountries,
  );
  if (
    countryChanges.addedCountries.length > 0 ||
    countryChanges.removedCountries.length > 0
  ) {
    changes.push({ input: "preferredCountries", ...countryChanges });
  }

  for (const input of ["gpa", "ieltsScore", "satScore"] as const) {
    if (previousProfile[input] !== nextProfile[input]) {
      changes.push({
        input,
        previousValue: previousProfile[input],
        nextValue: nextProfile[input],
      });
    }
  }

  return changes;
}

function structuralChange(
  previousRank: number | null,
  nextRank: number | null,
): ProgramStructuralChange {
  if (previousRank === null) return "entered";
  if (nextRank === null) return "removed";
  if (nextRank < previousRank) return "moved_up";
  if (nextRank > previousRank) return "moved_down";
  return "unchanged";
}

function compareBreakdowns(
  previous: ScoreBreakdown,
  next: ScoreBreakdown,
) {
  const changes: FitComponentChange[] = [];
  const reasonCodes: ChangeReasonCode[] = [];
  let knownComponentChanged = false;

  for (const component of fitComponents) {
    const previousValue = previous[component];
    const nextValue = next[component];
    if (previousValue === nextValue) continue;

    changes.push({ component, previousValue, nextValue });
    if (previousValue === null || nextValue === null) continue;

    knownComponentChanged = true;
    reasonCodes.push(reasonNames[component][nextValue > previousValue ? 0 : 1]);
  }

  return { changes, reasonCodes, knownComponentChanged };
}

const priority: Record<ProgramStructuralChange, number> = {
  entered: 1,
  removed: 2,
  moved_up: 3,
  moved_down: 4,
  unchanged: 5,
};

function compareProgramChanges(a: ProgramChange, b: ProgramChange) {
  const aPriority =
    a.previousEligibility !== a.nextEligibility &&
    a.previousEligibility !== null &&
    a.nextEligibility !== null
      ? 0
      : priority[a.structuralChange];
  const bPriority =
    b.previousEligibility !== b.nextEligibility &&
    b.previousEligibility !== null &&
    b.nextEligibility !== null
      ? 0
      : priority[b.structuralChange];

  return (
    aPriority - bPriority ||
    (a.nextRank ?? Number.POSITIVE_INFINITY) -
      (b.nextRank ?? Number.POSITIVE_INFINITY) ||
    (a.previousRank ?? Number.POSITIVE_INFINITY) -
      (b.previousRank ?? Number.POSITIVE_INFINITY) ||
    compareText(a.programId, b.programId)
  );
}

export function buildChangeImpact(
  previousProfile: StudentProfile,
  nextProfile: StudentProfile,
  previousRecommendations: Recommendation[],
  nextRecommendations: Recommendation[],
): ChangeImpact {
  const previousById = new Map(
    previousRecommendations.map((recommendation, index) => [
      recommendation.program.id,
      { recommendation, rank: index + 1 },
    ]),
  );
  const nextById = new Map(
    nextRecommendations.map((recommendation, index) => [
      recommendation.program.id,
      { recommendation, rank: index + 1 },
    ]),
  );
  const programIds = new Set([...previousById.keys(), ...nextById.keys()]);
  const programChanges: ProgramChange[] = [];

  for (const programId of programIds) {
    const previous = previousById.get(programId) ?? null;
    const next = nextById.get(programId) ?? null;
    const previousRank = previous?.rank ?? null;
    const nextRank = next?.rank ?? null;
    const structure = structuralChange(previousRank, nextRank);
    const breakdown =
      previous !== null && next !== null
        ? compareBreakdowns(
            previous.recommendation.breakdown,
            next.recommendation.breakdown,
          )
        : { changes: [], reasonCodes: [], knownComponentChanged: false };
    const eligibilityChanged =
      previous !== null &&
      next !== null &&
      previous.recommendation.eligibility !== next.recommendation.eligibility;
    const fitScoreChanged =
      previous !== null &&
      next !== null &&
      previous.recommendation.fitScore !== next.recommendation.fitScore;

    if (
      structure === "unchanged" &&
      !fitScoreChanged &&
      !breakdown.knownComponentChanged &&
      !eligibilityChanged
    ) {
      continue;
    }

    const current = next?.recommendation ?? previous!.recommendation;
    programChanges.push({
      programId,
      universityName: current.program.universityName,
      programName: current.program.programName,
      previousRank,
      nextRank,
      previousFitScore: previous?.recommendation.fitScore ?? null,
      nextFitScore: next?.recommendation.fitScore ?? null,
      previousEligibility: previous?.recommendation.eligibility ?? null,
      nextEligibility: next?.recommendation.eligibility ?? null,
      structuralChange: structure,
      fitComponentChanges: breakdown.changes,
      reasonCodes: eligibilityChanged
        ? [...breakdown.reasonCodes, "eligibility_changed"]
        : breakdown.reasonCodes,
    });
  }

  programChanges.sort(compareProgramChanges);

  return {
    changedInputs: changedInputs(previousProfile, nextProfile),
    programChanges,
    summary: {
      entered: programChanges.filter(
        ({ structuralChange }) => structuralChange === "entered",
      ).length,
      removed: programChanges.filter(
        ({ structuralChange }) => structuralChange === "removed",
      ).length,
      movedUp: programChanges.filter(
        ({ structuralChange }) => structuralChange === "moved_up",
      ).length,
      movedDown: programChanges.filter(
        ({ structuralChange }) => structuralChange === "moved_down",
      ).length,
      eligibilityChanged: programChanges.filter(({ reasonCodes }) =>
        reasonCodes.includes("eligibility_changed"),
      ).length,
    },
  };
}

/**
 * Deterministic diff of the selected target's requirement states, roadmap
 * tasks, and Next Action between two profile states. Reuses the existing
 * criteria, roadmap, and Next Action generators; owns no new comparisons.
 *
 * `completedTaskIds` must be the same stored set for both sides so the Next
 * Action difference reflects the profile change, not unrelated progress.
 */
export function buildTargetPlanImpact(
  previousProfile: StudentProfile,
  nextProfile: StudentProfile,
  target: UniversityProgram,
  completedTaskIds: readonly string[] = [],
): TargetPlanChange {
  const previousCriteria = new Map(
    buildProfileProgramCriteria(previousProfile, assessProgram(previousProfile, target)).map(
      (criterion) => [criterion.key, criterion],
    ),
  );
  const nextCriteria = new Map(
    buildProfileProgramCriteria(nextProfile, assessProgram(nextProfile, target)).map(
      (criterion) => [criterion.key, criterion],
    ),
  );

  const criterionChanges: TargetCriterionChange[] = [];
  for (const [key, nextCriterion] of nextCriteria) {
    const previousCriterion = previousCriteria.get(key);
    if (previousCriterion === undefined || previousCriterion.status === nextCriterion.status) {
      continue;
    }
    criterionChanges.push({
      key,
      label: nextCriterion.label,
      previousStatus: previousCriterion.status,
      nextStatus: nextCriterion.status,
      previousValue: previousCriterion.profileValue,
      nextValue: nextCriterion.profileValue,
    });
  }
  criterionChanges.sort(
    (a, b) => canonicalEvidenceOrder[a.key] - canonicalEvidenceOrder[b.key],
  );

  const previousTasks = generateRoadmap(previousProfile, target);
  const nextTasks = generateRoadmap(nextProfile, target);
  const previousTasksById = new Map(previousTasks.map((item) => [item.id, item]));
  const nextTasksById = new Map(nextTasks.map((item) => [item.id, item]));

  const roadmapTaskChanges: RoadmapTaskChange[] = [];
  for (const [taskId, previousTask] of previousTasksById) {
    const nextTask = nextTasksById.get(taskId);
    if (!nextTask) {
      roadmapTaskChanges.push({
        change: "removed",
        taskId,
        title: previousTask.title,
        previousPriority: previousTask.priority,
      });
    } else if (nextTask.priority !== previousTask.priority) {
      roadmapTaskChanges.push({
        change: "priority_changed",
        taskId,
        title: nextTask.title,
        previousPriority: previousTask.priority,
        nextPriority: nextTask.priority,
      });
    }
  }
  for (const [taskId, nextTask] of nextTasksById) {
    if (!previousTasksById.has(taskId)) {
      roadmapTaskChanges.push({
        change: "added",
        taskId,
        title: nextTask.title,
        priority: nextTask.priority,
      });
    }
  }

  const knownTaskIds = new Set([...previousTasksById.keys(), ...nextTasksById.keys()]);
  const relevantCompletedIds = completedTaskIds.filter((id) => knownTaskIds.has(id));
  const previousNextAction = getNextAction(previousTasks, relevantCompletedIds);
  const nextNextAction = getNextAction(nextTasks, relevantCompletedIds);
  const nextActionChanged =
    (previousNextAction?.id ?? null) !== (nextNextAction?.id ?? null);

  return {
    criterionChanges,
    roadmapTaskChanges,
    nextActionChange: nextActionChanged
      ? {
          previousTitle: previousNextAction?.title ?? null,
          nextTitle: nextNextAction?.title ?? null,
        }
      : null,
  };
}

/**
 * Truthful record for a selected-target change. The previous plan was built
 * against a different program, so no criterion/roadmap/Next Action
 * before-vs-after claims are made — only the identity change is reported.
 * Recommendation-level consequences remain available through programChanges.
 */
export function buildTargetChangeImpact(
  previousTarget: UniversityProgram,
  nextTarget: UniversityProgram,
): TargetPlanChange {
  const displayName = (program: UniversityProgram) =>
    `${program.programName} @ ${program.universityName}`;
  return {
    targetChange: {
      previousProgramId: previousTarget.id,
      nextProgramId: nextTarget.id,
      previousName: displayName(previousTarget),
      nextName: displayName(nextTarget),
    },
    criterionChanges: [],
    roadmapTaskChanges: [],
    nextActionChange: null,
  };
}

/**
 * A profile edit is a meaningful Change Impact when at least one deterministic
 * consequence exists: recommendation movement, a target requirement state
 * change, a roadmap task change, a Next Action change, or a selected-target
 * change. A changed input with no downstream effect is not shown as impact.
 */
export function hasMeaningfulImpact(impact: ChangeImpact): boolean {
  if (impact.programChanges.length > 0) return true;
  const targetPlan = impact.targetPlan;
  if (!targetPlan) return false;
  if (targetPlan.targetChange) return true;
  return (
    targetPlan.criterionChanges.length > 0 ||
    targetPlan.roadmapTaskChanges.length > 0 ||
    targetPlan.nextActionChange !== null
  );
}
