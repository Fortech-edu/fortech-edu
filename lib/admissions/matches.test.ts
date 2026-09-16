import assert from "node:assert/strict";
import test from "node:test";
import type { StudentProfile } from "../../types/admissions.ts";
import { getPrimaryMatches } from "./matches.ts";

const profile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Canada"],
  targetIntake: "Fall 2027",
  gpa: 3.4,
  ieltsScore: 6.5,
  satScore: 1300,
  annualBudget: 30000,
  budgetCurrency: "USD",
};

test("matches derive from the latest profile instead of cached recommendations", () => {
  const cs = getPrimaryMatches(profile).map(({ program }) => program.id);
  const business = getPrimaryMatches({ ...profile, intendedField: "Business" }).map(
    ({ program }) => program.id,
  );

  assert.notDeepEqual(cs, business);
  assert.equal(cs.some((id) => business.includes(id)), false);
  assert.equal(cs.some((id) => id.includes("business")), false);
});
