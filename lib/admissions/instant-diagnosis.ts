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
import { isScoreValid } from "../onboarding.ts";

export type InstantActionBasis =
  | "Confirmed gap"
  | "Missing current value"
  | "Needs verification";

export type InstantDiagnosisAction = RoadmapItem & {
  basis: InstantActionBasis;
  relatedRequirement: string;
};

export type InstantDiagnosis = {
  timeline: {
    currentStudyStage: {
      value: string;
      status: "Provided" | "Needs verification";
      detail: string;
    };
    deadline: {
      value: string;
      status: "Published" | "Needs verification";
      detail: string;
    };
  };
  comparisons: ProfileProgramCriterion[];
  biggestGaps: ProfileProgramCriterion[];
  nextActions: InstantDiagnosisAction[];
};

function actionContext(
  item: RoadmapItem,
  profile: StudentProfile,
  program: UniversityProgram,
  comparisons: ReadonlyMap<ProfileProgramCriterion["key"], ProfileProgramCriterion>,
): Pick<InstantDiagnosisAction, "basis" | "relatedRequirement"> | null {
  const id = item.id.slice(program.id.length + 1);
  const academicStatus = comparisons.get("academic")?.status;

  if (id === "improve-academics") {
    return academicStatus === "Action needed"
      ? { basis: "Confirmed gap", relatedRequirement: "Academic requirement" }
      : null;
  }
  if (id === "verify-academic-score") {
    return academicStatus === "Needs verification"
      ? { basis: "Missing current value", relatedRequirement: "Academic requirement" }
      : null;
  }
  if (id === "verify-academic") {
    return academicStatus === "Needs verification" || academicStatus === "Not comparable"
      ? { basis: "Needs verification", relatedRequirement: "Academic requirement" }
      : null;
  }

  for (const key of ["ielts", "sat"] as const) {
    const label = key === "ielts" ? "IELTS" : "SAT";
    const value = key === "ielts" ? profile.ieltsScore : profile.satScore;
    const status = comparisons.get(key)?.status;
    if (id === `verify-${key}`) {
      return status === "Needs verification"
        ? { basis: "Needs verification", relatedRequirement: label }
        : null;
    }
    if (id === `prepare-${key}`) {
      if (value === null && status === "Needs verification") {
        return { basis: "Missing current value", relatedRequirement: label };
      }
      return status === "Action needed"
        ? { basis: "Confirmed gap", relatedRequirement: label }
        : null;
    }
    if (id === `take-${key}` && value !== null && status === "Action needed") {
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
  const comparisonsByKey = new Map(comparisons.map((comparison) => [comparison.key, comparison]));

  const nextActions = generateRoadmap(profile, program)
    .flatMap((item) => {
      const context = actionContext(item, profile, program, comparisonsByKey);
      return context ? [{ ...item, ...context }] : [];
    })
    .slice(0, 5);

  return {
    timeline: {
      currentStudyStage: profile.currentStudyStage
        ? { value: profile.currentStudyStage, status: "Provided", detail: "Provided for context; study stage does not change deterministic matching." }
        : { value: "Unknown", status: "Needs verification", detail: "Current study stage was not provided, so no application cycle is inferred." },
      deadline: program.deadline
        ? { value: program.deadline, status: "Published", detail: "Shown exactly as recorded in the verified program data; no countdown is inferred." }
        : { value: "Unknown", status: "Needs verification", detail: "No verified deadline is available in the current program data." },
    },
    comparisons,
    biggestGaps: comparisons.filter(({ status }) => status === "Action needed"),
    nextActions,
  };
}

export type LiveComparison = ProfileProgramCriterion & {
  isInvalid?: boolean;
  validationError?: string;
};

export type LiveDiagnosisResult = {
  diagnosis: Omit<InstantDiagnosis, "comparisons"> & {
    comparisons: LiveComparison[];
  };
  hasInvalidScores: boolean;
  fieldErrors: Partial<Record<"gpa" | "ieltsScore" | "satScore", string>>;
};

export function resolveLiveInstantDiagnosis(
  profile: StudentProfile,
  program: UniversityProgram,
): LiveDiagnosisResult {
  const gpaValid = isScoreValid("academic", profile.gpa);
  const ieltsValid = isScoreValid("ielts", profile.ieltsScore);
  const satValid = isScoreValid("sat", profile.satScore);

  const fieldErrors: Partial<Record<"gpa" | "ieltsScore" | "satScore", string>> = {};
  if (!gpaValid) fieldErrors.gpa = "Enter a GPA between 0 and 4.";
  if (!ieltsValid) fieldErrors.ieltsScore = "Enter an IELTS score between 0 and 9.";
  if (!satValid) fieldErrors.satScore = "Enter an SAT score between 400 and 1600.";

  const hasInvalidScores = Boolean(fieldErrors.gpa || fieldErrors.ieltsScore || fieldErrors.satScore);

  // Sanitize profile so invalid score inputs are never passed into deterministic calculations
  const sanitizedProfile: StudentProfile = {
    ...profile,
    gpa: gpaValid ? profile.gpa : null,
    ieltsScore: ieltsValid ? profile.ieltsScore : null,
    satScore: satValid ? profile.satScore : null,
  };

  const baseDiagnosis = buildInstantDiagnosis(sanitizedProfile, program);

  // Neutralize affected comparison rows for invalid scores so they never show Match or false gaps
  const comparisons: LiveComparison[] = baseDiagnosis.comparisons.map((c) => {
    if (c.key === "academic" && !gpaValid) {
      return {
        ...c,
        profileValue: `Invalid input (${profile.gpa})`,
        status: "Needs verification" as const,
        detail: "Enter a GPA between 0 and 4 to check this requirement.",
        isInvalid: true,
        validationError: fieldErrors.gpa,
      };
    }
    if (c.key === "ielts" && !ieltsValid) {
      return {
        ...c,
        profileValue: `Invalid input (${profile.ieltsScore})`,
        status: "Needs verification" as const,
        detail: "Enter an IELTS score between 0 and 9 to check this requirement.",
        isInvalid: true,
        validationError: fieldErrors.ieltsScore,
      };
    }
    if (c.key === "sat" && !satValid) {
      return {
        ...c,
        profileValue: `Invalid input (${profile.satScore})`,
        status: "Needs verification" as const,
        detail: "Enter an SAT score between 400 and 1600 to check this requirement.",
        isInvalid: true,
        validationError: fieldErrors.satScore,
      };
    }
    return c;
  });

  return {
    diagnosis: {
      ...baseDiagnosis,
      comparisons,
      biggestGaps: comparisons.filter((c) => c.status === "Action needed" && !c.isInvalid),
    },
    hasInvalidScores,
    fieldErrors,
  };
}
