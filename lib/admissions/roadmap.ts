import type {
  ProgramSource,
  Requirement,
  RoadmapItem,
  RoadmapPhase,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import { buildProfileProgramCriteria, formatTuition } from "./presentation.ts";
import { assessProgram } from "./recommend.ts";

export const roadmapPhases: ReadonlyArray<{
  id: RoadmapPhase;
  label: string;
  description: string;
}> = [
  { id: "now", label: "Now", description: "Resolve known gaps and verify requirements that are still unclear." },
  { id: "prepare", label: "Prepare", description: "Confirm the official checklist, then assemble only verified materials." },
  { id: "apply", label: "Apply", description: "Recheck timing and follow the university's official application instructions." },
];

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

export function generateRoadmap(
  profile: StudentProfile,
  program: UniversityProgram,
): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const academic = program.academicRequirement;
  const criteria = new Map(buildProfileProgramCriteria(profile, assessProgram(profile, program)).map((criterion) => [criterion.key, criterion]));
  const admissionsSource = sourceFor(program, "admissions", "program");

  if (
    academic?.isRequired === true &&
    academic.minimumScore !== null &&
    profile.gpa !== null &&
    profile.gpa < academic.minimumScore
  ) {
    items.push(task(program, "improve-academics", "Address the published academic requirement gap", `Your current GPA is ${profile.gpa}; ${program.programName} publishes a minimum of ${academic.minimumScore}.`, "now", "requirement", admissionsSource));
  } else if (academic?.isRequired === true && academic.minimumScore !== null && profile.gpa === null) {
    items.push(task(program, "verify-academic-score", "Confirm your current GPA", `Record or verify your GPA against the published minimum of ${academic.minimumScore}.`, "now", "requirement", admissionsSource));
  }

  items.push(...scoreTasks(profile, program, "ielts", program.ieltsRequirement));
  items.push(...scoreTasks(profile, program, "sat", program.satRequirement));

  if (isUnknown(academic)) {
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
  items.push(task(program, "prepare-documents", `Prepare your ${program.programName} application materials`, "Assemble only the materials confirmed by the program's current official instructions.", "prepare", "preparation", admissionsSource));

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

  return items;
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

export function getNextAction(
  items: readonly RoadmapItem[],
  completedIds: readonly string[],
) {
  const completed = new Set(completedIds);
  return items.find(({ id }) => !completed.has(id)) ?? null;
}

export function hasStrongProfileState(items: readonly RoadmapItem[]) {
  return !items.some(({ id, type }) =>
    type === "requirement" || /:verify-(?:academic|ielts|sat)$/.test(id),
  );
}
