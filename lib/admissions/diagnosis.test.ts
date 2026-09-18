import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { StudentProfile } from "../../types/admissions.ts";
import { diagnoseProfile } from "./diagnosis.ts";

const profile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Canada"],
  preferredLanguage: null,
  targetIntake: "Fall 2027",
  gpa: 3.5,
  ieltsScore: null,
  satScore: null,
  annualBudget: 25000,
  budgetCurrency: "USD",
};

test("diagnosis separates strengths, actions, and unknown information", () => {
  const diagnosis = diagnoseProfile(profile);

  assert.ok(diagnosis.strengths.includes("Study field is clearly defined"));
  assert.ok(diagnosis.gaps.includes("Add an IELTS score when it becomes available"));
  assert.ok(diagnosis.missingInformation.includes("IELTS score"));
  assert.ok(diagnosis.missingInformation.includes("SAT score"));
});

test("diagnosis UI keeps missing-profile recovery and the Matches CTA", () => {
  const source = readFileSync(
    new URL("../../components/journey/diagnosis-view.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(source.includes("Build your profile first"));
  assert.ok(source.includes('href="/onboarding"'));
  assert.ok(source.includes('href="/matches"'));
  assert.ok(source.includes("See programs for my profile"));
});
