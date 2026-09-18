import type {
  Diagnosis,
  Recommendation,
  RoadmapItem,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import {
  buildInstantDiagnosis,
  type InstantDiagnosisAction,
} from "./instant-diagnosis.ts";
import {
  buildProfileProgramCriteria,
  buildTargetRequirementFacts,
  type ComparisonStatus,
  type ProfileProgramCriterion,
} from "./presentation.ts";
import { assessProgram } from "./recommend.ts";
import { generateRoadmap } from "./roadmap.ts";

export type DiagnosisVerificationItem = {
  key: string;
  label: string;
  status: Extract<ComparisonStatus, "Needs verification" | "Not comparable">;
  currentValue: string | null;
  requirementValue: string;
  detail: string;
};

export type TargetDiagnosis = {
  profileDiagnosis: Diagnosis;
  recommendation: Recommendation;
  requirementCoverage: ProfileProgramCriterion[];
  biggestGaps: ProfileProgramCriterion[];
  unknowns: DiagnosisVerificationItem[];
  priorities: InstantDiagnosisAction[];
  roadmapPreview: RoadmapItem[];
};

export function diagnoseProfile(profile: StudentProfile): Diagnosis {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const missingInformation: string[] = [];

  if (profile.intendedField) strengths.push("Study field is clearly defined");
  else missingInformation.push("Intended field");

  const activities = profile.activitiesAndAchievements?.trim();
  if (activities) strengths.push("Activities and achievements are available for application planning");

  if (profile.ieltsScore !== null) strengths.push("IELTS score is available");
  else {
    missingInformation.push("IELTS score");
    gaps.push("Add an IELTS score when it becomes available");
  }

  if (profile.preferredCountries.length > 0) strengths.push("Country preferences are clear");
  else {
    missingInformation.push("Country preferences");
    gaps.push("Choose preferred countries to narrow future matches");
  }

  if (profile.annualBudget !== null) strengths.push("Annual tuition budget is defined");
  else {
    missingInformation.push("Annual tuition budget");
    gaps.push("Add a tuition budget to assess affordability");
  }

  if (profile.gpa !== null) strengths.push("Academic result is available");
  else {
    missingInformation.push("Academic score / GPA");
    gaps.push("Add your academic score or GPA when known");
  }

  if (profile.satScore === null) {
    missingInformation.push("SAT score");
    gaps.push("Check whether your future program choices require SAT");
  }

  return { strengths, gaps, missingInformation };
}

export function diagnoseTarget(
  profile: StudentProfile,
  program: UniversityProgram | null,
): TargetDiagnosis | null {
  if (!program) return null;

  const recommendation = assessProgram(profile, program);
  const requirementCoverage = buildProfileProgramCriteria(profile, recommendation);
  const instant = buildInstantDiagnosis(profile, program);
  const documentFact = buildTargetRequirementFacts(program).find(({ key }) => key === "documents");
  const unknowns: DiagnosisVerificationItem[] = requirementCoverage
    .filter(({ status }) => status === "Needs verification" || status === "Not comparable")
    .map((criterion) => ({
      key: criterion.key,
      label: criterion.label,
      status: criterion.status as DiagnosisVerificationItem["status"],
      currentValue: criterion.profileValue,
      requirementValue: criterion.programValue,
      detail: criterion.detail,
    }));

  if (!profile.currentStudyStage) {
    unknowns.unshift({
      key: "currentStudyStage",
      label: "Current study stage",
      status: "Needs verification",
      currentValue: null,
      requirementValue: "Not provided",
      detail: "Add your current study stage to keep planning context complete.",
    });
  }
  if (documentFact?.state === "unknown") {
    unknowns.push({
      key: documentFact.key,
      label: documentFact.label,
      status: "Needs verification",
      currentValue: null,
      requirementValue: documentFact.value,
      detail: documentFact.detail,
    });
  }

  return {
    profileDiagnosis: diagnoseProfile(profile),
    recommendation,
    requirementCoverage,
    biggestGaps: instant.biggestGaps,
    unknowns,
    priorities: instant.nextActions,
    roadmapPreview: generateRoadmap(profile, program).slice(0, 3),
  };
}
