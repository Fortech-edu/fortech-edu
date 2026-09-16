import type {
  Requirement,
  RoadmapItem,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";

function task(
  programId: string,
  type: string,
  title: string,
  description: string,
  dueDate: string | null = null,
): RoadmapItem {
  return {
    id: `${programId}:${type}`,
    title,
    description,
    dueDate,
    status: "not_started",
  };
}

function isUnknown(requirement: Requirement | null) {
  return (
    requirement === null ||
    requirement.isRequired === null ||
    (requirement.isRequired && requirement.minimumScore === null)
  );
}

export function generateRoadmap(
  profile: StudentProfile,
  program: UniversityProgram,
): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const academic = program.academicRequirement;
  const ielts = program.ieltsRequirement;
  const sat = program.satRequirement;

  if (isUnknown(academic)) {
    items.push(task(program.id, "verify-academic", "Verify the academic requirement", "Confirm the academic entry requirement with the program before planning your application."));
  } else if (academic?.isRequired && profile.gpa === null) {
    items.push(task(program.id, "verify-academic-score", "Confirm your academic score", `Record or verify your current GPA against the known requirement of ${academic.minimumScore}.`));
  }

  if (isUnknown(ielts)) {
    items.push(task(program.id, "verify-language", "Verify the language requirement", "Confirm whether IELTS is required and what score is accepted. No score is assumed."));
  }

  if (isUnknown(sat)) {
    items.push(task(program.id, "verify-sat", "Verify the SAT requirement", "Confirm whether an SAT score is required. No score is assumed."));
  }

  if (program.deadline === null) {
    items.push(task(program.id, "verify-deadline", "Verify the application deadline", "The deadline is unknown. Confirm it before scheduling your application."));
  }

  if (
    academic?.isRequired === true &&
    academic.minimumScore !== null &&
    profile.gpa !== null &&
    profile.gpa < academic.minimumScore
  ) {
    items.push(task(program.id, "improve-academics", "Address the academic requirement gap", `Your current GPA is ${profile.gpa}; the listed requirement is ${academic.minimumScore}. Review realistic improvement or alternative options without assuming admission.`));
  }

  if (
    ielts?.isRequired === true &&
    ielts.minimumScore !== null &&
    (profile.ieltsScore === null || profile.ieltsScore < ielts.minimumScore)
  ) {
    const startingPoint = profile.ieltsScore === null ? "No IELTS score is recorded." : `Your current score is ${profile.ieltsScore}.`;
    items.push(task(program.id, "prepare-ielts", profile.ieltsScore === null ? "Prepare for IELTS" : "Improve your IELTS score", `${startingPoint} Prepare toward the listed requirement of ${ielts.minimumScore}.`));
    items.push(task(program.id, "take-ielts", "Take or retake IELTS", `Obtain an official result that meets the listed requirement of ${ielts.minimumScore}.`));
  }

  if (
    sat?.isRequired === true &&
    sat.minimumScore !== null &&
    (profile.satScore === null || profile.satScore < sat.minimumScore)
  ) {
    const startingPoint = profile.satScore === null ? "No SAT score is recorded." : `Your current score is ${profile.satScore}.`;
    items.push(task(program.id, "prepare-sat", profile.satScore === null ? "Prepare for the SAT" : "Improve your SAT score", `${startingPoint} Prepare toward the listed requirement of ${sat.minimumScore}.`));
    items.push(task(program.id, "take-sat", "Take or retake the SAT", `Obtain an official result that meets the listed requirement of ${sat.minimumScore}.`));
  }

  items.push(task(program.id, "prepare-documents", "Prepare application documents", "Collect the general application materials requested by the program. Verify the exact document list before submission."));

  if (program.deadline !== null) {
    items.push(task(program.id, "review-deadline", "Review the application deadline", `Plan around the listed deadline of ${program.deadline}.`, program.deadline));
  }

  items.push(task(program.id, "prepare-application", "Prepare the application", "Review the application for completeness and confirm that current requirements are addressed."));
  items.push(task(program.id, "submit-application", "Submit the application", program.deadline === null ? "Submit only after verifying the official deadline and application instructions." : `Submit by the listed deadline of ${program.deadline}.`, program.deadline));

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
