import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { getProgramById, programs } from "../../data/programs.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { buildInstantDiagnosis } from "./instant-diagnosis.ts";
import { calculateFit } from "./scoring.ts";

const profile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 11",
  targetDegree: null,
  intendedField: null,
  preferredCountries: [],
  preferredLanguage: null,
  activitiesAndAchievements: null,
  targetIntake: null,
  gpa: 3.4,
  ieltsScore: 6.5,
  satScore: null,
  annualBudget: null,
  budgetCurrency: "USD",
};

const byId = (id: string) => demoPrograms.find((program) => program.id === id)!;
const criterion = (candidate: StudentProfile, program: UniversityProgram, key: string) =>
  buildInstantDiagnosis(candidate, program).comparisons.find((item) => item.key === key)!;

test("the selected target resolves to the current production program record", () => {
  const selected = getProgramById("asu-data-science");

  assert.strictEqual(selected, programs.find(({ id }) => id === "asu-data-science"));
  assert.equal(selected?.universityName, "Arizona State University");
  assert.equal(selected?.programName, "Data Science");
  assert.equal(criterion(profile, selected!, "academic").programValue, "Aptitude requirement · qualification-specific criteria");
  assert.equal(criterion(profile, selected!, "academic").status, "Needs verification");
});

test("known satisfied and unmet requirements produce match and evidence-backed gap states", () => {
  const program = byId("northbridge-cs");
  const ready = buildInstantDiagnosis({ ...profile, gpa: 3.5, ieltsScore: 7 }, program);
  const needsWork = buildInstantDiagnosis({ ...profile, gpa: 3, ieltsScore: 6 }, program);

  assert.equal(ready.comparisons.find(({ key }) => key === "academic")?.status, "Match");
  assert.equal(ready.comparisons.find(({ key }) => key === "ielts")?.status, "Match");
  assert.deepEqual(needsWork.biggestGaps.map(({ key }) => key), ["academic", "ielts"]);
  assert.equal(needsWork.biggestGaps.every(({ status }) => status === "Action needed"), true);
});

test("missing student values stay unknown rather than becoming confirmed failures", () => {
  const result = buildInstantDiagnosis(
    { ...profile, gpa: null, ieltsScore: null, satScore: null },
    byId("pacifica-data"),
  );

  assert.equal(result.comparisons.every(({ status }) => status === "Needs verification"), true);
  assert.deepEqual(result.biggestGaps, []);
  assert.equal(result.nextActions.some(({ basis }) => basis === "Missing current value"), true);
  assert.equal(result.nextActions.some(({ basis }) => basis === "Confirmed gap"), false);
});

test("unknown and not-required program requirements keep their distinct states", () => {
  const program = byId("northbridge-cs");
  const unknown = criterion(profile, { ...program, ieltsRequirement: null }, "ielts");
  const notRequired = criterion(profile, program, "sat");

  assert.equal(unknown.status, "Needs verification");
  assert.equal(unknown.programValue, "Unknown");
  assert.equal(notRequired.status, "Not required");
  assert.equal(buildInstantDiagnosis(profile, { ...program, ieltsRequirement: null }).nextActions.some(({ basis, relatedRequirement }) => basis === "Needs verification" && relatedRequirement === "IELTS"), true);
});

test("incompatible academic scales do not fabricate a numeric gap", () => {
  const program: UniversityProgram = {
    ...byId("northbridge-cs"),
    academicRequirement: { label: "UNT", minimumScore: 70, isRequired: true, notes: null },
  };
  const result = buildInstantDiagnosis(profile, program);
  const academic = result.comparisons.find(({ key }) => key === "academic")!;

  assert.equal(academic.status, "Not comparable");
  assert.match(academic.detail, /different scales/);
  assert.equal(result.biggestGaps.some(({ key }) => key === "academic"), false);
  assert.equal(result.nextActions.some(({ basis, relatedRequirement }) => basis === "Confirmed gap" && relatedRequirement === "Academic requirement"), false);
});

test("timeline shows the supplied study stage and verified deadline", () => {
  const result = buildInstantDiagnosis(profile, byId("northbridge-cs"));

  assert.deepEqual(result.timeline.currentStudyStage, {
    value: "Grade 11",
    status: "Provided",
    detail: "Provided for context; study stage does not change deterministic matching.",
  });
  assert.equal(result.timeline.deadline.value, "2027-02-01");
  assert.equal(result.timeline.deadline.status, "Published");
});

test("unknown deadline remains Unknown and needs verification", () => {
  const result = buildInstantDiagnosis(profile, { ...byId("northbridge-cs"), deadline: null });

  assert.equal(result.timeline.deadline.value, "Unknown");
  assert.equal(result.timeline.deadline.status, "Needs verification");
});

test("ambiguous deadline text is preserved without a fabricated cycle or countdown", () => {
  const result = buildInstantDiagnosis(profile, getProgramById("aitu-computer-science")!);

  assert.equal(result.timeline.deadline.value, "August 24 (year not specified)");
  assert.equal(result.timeline.deadline.status, "Published");
  assert.equal("timeRemaining" in result.timeline, false);
  assert.equal("expectedApplicationCycle" in result.timeline, false);
});

test("next actions are deterministic, limited, and traceable to factual inputs", () => {
  const candidate = { ...profile, gpa: 2.8, ieltsScore: 5.5 };
  const program = byId("northbridge-cs");
  const first = buildInstantDiagnosis(candidate, program).nextActions;
  const second = buildInstantDiagnosis(candidate, program).nextActions;

  assert.deepEqual(first, second);
  assert.ok(first.length >= 3 && first.length <= 5);
  assert.equal(first.some(({ basis, relatedRequirement }) => basis === "Confirmed gap" && relatedRequirement === "Academic requirement"), true);
  assert.equal(first.every(({ basis, relatedRequirement }) => Boolean(basis && relatedRequirement)), true);
});

test("gap, strong, and unknown-data profiles retain three to five actions", () => {
  const program = byId("northbridge-cs");
  const scenarios = [
    buildInstantDiagnosis({ ...profile, gpa: 2.8, ieltsScore: 5.5 }, program),
    buildInstantDiagnosis({ ...profile, gpa: 3.5, ieltsScore: 7 }, program),
    buildInstantDiagnosis(profile, { ...program, academicRequirement: null, ieltsRequirement: null, satRequirement: null }),
  ];

  assert.equal(scenarios.every(({ nextActions }) => nextActions.length >= 3 && nextActions.length <= 5), true);
});

test("instant diagnosis remains useful without identity or account data", () => {
  const anonymous = { ...profile, fullName: null, nationality: null, countryOfResidence: null };
  const result = buildInstantDiagnosis(anonymous, byId("northbridge-cs"));

  assert.equal(result.comparisons.length, 3);
  assert.ok(result.nextActions.length >= 3);
});

test("instant diagnosis state does not alter Fit Score logic", () => {
  const program = byId("northbridge-cs");
  const before = calculateFit(profile, program);

  buildInstantDiagnosis(profile, program);

  assert.deepEqual(calculateFit(profile, program), before);
  assert.deepEqual(calculateFit({ ...profile, currentStudyStage: "Grade 12" }, program), before);
});

test("preferred language and activities remain non-scoring context", () => {
  const program = byId("northbridge-cs");
  const baseline = calculateFit(profile, program);

  assert.deepEqual(calculateFit({ ...profile, preferredLanguage: "English" }, program), baseline);
  assert.deepEqual(calculateFit({ ...profile, activitiesAndAchievements: "Robotics project" }, program), baseline);
});
