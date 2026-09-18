import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { StudentProfile } from "../types/admissions.ts";
import { emptyProfile, numberOrNull, stepErrors, toggleCountry, validStep } from "./onboarding.ts";
import { parseStoredProfile } from "./storage/profile.ts";

const profile = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  ...emptyProfile,
  currentStudyStage: "Grade 11",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  targetIntake: "Fall 2027",
  ...overrides,
});

test("initial onboarding requires only the direction choices", () => {
  assert.deepEqual(Object.keys(stepErrors(1, emptyProfile)), [
    "currentStudyStage",
    "targetDegree",
    "intendedField",
  ]);
});

test("language preference is optional and legacy profiles restore it as unknown", () => {
  assert.equal(emptyProfile.preferredLanguage, null);
  const legacy = { ...profile() } as Record<string, unknown>;
  delete legacy.preferredLanguage;
  const restored = parseStoredProfile(JSON.stringify({ version: 1, profile: legacy, step: 3, completed: false }));
  assert.equal(restored?.profile.preferredLanguage, null);
});

test("onboarding review shows the selected language or a neutral no-preference value", () => {
  const source = readFileSync(new URL("../components/journey/onboarding-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('Preferred language: {display(profile.preferredLanguage, "No language preference")}'));
});

test("optional academic blanks remain null and valid", () => {
  assert.equal(numberOrNull(""), null);
  assert.equal(validStep(2, profile()), true);
});

test("academic score ranges are validated independently", () => {
  assert.equal(validStep(2, profile({ gpa: 3.5, ieltsScore: 6, satScore: 1200 })), true);
  assert.equal(stepErrors(2, profile({ gpa: 4.1 })).gpa, "Enter a GPA between 0 and 4.");
  assert.equal(stepErrors(2, profile({ ieltsScore: 9.5 })).ieltsScore, "Enter an IELTS score between 0 and 9.");
  assert.equal(stepErrors(2, profile({ satScore: 399 })).satScore, "Enter an SAT score between 400 and 1600.");
});

test("country selection supports adding, removing, and multiple choices", () => {
  const finland = toggleCountry(profile(), "Finland");
  const twoCountries = toggleCountry(finland, "Netherlands");

  assert.deepEqual(twoCountries.preferredCountries, ["Finland", "Netherlands"]);
  assert.deepEqual(toggleCountry(twoCountries, "Finland").preferredCountries, ["Netherlands"]);
});

test("budget may be unknown but a provided budget must be positive", () => {
  assert.equal(validStep(3, profile({ annualBudget: null })), true);
  assert.equal(validStep(3, profile({ annualBudget: 20_000 })), true);
  assert.equal(validStep(3, profile({ annualBudget: 0 })), false);
});

test("intake lives in preferences and remains required for review", () => {
  const missingIntake = profile({ targetIntake: null });

  assert.equal(validStep(3, missingIntake), false);
  assert.equal(validStep(4, missingIntake), false);
  assert.equal(validStep(4, profile()), true);
});

test("a persisted four-step profile restores without changing its values", () => {
  const restored = parseStoredProfile(JSON.stringify({
    version: 1,
    profile: profile({
      preferredCountries: ["Finland", "Netherlands"],
      gpa: 3.5,
      ieltsScore: 6,
      satScore: null,
      annualBudget: 20_000,
      budgetCurrency: "USD",
    }),
    step: 3,
    completed: false,
    updatedAt: "2026-09-17T00:00:00.000Z",
  }));

  assert.equal(restored?.step, 3);
  assert.equal(restored?.profile.satScore, null);
  assert.deepEqual(restored?.profile.preferredCountries, ["Finland", "Netherlands"]);
});
