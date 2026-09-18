import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getProgramById } from "../../data/programs.ts";
import { requirementCriterion, resolveThresholdHint } from "./presentation.ts";
import { isScoreValid, stepErrors, emptyProfile } from "../onboarding.ts";
import type { Requirement, StudentProfile } from "../../types/admissions.ts";

test("valid IELTS below threshold produces Action needed gap hint", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  assert.ok(lut.ieltsRequirement);
  assert.equal(lut.ieltsRequirement.minimumScore, 6.5);

  const criterion = requirementCriterion("ielts", "IELTS", 6.0, lut.ieltsRequirement);
  assert.equal(criterion.status, "Action needed");
  assert.match(criterion.detail, /below the published minimum/);

  const hint = resolveThresholdHint("ielts", "IELTS", 6.0, lut.ieltsRequirement);
  assert.ok(hint);
  assert.equal(hint.status, "Action needed");
  assert.equal(hint.isGap, true);
  assert.match(hint.detail, /below the published minimum/);
});

test("valid IELTS meeting threshold produces Match hint without gap state", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  assert.ok(lut.ieltsRequirement);

  const criterion = requirementCriterion("ielts", "IELTS", 6.5, lut.ieltsRequirement);
  assert.equal(criterion.status, "Match");
  assert.match(criterion.detail, /meets this published minimum/);

  const hint = resolveThresholdHint("ielts", "IELTS", 6.5, lut.ieltsRequirement);
  assert.ok(hint);
  assert.equal(hint.status, "Match");
  assert.equal(hint.isGap, false);
  assert.match(hint.detail, /meets this published minimum/);

  // Higher score also produces Match
  const higherHint = resolveThresholdHint("ielts", "IELTS", 8.0, lut.ieltsRequirement);
  assert.ok(higherHint);
  assert.equal(higherHint.status, "Match");
  assert.equal(higherHint.isGap, false);
});

test("blank IELTS produces no threshold hint and preserves unknown state", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;

  const criterion = requirementCriterion("ielts", "IELTS", null, lut.ieltsRequirement);
  assert.equal(criterion.status, "Needs verification");
  assert.match(criterion.detail, /not provided/);

  const hint = resolveThresholdHint("ielts", "IELTS", null, lut.ieltsRequirement);
  assert.equal(hint, null);
});

test("unknown requirement produces no threshold hint", () => {
  // Requirement is null
  const hintNull = resolveThresholdHint("ielts", "IELTS", 6.5, null);
  assert.equal(hintNull, null);

  // Requirement with isRequired !== true
  const unverifiedReq: Requirement = {
    label: "IELTS",
    minimumScore: null,
    isRequired: null,
    notes: null,
  };
  const hintUnverified = resolveThresholdHint("ielts", "IELTS", 6.5, unverifiedReq);
  assert.equal(hintUnverified, null);

  // Requirement is required but minimumScore is null
  const unknownThresholdReq: Requirement = {
    label: "IELTS",
    minimumScore: null,
    isRequired: true,
    notes: null,
  };
  const hintUnknownThreshold = resolveThresholdHint("ielts", "IELTS", 6.5, unknownThresholdReq);
  assert.equal(hintUnknownThreshold, null);
});

test("not-required SAT produces no misleading requirement threshold hint", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  assert.ok(lut.satRequirement);
  assert.equal(lut.satRequirement.isRequired, false);

  const criterion = requirementCriterion("sat", "SAT", 1200, lut.satRequirement);
  assert.equal(criterion.status, "Not required");

  const hint = resolveThresholdHint("sat", "SAT", 1200, lut.satRequirement);
  assert.equal(hint, null);
});

