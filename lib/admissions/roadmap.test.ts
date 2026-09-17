import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import {
  generateRoadmap,
  getNextAction,
  getRoadmapProgress,
} from "./roadmap.ts";

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
  ieltsScore: 6,
  satScore: null,
  annualBudget: 30000,
  budgetCurrency: "USD",
};

const byId = (id: string) => demoPrograms.find((program) => program.id === id)!;

test("an IELTS gap creates preparation and exam tasks", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.deepEqual(items.filter(({ id }) => id.includes("ielts")).map(({ id }) => id), [
    "northbridge-cs:prepare-ielts",
    "northbridge-cs:take-ielts",
  ]);
});

test("meeting the IELTS requirement removes IELTS tasks", () => {
  const items = generateRoadmap({ ...profile, ieltsScore: 7 }, byId("northbridge-cs"));
  assert.equal(items.some(({ id }) => id.includes("ielts")), false);
});

test("a required missing SAT creates SAT preparation and exam tasks", () => {
  const items = generateRoadmap({ ...profile, gpa: 3.8, ieltsScore: 7 }, byId("pacifica-data"));
  assert.equal(items.some(({ id }) => id.endsWith(":prepare-sat")), true);
  assert.equal(items.some(({ id }) => id.endsWith(":take-sat")), true);
});

test("an unknown requirement creates verification without inventing a score", () => {
  const program: UniversityProgram = { ...byId("northbridge-cs"), ieltsRequirement: null };
  const item = generateRoadmap(profile, program).find(({ id }) => id.endsWith(":verify-language"));
  assert.ok(item);
  assert.equal(/\d/.test(item.description), false);
});

test("an unknown deadline stays unknown", () => {
  const program: UniversityProgram = { ...byId("northbridge-cs"), deadline: null };
  const items = generateRoadmap(profile, program);
  assert.equal(items.some(({ id }) => id.endsWith(":verify-deadline")), true);
  assert.equal(items.every(({ dueDate }) => dueDate === null), true);
});

test("the same inputs produce the same ordered stable task IDs", () => {
  const first = generateRoadmap(profile, byId("northbridge-cs")).map(({ id }) => id);
  const second = generateRoadmap(profile, byId("northbridge-cs")).map(({ id }) => id);
  assert.deepEqual(first, second);
});

test("stale completion IDs do not affect progress", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.deepEqual(getRoadmapProgress(items, [items[0].id, "removed-task"]), {
    completed: 1,
    total: items.length,
    percentage: Math.round(100 / items.length),
  });
});

test("next action advances to the first valid incomplete task", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.equal(getNextAction(items, [])?.id, items[0].id);
  assert.equal(getNextAction(items, [items[0].id])?.id, items[1].id);
});

test("changing the profile regenerates and removes a resolved IELTS gap", () => {
  const before = generateRoadmap(profile, byId("northbridge-cs"));
  const after = generateRoadmap({ ...profile, ieltsScore: 7 }, byId("northbridge-cs"));
  assert.equal(before.some(({ id }) => id.includes("ielts")), true);
  assert.equal(after.some(({ id }) => id.includes("ielts")), false);
  assert.equal(after.some(({ id }) => id.endsWith(":prepare-documents")), true);
});
