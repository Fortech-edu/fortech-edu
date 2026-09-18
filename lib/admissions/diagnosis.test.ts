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

test("diagnosis surfaces provided activities as context without warning when empty", () => {
  const empty = diagnoseProfile({ ...profile, activitiesAndAchievements: "  " });
  const provided = diagnoseProfile({ ...profile, activitiesAndAchievements: "Robotics olympiad and volunteering" });

  assert.equal(empty.strengths.some((item) => item.includes("Activities and achievements")), false);
  assert.equal(empty.missingInformation.some((item) => item.includes("Activities")), false);
  assert.ok(provided.strengths.includes("Activities and achievements are available for application planning"));
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
  assert.ok(source.includes('title="Activities and achievements" values={[activities]}'));
});
