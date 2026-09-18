import type {
  RoadmapItem,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import {
  buildProfileProgramCriteria,
  type ProfileProgramCriterion,
} from "./presentation.ts";
import { assessProgram } from "./recommend.ts";
import { generateRoadmap } from "./roadmap.ts";

export type InstantActionBasis =
  | "Confirmed gap"
  | "Missing current value"
  | "Needs verification";

export type InstantDiagnosisAction = RoadmapItem & {
  basis: InstantActionBasis;
  relatedRequirement: string;
};

export type InstantDiagnosis = {
  comparisons: ProfileProgramCriterion[];
  biggestGaps: ProfileProgramCriterion[];
  nextActions: InstantDiagnosisAction[];
};

function actionContext(
  item: RoadmapItem,
  profile: StudentProfile,
  program: UniversityProgram,
): Pick<InstantDiagnosisAction, "basis" | "relatedRequirement"> | null {
  const id = item.id.slice(program.id.length + 1);

  if (id === "improve-academics") {
    return { basis: "Confirmed gap", relatedRequirement: "Academic requirement" };
  }
  if (id === "verify-academic-score") {
    return { basis: "Missing current value", relatedRequirement: "Academic requirement" };
  }
  if (id === "verify-academic") {
    return { basis: "Needs verification", relatedRequirement: "Academic requirement" };
  }

  for (const key of ["ielts", "sat"] as const) {
    const label = key === "ielts" ? "IELTS" : "SAT";
    const value = key === "ielts" ? profile.ieltsScore : profile.satScore;
    if (id === `verify-${key}`) return { basis: "Needs verification", relatedRequirement: label };
    if (id === `prepare-${key}`) {
      return {
        basis: value === null ? "Missing current value" : "Confirmed gap",
        relatedRequirement: label,
      };
    }
    if (id === `take-${key}` && value !== null) {
      return { basis: "Confirmed gap", relatedRequirement: label };
    }
  }

  if (id === "verify-documents") {
    return { basis: "Needs verification", relatedRequirement: "Application documents" };
  }
  if (id === "verify-deadline" || id === "review-deadline") {
    return { basis: "Needs verification", relatedRequirement: "Application deadline" };
  }
  if (id === "review-application") {
    return { basis: "Needs verification", relatedRequirement: "Application instructions" };
  }

  return null;
}

export function buildInstantDiagnosis(
  profile: StudentProfile,
  program: UniversityProgram,
): InstantDiagnosis {
  const comparisons = buildProfileProgramCriteria(
    profile,
    assessProgram(profile, program),
  ).filter(({ key }) => key === "academic" || key === "ielts" || key === "sat");

  const nextActions = generateRoadmap(profile, program)
    .flatMap((item) => {
      const context = actionContext(item, profile, program);
      return context ? [{ ...item, ...context }] : [];
    })
    .slice(0, 5);

  return {
    comparisons,
    biggestGaps: comparisons.filter(({ status }) => status === "Action needed"),
    nextActions,
  };
}
