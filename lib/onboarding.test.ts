import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getProgramById } from "../data/programs.ts";
import type { StudentProfile } from "../types/admissions.ts";
import { evaluateEligibility } from "./admissions/eligibility.ts";
import { calculateFit } from "./admissions/scoring.ts";
import {
  applyTargetProfileDefaults,
  emptyProfile,
  inferFieldFromTarget,
  numberOrNull,
  stepErrors,
  toggleCountry,
  transferInstantProfile,
  validStep,
} from "./onboarding.ts";
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
  assert.equal(restored?.flowStage, "onboarding");
});

test("activities and achievements are optional and legacy profiles restore them as empty", () => {
  assert.equal(emptyProfile.activitiesAndAchievements, null);
  assert.equal(validStep(2, profile({ activitiesAndAchievements: null })), true);
  assert.equal(validStep(2, profile({ activitiesAndAchievements: "Robotics project" })), true);

  const legacy = { ...profile() };
  delete legacy.activitiesAndAchievements;
  const restored = parseStoredProfile(JSON.stringify({ version: 1, profile: legacy, step: 2, completed: false }));
  assert.equal(restored?.profile.activitiesAndAchievements, null);
});

test("onboarding review shows the selected language or a neutral no-preference value", () => {
  const source = readFileSync(new URL("../components/journey/onboarding-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('Preferred language: {display(profile.preferredLanguage, "No language preference")}'));
});

test("onboarding collects activities as non-scoring context and shows them in review", () => {
  const source = readFileSync(new URL("../components/journey/onboarding-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Olympiads, projects, volunteering, or other achievements"));
  assert.ok(source.includes("It does not affect deterministic matching."));
  assert.ok(source.includes('profile.activitiesAndAchievements?.trim() || "Not provided"'));
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

test("instant current state transfers every supported value into the full profile", () => {
  const transferred = transferInstantProfile(profile({
    currentStudyStage: null,
    gpa: null,
    ieltsScore: null,
    satScore: null,
  }), {
    ...emptyProfile,
    currentStudyStage: "Grade 12",
    gpa: 3.7,
    ieltsScore: 7,
    satScore: 1380,
  });

  assert.equal(transferred.currentStudyStage, "Grade 12");
  assert.equal(transferred.gpa, 3.7);
  assert.equal(transferred.ieltsScore, 7);
  assert.equal(transferred.satScore, 1380);
});

test("blank instant values preserve all existing profile and preference data", () => {
  const existing = profile({
    preferredCountries: ["Finland"],
    preferredLanguage: "English",
    activitiesAndAchievements: "Robotics project",
    targetIntake: "Fall 2028",
    gpa: 3.4,
    ieltsScore: 6.5,
    satScore: 1290,
    annualBudget: 22_000,
    budgetCurrency: "EUR",
  });

  assert.deepEqual(transferInstantProfile(existing, emptyProfile), existing);
});

test("instant transfer changes no inferred goal or preference fields", () => {
  const existing = profile({
    targetDegree: null,
    intendedField: null,
    preferredCountries: ["Netherlands"],
    preferredLanguage: "English",
    activitiesAndAchievements: "Volunteering",
  });
  const transferred = transferInstantProfile(existing, {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 3.6,
  });

  assert.equal(transferred.targetDegree, null);
  assert.equal(transferred.intendedField, null);
  assert.deepEqual(transferred.preferredCountries, ["Netherlands"]);
  assert.equal(transferred.preferredLanguage, "English");
  assert.equal(transferred.activitiesAndAchievements, "Volunteering");
});

test("refresh restores target, current-state, diagnosis, and onboarding stages", () => {
  for (const flowStage of ["target", "current", "diagnosis", "onboarding"] as const) {
    const restored = parseStoredProfile(JSON.stringify({
      version: 1,
      profile: profile({ gpa: 3.6 }),
      step: 1,
      completed: false,
      flowStage,
      updatedAt: "2026-09-18T00:00:00.000Z",
    }));
    assert.equal(restored?.flowStage, flowStage);
    assert.equal(restored?.profile.gpa, 3.6);
  }
});

test("legacy, partial, and completed profiles resume the full onboarding flow", () => {
  const legacy = parseStoredProfile(JSON.stringify({
    version: 1,
    profile: profile(),
    step: 2,
    completed: false,
  }));
  const partial = parseStoredProfile(JSON.stringify({
    version: 1,
    profile: profile({ intendedField: "Business" }),
    step: 3,
    completed: false,
    flowStage: "onboarding",
  }));
  const completed = parseStoredProfile(JSON.stringify({
    version: 1,
    profile: profile(),
    step: 4,
    completed: true,
  }));

  assert.deepEqual([legacy?.flowStage, legacy?.step], ["onboarding", 2]);
  assert.deepEqual([partial?.flowStage, partial?.step], ["onboarding", 3]);
  assert.deepEqual([completed?.flowStage, completed?.completed], ["onboarding", true]);
});

test("transferred values use the existing Fit Score and eligibility rules", () => {
  const program = getProgramById("lut-software-systems-engineering")!;
  const beforeTransfer = profile({
    currentStudyStage: null,
    gpa: null,
    ieltsScore: null,
    satScore: null,
    preferredLanguage: "English",
    activitiesAndAchievements: "Robotics project",
  });
  const instant = {
    ...emptyProfile,
    currentStudyStage: "Grade 12",
    gpa: 3.6,
    ieltsScore: 6.5,
    satScore: 1320,
  };
  const transferred = transferInstantProfile(beforeTransfer, instant);
  const directlyEntered = {
    ...beforeTransfer,
    currentStudyStage: "Grade 12",
    gpa: 3.6,
    ieltsScore: 6.5,
    satScore: 1320,
  };

  assert.deepEqual(calculateFit(transferred, program), calculateFit(directlyEntered, program));
  assert.equal(evaluateEligibility(transferred, program), evaluateEligibility(directlyEntered, program));
});

test("inferFieldFromTarget maps all catalog fields deterministically into Computer Science or Business", () => {
  assert.equal(inferFieldFromTarget("Computer Science"), "Computer Science");
  assert.equal(inferFieldFromTarget("Software Engineering"), "Computer Science");
  assert.equal(inferFieldFromTarget("Data Science"), "Computer Science");
  assert.equal(inferFieldFromTarget("Information Technology"), "Computer Science");

  assert.equal(inferFieldFromTarget("Business"), "Business");
  assert.equal(inferFieldFromTarget("Business Administration"), "Business");
  assert.equal(inferFieldFromTarget("International Business"), "Business");
  assert.equal(inferFieldFromTarget("Finance"), "Business");
  assert.equal(inferFieldFromTarget("Business Analytics"), "Business");

  assert.equal(inferFieldFromTarget(""), null);
  assert.equal(inferFieldFromTarget(null), null);
  assert.equal(inferFieldFromTarget(undefined), null);
  assert.equal(inferFieldFromTarget("Unknown Subject"), null);
});

test("applyTargetProfileDefaults infers targetDegree and intendedField while preserving existing values", () => {
  const csProgram = getProgramById("aitu-computer-science")!;
  const busProgram = getProgramById("lut-digital-business")!;

  const defaultedCs = applyTargetProfileDefaults(emptyProfile, csProgram);
  assert.equal(defaultedCs.targetDegree, "Bachelor");
  assert.equal(defaultedCs.intendedField, "Computer Science");

  const defaultedBus = applyTargetProfileDefaults(emptyProfile, busProgram);
  assert.equal(defaultedBus.targetDegree, "Bachelor");
  assert.equal(defaultedBus.intendedField, "Business");

  // Preserves existing explicit targetDegree / intendedField
  const explicit = profile({
    targetDegree: "Bachelor",
    intendedField: "Business",
  });
  const preserved = applyTargetProfileDefaults(explicit, csProgram);
  assert.equal(preserved.targetDegree, "Bachelor");
  assert.equal(preserved.intendedField, "Business");

  // Null target returns profile unchanged
  assert.deepEqual(applyTargetProfileDefaults(explicit, null), explicit);
});

test("first-time onboarding transitions directly to step 3 without asking academic scores or direction again", () => {
  const program = getProgramById("lut-software-systems-engineering")!;
  const instantCurrent: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 3.8,
    ieltsScore: 7.0,
    satScore: 1350,
  };

  // 1. Transfer instant profile scores & stage
  const transferred = transferInstantProfile(emptyProfile, instantCurrent);
  // 2. Apply target defaults from chosen program
  const full = applyTargetProfileDefaults(transferred, program);

  // Verifies that direction (Step 1) is already satisfied
  assert.equal(full.currentStudyStage, "Grade 11");
  assert.equal(full.targetDegree, "Bachelor");
  assert.equal(full.intendedField, "Computer Science");
  assert.equal(validStep(1, full), true);

  // Verifies that academics (Step 2) are already satisfied
  assert.equal(full.gpa, 3.8);
  assert.equal(full.ieltsScore, 7.0);
  assert.equal(full.satScore, 1350);
  assert.equal(validStep(2, full), true);

  // Step 3 requires only target intake before moving to review
  assert.equal(validStep(3, full), false);
  const readyForReview = { ...full, targetIntake: "Fall 2027" };
  assert.equal(validStep(3, readyForReview), true);
  assert.equal(validStep(4, readyForReview), true);
});

test("blank academic values remain valid intentional unknowns without blocking transition", () => {
  const program = getProgramById("aitu-computer-science")!;
  const instantCurrent: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 10",
    gpa: null,
    ieltsScore: null,
    satScore: null,
  };

  const transferred = transferInstantProfile(emptyProfile, instantCurrent);
  const full = applyTargetProfileDefaults(transferred, program);

  assert.equal(full.currentStudyStage, "Grade 10");
  assert.equal(full.gpa, null);
  assert.equal(full.ieltsScore, null);
  assert.equal(full.satScore, null);

  // Blanks remain valid and unknown
  assert.equal(validStep(2, full), true);
});

test("onboarding-form displays academic baseline confirmation and unified 5-step progress", () => {
  const source = readFileSync(new URL("../components/journey/onboarding-form.tsx", import.meta.url), "utf8");

  // Step 3 shows baseline & target confirmation card
  assert.ok(source.includes("Academic baseline & target recorded"));
  assert.ok(source.includes("Edit academics"));

  // Unified 5-step labels for target journey
  assert.ok(source.includes('"Target", "Current state", "Instant diagnosis", "Missing details", "Review"'));

  // Dynamic header step count without hardcoded "05"
  assert.ok(source.includes('Step {String(flowStep).padStart(2, "0")} of {String(flowLabels.length).padStart(2, "0")}'));

  // Section edit returns to review
  assert.ok(source.includes("editingFromReview"));
  assert.ok(source.includes('"Save and return to review"'));
  assert.ok(source.includes('"Back to review"'));
});
