import type {
  ProgramSource,
  Requirement,
  RoadmapHorizon,
  RoadmapItem,
  RoadmapPhase,
  RoadmapPriority,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import {
  buildProfileProgramCriteria,
  formatTuition,
  type ProfileProgramCriterion,
} from "./presentation.ts";
import { assessProgram } from "./recommend.ts";

export const roadmapHorizons: ReadonlyArray<{
  id: RoadmapHorizon;
  label: string;
  description: string;
}> = [
  { id: "now", label: "Now", description: "Confirmed requirement gaps to act on first." },
  { id: "next_30_days", label: "Next 30 days", description: "Verification work that unblocks preparation." },
  { id: "this_semester", label: "This semester", description: "Plans and materials that take longer to complete." },
  { id: "before_application", label: "Before application", description: "Final checks and submission through the official route." },
];

const priorityRank: Record<RoadmapPriority, number> = { high: 0, medium: 1, low: 2 };

const GAP_TASK_CRITERION: Partial<Record<string, "academic" | "ielts" | "sat">> = {
  "improve-academics": "academic",
  "prepare-ielts": "ielts",
  "take-ielts": "ielts",
  "prepare-sat": "sat",
  "take-sat": "sat",
};

const LOW_PRIORITY_TASKS = new Set(["review-application", "review-tuition"]);

const RELATED_REQUIREMENT: Record<string, string> = {
  "improve-academics": "Academic requirement",
  "verify-academic-score": "Academic requirement",
  "verify-academic": "Academic requirement",
  "prepare-ielts": "IELTS",
  "take-ielts": "IELTS",
  "verify-ielts": "IELTS",
  "prepare-sat": "SAT",
  "take-sat": "SAT",
  "verify-sat": "SAT",
  "plan-budget": "Tuition / budget",
  "review-tuition": "Tuition / budget",
  "verify-tuition": "Tuition / budget",
  "verify-documents": "Application documents",
  "prepare-documents": "Application documents",
  "prepare-motivation-letter": "Application documents",
  "prepare-recommendations": "Application documents",
  "verify-deadline": "Application deadline",
  "review-deadline": "Application deadline",
  "review-application": "Application instructions",
  "finalize-application": "Application preparation",
  "submit-application": "Application preparation",
};

function sourceFor(program: UniversityProgram, ...preferredTypes: ProgramSource["type"][]) {
  return preferredTypes
    .map((type) => program.sources.find((source) => source.type === type))
    .find((source) => source !== undefined) ?? null;
}

function task(
  program: UniversityProgram,
  id: string,
  title: string,
  description: string,
  phase: RoadmapItem["phase"],
  type: RoadmapItem["type"],
  source: ProgramSource | null = null,
  dueDate: string | null = null,
): RoadmapItem {
  return {
    id: `${program.id}:${id}`,
    title,
    description,
    dueDate,
    status: "not_started",
    phase,
    type,
    officialSourceLabel: source?.title ?? null,
    officialSourceUrl: source?.url ?? null,
    horizon: "now",
    priority: "medium",
    reason: "",
    relatedRequirement: "Application preparation",
  };
}

function isUnknown(requirement: Requirement | null) {
  return (
    requirement === null ||
    requirement.isRequired === null ||
    (requirement.isRequired && requirement.minimumScore === null)
  );
}

function scoreTasks(
  profile: StudentProfile,
  program: UniversityProgram,
  key: "ielts" | "sat",
  requirement: Requirement | null,
) {
  const items: RoadmapItem[] = [];
  if (requirement?.isRequired === false) return items;

  const label = key === "ielts" ? "IELTS" : "SAT";
  const value = key === "ielts" ? profile.ieltsScore : profile.satScore;
  const source = sourceFor(program, "admissions", "program");

  if (requirement?.isRequired !== true) {
    items.push(task(program, `verify-${key}`, `Verify whether ${label} is required`, `The current verified data does not state this program's ${label} requirement. Confirm it before planning test preparation.`, "now", "verification", source));
    return items;
  }

  if (requirement.minimumScore === null) {
    items.push(task(program, `verify-${key}`, `Confirm the required ${label} score`, `${program.programName} requires ${label}, but the current data has no directly comparable minimum.`, "now", "verification", source));
    return items;
  }

  if (value === null || value < requirement.minimumScore) {
    items.push(task(
      program,
      `prepare-${key}`,
      value === null ? `Plan for the published ${label} requirement` : `Raise your ${label} score to the published minimum`,
      value === null
        ? `No ${label} score is recorded. ${program.programName} publishes a minimum of ${requirement.minimumScore}.`
        : `Your current ${label} score is ${value}; ${program.programName} publishes a minimum of ${requirement.minimumScore}.`,
      "now",
      "requirement",
      source,
    ));
    items.push(task(program, `take-${key}`, `Take or retake ${label}`, `Obtain an official result that meets the published minimum of ${requirement.minimumScore} before applying.`, "prepare", "preparation", source));
  }

  return items;
}

function horizonFor(phase: RoadmapPhase, type: RoadmapItem["type"]): RoadmapHorizon {
  if (phase === "apply") return "before_application";
  if (phase === "prepare") return "this_semester";
  return type === "requirement" ? "now" : "next_30_days";
}

function priorityFor(
  shortId: string,
  criteria: ReadonlyMap<ProfileProgramCriterion["key"], ProfileProgramCriterion>,
): RoadmapPriority {
  if (LOW_PRIORITY_TASKS.has(shortId)) return "low";
  const criterionKey = GAP_TASK_CRITERION[shortId];
  if (criterionKey && criteria.get(criterionKey)?.status === "Action needed") return "high";
  return "medium";
}

function reasonFor(
  shortId: string,
  profile: StudentProfile,
  program: UniversityProgram,
  criteria: ReadonlyMap<ProfileProgramCriterion["key"], ProfileProgramCriterion>,
): string {
  switch (shortId) {
    case "improve-academics":
      return "Your GPA is below the directly comparable published minimum for this program.";
    case "verify-academic-score":
      return "The program publishes a comparable GPA minimum, but your current value is not recorded.";
    case "verify-academic":
      return program.academicRequirement?.isRequired === true
        ? "This academic requirement uses a different scale, so it needs individual verification."
        : "The current data does not state the academic entry requirement, so it needs verification.";
    case "prepare-ielts":
    case "prepare-sat": {
      const label = shortId === "prepare-ielts" ? "IELTS" : "SAT";
      const value = shortId === "prepare-ielts" ? profile.ieltsScore : profile.satScore;
      return value === null
        ? `The ${label} requirement is published, but no score is recorded yet.`
        : `Your ${label} score is below the published minimum.`;
    }
    case "take-ielts":
    case "take-sat": {
      const label = shortId === "take-ielts" ? "IELTS" : "SAT";
      const value = shortId === "take-ielts" ? profile.ieltsScore : profile.satScore;
      return value === null
        ? `An official ${label} result is needed to satisfy the published requirement.`
        : `Your current ${label} score is below the published minimum, so an official result at or above it is needed.`;
    }
    case "verify-ielts":
      return "The current data does not state this program's IELTS requirement, so it needs verification.";
    case "verify-sat":
      return "The current data does not state this program's SAT requirement, so it needs verification.";
    case "plan-budget":
      return "The published tuition is above the annual budget you provided.";
    case "review-tuition":
      return "Tuition is published in a different currency or billing period, so it cannot be compared with your budget.";
    case "verify-tuition":
      return program.tuition === null || program.tuitionCurrency === null
        ? "The current data does not include verified tuition for this program."
        : "Adding a comparable annual budget makes the published tuition comparable.";
    case "verify-documents":
      return "Document requirements for this program are not fully verified in the current dataset.";
    case "prepare-documents":
      return profile.activitiesAndAchievements?.trim()
        ? "Activities are available and can be used while preparing application materials."
        : "Application materials should match the requirements confirmed on the official source.";
    case "prepare-motivation-letter":
      return "The program's verified data requires a motivation letter.";
    case "prepare-recommendations":
      return "The program's verified data requires recommendation letters.";
    case "verify-deadline":
      return "The university has not provided a verified deadline in the current dataset.";
    case "review-deadline":
      return criteria.get("timeline")?.status === "Action needed"
        ? "The published deadline does not align with your target intake year, so the correct application cycle needs confirming."
        : "The published deadline defines the correct application window.";
    case "review-application":
      return "The official application route defines how and where to submit.";
    case "finalize-application":
      return "A final check keeps the submission consistent with the program's confirmed requirements.";
    case "submit-application":
      return "The application is only complete once submitted through the official route.";
    default:
      return "This step keeps your application aligned with the program's verified facts.";
  }
}

function enrichTask(
  item: RoadmapItem,
  profile: StudentProfile,
  program: UniversityProgram,
  criteria: ReadonlyMap<ProfileProgramCriterion["key"], ProfileProgramCriterion>,
): RoadmapItem {
  const shortId = item.id.slice(program.id.length + 1);
  return {
    ...item,
    horizon: horizonFor(item.phase, item.type),
    priority: priorityFor(shortId, criteria),
    reason: reasonFor(shortId, profile, program, criteria),
    relatedRequirement: RELATED_REQUIREMENT[shortId] ?? item.type,
  };
}

export function generateRoadmap(
  profile: StudentProfile,
  program: UniversityProgram,
): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const academic = program.academicRequirement;
  const activities = profile.activitiesAndAchievements?.trim();
  const criteria = new Map(buildProfileProgramCriteria(profile, assessProgram(profile, program)).map((criterion) => [criterion.key, criterion]));
  const admissionsSource = sourceFor(program, "admissions", "program");
  const academicCriterion = criteria.get("academic")!;

  if (academicCriterion.status === "Action needed" && academic?.minimumScore !== null && academic?.minimumScore !== undefined && profile.gpa !== null) {
    items.push(task(program, "improve-academics", "Address the published academic requirement gap", `Your current GPA is ${profile.gpa}; ${program.programName} publishes a minimum of ${academic.minimumScore}.`, "now", "requirement", admissionsSource));
  } else if (academicCriterion.status === "Needs verification" && academic?.isRequired === true && academic.minimumScore !== null && profile.gpa === null) {
    items.push(task(program, "verify-academic-score", "Confirm your current GPA", `Record or verify your GPA against the published minimum of ${academic.minimumScore}.`, "now", "requirement", admissionsSource));
  }

  items.push(...scoreTasks(profile, program, "ielts", program.ieltsRequirement));
  items.push(...scoreTasks(profile, program, "sat", program.satRequirement));

  if (isUnknown(academic) || academicCriterion.status === "Not comparable") {
    items.push(task(
      program,
      "verify-academic",
      academic?.isRequired === true ? "Verify how your school qualification is evaluated" : "Confirm the academic entry requirements",
      academic?.isRequired === true
        ? `${program.programName} publishes qualification-specific academic criteria rather than one directly comparable GPA threshold.`
        : "The current verified data does not provide a directly comparable academic requirement.",
      "now",
      "verification",
      admissionsSource,
    ));
  }

  const tuition = criteria.get("tuition")!;
  const tuitionSource = sourceFor(program, "tuition", "admissions", "program");
  if (tuition.status === "Action needed") {
    items.push(task(program, "plan-budget", "Plan for the published tuition gap", `${tuition.programValue} is above ${tuition.profileValue}. Review how you would fund the difference without assuming unverified funding.`, "prepare", "preparation", tuitionSource));
  } else if (tuition.status === "Not comparable") {
    items.push(task(program, "review-tuition", "Review tuition in the published currency", `${formatTuition(program)} cannot be compared directly with your current annual budget. We do not estimate exchange rates.`, "prepare", "verification", tuitionSource));
  } else if (tuition.status === "Needs verification") {
    items.push(task(
      program,
      "verify-tuition",
      program.tuition === null || program.tuitionCurrency === null ? "Confirm tuition for this program" : "Add an annual budget and currency",
      program.tuition === null || program.tuitionCurrency === null
        ? `The current verified data does not include comparable tuition for ${program.programName}.`
        : `Use ${formatTuition(program)} to plan a comparable annual budget.`,
      "prepare",
      "verification",
      tuitionSource,
    ));
  }

  items.push(task(
    program,
    "verify-documents",
    "Confirm the required application documents",
    `Review the official admissions page for ${program.programName}. Confirm any document requirements that are not yet verified before preparing your final package.`,
    "prepare",
    "verification",
    admissionsSource,
  ));
  items.push(task(
    program,
    "prepare-documents",
    `Prepare your ${program.programName} application materials`,
    activities
      ? "Use the activities and achievements you provided as relevant examples only where the program's confirmed application materials ask for them."
      : "Assemble only the materials confirmed by the program's current official instructions.",
    "prepare",
    "preparation",
    admissionsSource,
  ));

  if (program.applicationDocuments?.motivationLetter === true) {
    items.push(task(program, "prepare-motivation-letter", "Prepare the required motivation letter", `Draft and revise the motivation letter required for ${program.programName}.`, "prepare", "preparation", admissionsSource));
  }
  if (program.applicationDocuments?.recommendationLetters === true) {
    items.push(task(program, "prepare-recommendations", "Prepare the required recommendation letters", `Allow time for the recommendation letters required for ${program.programName}.`, "prepare", "preparation", admissionsSource));
  }

  const deadlineSource = sourceFor(program, "deadline", "admissions", "program");
  const timeline = criteria.get("timeline")!;
  items.push(task(
    program,
    program.deadline === null ? "verify-deadline" : "review-deadline",
    program.deadline === null
      ? "Confirm the application deadline"
      : timeline.status === "Action needed"
        ? "Confirm this deadline matches your target intake"
        : "Recheck the final application deadline",
    program.deadline === null
      ? `No verified deadline is available for ${program.programName}. Confirm it before scheduling submission.`
      : timeline.status === "Action needed"
        ? `The published deadline is ${program.deadline}, while your target intake is ${profile.targetIntake}. Confirm the correct application cycle.`
        : `The published deadline is ${program.deadline}. Recheck it on the official page before submitting.`,
    "apply",
    "verification",
    deadlineSource,
    program.deadline,
  ));

  const applicationSource = sourceFor(program, "admissions", "program");
  items.push(task(program, "review-application", "Review the official application instructions", `Follow the current application route published for ${program.programName}.`, "apply", "application", applicationSource));
  items.push(task(program, "finalize-application", `Final review for ${program.programName}`, "Check that your verified documents and application details match the current official instructions before submission.", "apply", "preparation", applicationSource));
  items.push(task(program, "submit-application", "Submit through the official application route", program.deadline === null ? "Submit only after confirming the deadline, required materials, and official instructions." : `Submit the verified application package by the published deadline of ${program.deadline}.`, "apply", "application", applicationSource, program.deadline));

  return items.map((item) => enrichTask(item, profile, program, criteria));
}

export function getRoadmapProgress(
  items: readonly RoadmapItem[],
  completedIds: readonly string[],
) {
  const validIds = new Set(items.map(({ id }) => id));
  const completed = new Set(completedIds.filter((id) => validIds.has(id))).size;
  const total = items.length;
  return { completed, total, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export function getPrioritizedRoadmapItems(items: readonly RoadmapItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priorityRank[a.item.priority] - priorityRank[b.item.priority] || a.index - b.index)
    .map(({ item }) => item);
}

export function getNextAction(
  items: readonly RoadmapItem[],
  completedIds: readonly string[],
) {
  const completed = new Set(completedIds);
  let next: { item: RoadmapItem; rank: number } | null = null;
  for (const item of items) {
    if (completed.has(item.id)) continue;
    const rank = priorityRank[item.priority];
    if (next === null || rank < next.rank) next = { item, rank };
  }
  return next?.item ?? null;
}

export function hasStrongProfileState(items: readonly RoadmapItem[]) {
  return !items.some(({ id, type }) =>
    type === "requirement" || /:verify-(?:academic|ielts|sat)$/.test(id),
  );
}
