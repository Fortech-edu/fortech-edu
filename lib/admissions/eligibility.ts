import type {
  EligibilityStatus,
  Requirement,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";

function isUnknown(requirement: Requirement | null) {
  return (
    requirement === null ||
    requirement.isRequired === null ||
    (requirement.isRequired && requirement.minimumScore === null)
  );
}

export function evaluateEligibility(
  profile: StudentProfile,
  program: UniversityProgram,
): EligibilityStatus {
  const academic = program.academicRequirement;

  if (
    academic?.isRequired === true &&
    academic.minimumScore !== null &&
    profile.gpa !== null &&
    profile.gpa < academic.minimumScore
  ) {
    return "not_eligible";
  }

  const requirements = [
    [profile.gpa, academic],
    [profile.ieltsScore, program.ieltsRequirement],
    [profile.satScore, program.satRequirement],
  ] as const;

  if (
    requirements.some(
      ([value, requirement]) =>
        isUnknown(requirement) ||
        (requirement?.isRequired === true && value === null),
    )
  ) {
    return "requires_verification";
  }

  const hasImprovableGap = requirements.slice(1).some(
    ([value, requirement]) =>
      requirement?.isRequired === true &&
      requirement.minimumScore !== null &&
      value !== null &&
      value < requirement.minimumScore,
  );

  return hasImprovableGap ? "with_actions" : "eligible_now";
}
