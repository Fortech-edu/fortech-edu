import type { Diagnosis, StudentProfile } from "../../types/admissions.ts";

export function diagnoseProfile(profile: StudentProfile): Diagnosis {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const missingInformation: string[] = [];

  if (profile.intendedField) strengths.push("Study field is clearly defined");
  else missingInformation.push("Intended field");

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
