import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { getProgramById } from "../../data/programs.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { diagnoseProfile, diagnoseTarget } from "./diagnosis.ts";
import { evaluateEligibility } from "./eligibility.ts";
import { generateRoadmap } from "./roadmap.ts";
import { calculateFit } from "./scoring.ts";

const profile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Canada"],
  preferredLanguage: null,
  activitiesAndAchievements: null,
  targetIntake: "Fall 2027",
  gpa: 3.5,
  ieltsScore: 6.5,
  satScore: null,
  annualBudget: 30000,
  budgetCurrency: "USD",
};

const program = demoPrograms.find(({ id }) => id === "northbridge-cs")!;
const coverage = (candidate: StudentProfile, target: UniversityProgram, key: string) =>
  diagnoseTarget(candidate, target)!.requirementCoverage.find((item) => item.key === key)!;

test("profile diagnosis separates strengths, actions, and unknown information", () => {
  const diagnosis = diagnoseProfile({ ...profile, ieltsScore: null });

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

test("target diagnosis uses the selected real production program", () => {
  const selected = getProgramById("asu-data-science")!;
  const diagnosis = diagnoseTarget(profile, selected)!;

  assert.strictEqual(diagnosis.recommendation.program, selected);
  assert.equal(diagnosis.recommendation.program.universityName, "Arizona State University");
  assert.equal(diagnosis.recommendation.program.programName, "Data Science");
  assert.equal(diagnosis.recommendation.program.country, "United States");
});

test("known satisfied requirements remain matches", () => {
  assert.equal(coverage(profile, program, "academic").status, "Match");
  assert.equal(coverage(profile, program, "ielts").status, "Match");
  assert.equal(coverage(profile, program, "sat").status, "Not required");
});

test("known unmet requirements are the only confirmed biggest gaps", () => {
  const diagnosis = diagnoseTarget({ ...profile, gpa: 3, ieltsScore: 6 }, program)!;

  assert.deepEqual(diagnosis.biggestGaps.map(({ key }) => key), ["academic", "ielts"]);
  assert.equal(diagnosis.biggestGaps.every(({ status }) => status === "Action needed"), true);
});

test("missing student values remain verification work, not confirmed gaps", () => {
  const diagnosis = diagnoseTarget({ ...profile, gpa: null, ieltsScore: null }, program)!;

  assert.equal(coverage({ ...profile, gpa: null }, program, "academic").status, "Needs verification");
  assert.equal(diagnosis.biggestGaps.length, 0);
  assert.equal(diagnosis.unknowns.some(({ key }) => key === "academic"), true);
  assert.equal(diagnosis.unknowns.some(({ key }) => key === "ielts"), true);
});

test("unknown program requirements remain unknown and useful", () => {
  const unknownProgram: UniversityProgram = {
    ...program,
    academicRequirement: null,
    ieltsRequirement: null,
    satRequirement: null,
    deadline: null,
  };
  const diagnosis = diagnoseTarget(profile, unknownProgram)!;

  assert.equal(coverage(profile, unknownProgram, "academic").status, "Needs verification");
  assert.equal(diagnosis.biggestGaps.length, 0);
  assert.ok(diagnosis.unknowns.length >= 4);
  assert.ok(diagnosis.priorities.length >= 3 && diagnosis.priorities.length <= 5);
});

test("non-comparable academic scales create verification, never a numeric gap or action", () => {
  const target: UniversityProgram = {
    ...program,
    academicRequirement: { label: "UNT", minimumScore: 70, isRequired: true, notes: null },
  };
  const diagnosis = diagnoseTarget({ ...profile, gpa: 3.4 }, target)!;

  assert.equal(coverage({ ...profile, gpa: 3.4 }, target, "academic").status, "Not comparable");
  assert.equal(diagnosis.biggestGaps.some(({ key }) => key === "academic"), false);
  assert.equal(diagnosis.priorities.some(({ basis, relatedRequirement }) => basis === "Confirmed gap" && relatedRequirement === "Academic requirement"), false);
  assert.equal(diagnosis.roadmapPreview.some(({ id }) => id.endsWith(":improve-academics")), false);
  assert.equal(diagnosis.roadmapPreview.some(({ id }) => id.endsWith(":verify-academic")), true);
});

test("full diagnosis strengths come from the existing profile diagnosis", () => {
  const candidate = { ...profile, activitiesAndAchievements: "Robotics project" };

  assert.deepEqual(
    diagnoseTarget(candidate, program)!.profileDiagnosis.strengths,
    diagnoseProfile(candidate).strengths,
  );
});

test("activities and preferred language remain outside Fit Score", () => {
  const baseline = calculateFit(profile, program);

  assert.deepEqual(calculateFit({ ...profile, activitiesAndAchievements: "Robotics project" }, program), baseline);
  assert.deepEqual(calculateFit({ ...profile, preferredLanguage: "English" }, program), baseline);
});

test("priorities are deterministic roadmap actions with a factual basis", () => {
  const candidate = { ...profile, gpa: 3, ieltsScore: 6 };
  const diagnosis = diagnoseTarget(candidate, program)!;
  const roadmapIds = new Set(generateRoadmap(candidate, program).map(({ id }) => id));

  assert.ok(diagnosis.priorities.length >= 3 && diagnosis.priorities.length <= 5);
  assert.equal(diagnosis.priorities.every(({ id, basis, relatedRequirement }) => roadmapIds.has(id) && Boolean(basis) && Boolean(relatedRequirement)), true);
  assert.deepEqual(diagnosis.priorities, diagnoseTarget(candidate, program)!.priorities);
});

test("a strong profile still receives useful deterministic priorities", () => {
  const diagnosis = diagnoseTarget(profile, program)!;

  assert.equal(diagnosis.biggestGaps.length, 0);
  assert.ok(diagnosis.priorities.length >= 3 && diagnosis.priorities.length <= 5);
  assert.equal(diagnosis.priorities.every(({ basis }) => basis === "Needs verification"), true);
});

test("roadmap preview is the first part of the existing deterministic roadmap", () => {
  assert.deepEqual(
    diagnoseTarget(profile, program)!.roadmapPreview,
    generateRoadmap(profile, program).slice(0, 3),
  );
});

test("no selected target is handled safely", () => {
  assert.equal(diagnoseTarget(profile, null), null);
});

test("building a target diagnosis does not mutate Fit Score or eligibility rules", () => {
  const fit = calculateFit(profile, program);
  const eligibility = evaluateEligibility(profile, program);
  const original = structuredClone(profile);

  diagnoseTarget(profile, program);

  assert.deepEqual(profile, original);
  assert.deepEqual(calculateFit(profile, program), fit);
  assert.equal(evaluateEligibility(profile, program), eligibility);
});
