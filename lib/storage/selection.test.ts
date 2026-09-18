import assert from "node:assert/strict";
import test from "node:test";
import { getProgramById } from "../../data/programs.ts";
import { evaluateEligibility } from "../admissions/eligibility.ts";
import { calculateFit } from "../admissions/scoring.ts";
import { emptyProfile } from "../onboarding.ts";
import { loadSelectedProgram, parseCompareSelection, saveSelectedProgram, toggleCompareSelection } from "./selection.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("comparison selection supports zero and one selected program", () => {
  assert.deepEqual(parseCompareSelection(null), []);
  assert.deepEqual(toggleCompareSelection([], "one"), ["one"]);
  assert.deepEqual(parseCompareSelection('["one"]'), ["one"]);
});

test("comparison selection restores two unique program IDs", () => {
  assert.deepEqual(parseCompareSelection('["one","two","one","three"]'), ["one", "two"]);
});

test("malformed comparison state restores safely", () => {
  assert.deepEqual(parseCompareSelection("not json"), []);
  assert.deepEqual(parseCompareSelection('{"program":"one"}'), []);
});

test("comparison selection cannot exceed two programs", () => {
  assert.deepEqual(toggleCompareSelection(["one", "two"], "three"), ["one", "two"]);
  assert.deepEqual(toggleCompareSelection(["one", "two"], "one"), ["two"]);
});

test("a real target persists without mutating profile inputs or deterministic matching", () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
  try {
    const target = getProgramById("lut-software-systems-engineering")!;
    const profile = {
      ...emptyProfile,
      currentStudyStage: "Grade 11",
      targetDegree: "Bachelor",
      intendedField: "Computer Science",
      preferredCountries: ["Netherlands"],
      preferredLanguage: "English",
      activitiesAndAchievements: "Robotics project",
      targetIntake: "Fall 2027",
      gpa: 3.5,
      ieltsScore: 6.5,
      annualBudget: 20_000,
    };
    const originalProfile = structuredClone(profile);
    const fit = calculateFit(profile, target);
    const eligibility = evaluateEligibility(profile, target);

    assert.equal(saveSelectedProgram(target.id), true);
    assert.strictEqual(getProgramById(loadSelectedProgram()), target);
    assert.deepEqual(profile, originalProfile);
    assert.deepEqual(calculateFit(profile, target), fit);
    assert.equal(evaluateEligibility(profile, target), eligibility);
    assert.deepEqual(profile.preferredCountries, ["Netherlands"]);
    assert.equal(profile.preferredLanguage, "English");
    assert.equal(profile.activitiesAndAchievements, "Robotics project");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("missing or stale target state remains safely unselected", () => {
  assert.equal(getProgramById(null), null);
  assert.equal(getProgramById("not-a-current-program"), null);
});
