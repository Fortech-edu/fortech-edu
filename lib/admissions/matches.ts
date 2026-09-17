import { programs } from "../../data/programs.ts";
import type { StudentProfile } from "../../types/admissions.ts";
import { recommendPrograms } from "./recommend.ts";

export function getPrimaryMatches(profile: StudentProfile) {
  return recommendPrograms(profile, programs);
}