test("invalid input values suppress threshold hints and show only validation errors", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  const gpaReq: Requirement = { label: "GPA", minimumScore: 3.0, isRequired: true, notes: null };
  const satReq: Requirement = { label: "SAT", minimumScore: 1200, isRequired: true, notes: null };

  // Score validity rules
  assert.equal(isScoreValid("ielts", 15), false);
  assert.equal(isScoreValid("ielts", -1), false);
  assert.equal(isScoreValid("ielts", 6.5), true);
  assert.equal(isScoreValid("academic", 5), false);
  assert.equal(isScoreValid("academic", -0.1), false);
  assert.equal(isScoreValid("academic", 3.8), true);
  assert.equal(isScoreValid("sat", 2000), false);
  assert.equal(isScoreValid("sat", 350), false);
  assert.equal(isScoreValid("sat", 1300), true);

  // IELTS 15 must never produce Match hint
  const ielts15Hint = resolveThresholdHint("ielts", "IELTS", 15, lut.ieltsRequirement);
  assert.equal(ielts15Hint, null);

  // GPA 5 must never produce Match hint
  const gpa5Hint = resolveThresholdHint("academic", "Academic requirement", 5, gpaReq);
  assert.equal(gpa5Hint, null);

  // SAT 2000 must never produce Match hint
  const sat2000Hint = resolveThresholdHint("sat", "SAT", 2000, satReq);
  assert.equal(sat2000Hint, null);

  // Negative / too-low scores must also not produce hints
  assert.equal(resolveThresholdHint("sat", "SAT", 200, satReq), null);
  assert.equal(resolveThresholdHint("academic", "Academic requirement", -1, gpaReq), null);

  // When hasError flag is set, hint is suppressed even for otherwise valid scores
  assert.equal(resolveThresholdHint("ielts", "IELTS", 6.5, lut.ieltsRequirement, true), null);

  // StepErrors validates these ranges explicitly
  const invalidProfile: StudentProfile = {
    ...emptyProfile,
    gpa: 5,
    ieltsScore: 15,
    satScore: 2000,
  };
  const errors = stepErrors(2, invalidProfile);
  assert.equal(errors.gpa, "Enter a GPA between 0 and 4.");
  assert.equal(errors.ieltsScore, "Enter an IELTS score between 0 and 9.");
  assert.equal(errors.satScore, "Enter an SAT score between 400 and 1600.");
});

test("different academic scale preserves Not comparable and produces no numeric hint", () => {
  // A program using UNT scale (out of 140) rather than 0-4 GPA
  const untRequirement: Requirement = {
    label: "UNT",
    minimumScore: 70,
    isRequired: true,
    notes: "Minimum 70 for paid admission.",
  };

  const criterion = requirementCriterion("academic", "Academic requirement", 3.8, untRequirement);
  assert.equal(criterion.status, "Not comparable");
  assert.match(criterion.detail, /different scales/);

  const hint = resolveThresholdHint("academic", "Academic requirement", 3.8, untRequirement);
  assert.equal(hint, null);
});

test("ThresholdHint component wireup guards against errors and invalid values in onboarding and instant-diagnosis", () => {
  const instantDiagSource = readFileSync(
    new URL("../../components/journey/instant-diagnosis.tsx", import.meta.url),
    "utf8",
  );
  const onboardingSource = readFileSync(
    new URL("../../components/journey/onboarding-form.tsx", import.meta.url),
    "utf8",
  );

  // ThresholdHint calls resolveThresholdHint with error/hasError
  assert.ok(instantDiagSource.includes("resolveThresholdHint"));
  assert.ok(instantDiagSource.includes("Boolean(hasError || error)"));
  assert.ok(instantDiagSource.includes('role={hint.isGap ? "alert" : undefined}'));

  // InstantCurrentState passes error prop to ThresholdHint
  assert.ok(instantDiagSource.includes("error={errors.gpa}"));
  assert.ok(instantDiagSource.includes("error={errors.ieltsScore}"));
  assert.ok(instantDiagSource.includes("error={errors.satScore}"));

  // OnboardingForm passes error prop to ThresholdHint in step 2
  assert.ok(onboardingSource.includes("error={errors.gpa}"));
  assert.ok(onboardingSource.includes("error={errors.ieltsScore}"));
  assert.ok(onboardingSource.includes("error={errors.satScore}"));
});
