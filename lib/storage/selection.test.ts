import assert from "node:assert/strict";
import test from "node:test";
import { getProgramById } from "../../data/programs.ts";
import { evaluateEligibility } from "../admissions/eligibility.ts";
import { calculateFit } from "../admissions/scoring.ts";
import { emptyProfile } from "../onboarding.ts";
import {
  clearCompareSelection,
  loadCompareSelection,
  loadSelectedProgram,
  MAX_COMPARE_SELECTION,
  parseCompareSelection,
  removeCompareSelection,
  saveCompareSelection,
  saveSelectedProgram,
  toggleCompareSelection,
} from "./selection.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("comparison selection supports zero and one selected program", () => {
  assert.equal(MAX_COMPARE_SELECTION, 2);
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
  assert.deepEqual(parseCompareSelection('["", "  ", null, 123, "valid"]'), ["valid"]);
});

test("comparison selection cannot exceed two programs", () => {
  assert.deepEqual(toggleCompareSelection(["one", "two"], "three"), ["one", "two"]);
  assert.deepEqual(toggleCompareSelection(["one", "two"], "one"), ["two"]);
});

test("attempted selection of 3rd program is blocked while preserving existing selection", () => {
  const current = ["lut-software-systems-engineering", "cmu-qatar-computer-science"];
  const attempted = toggleCompareSelection(current, "third-program");
  assert.deepEqual(attempted, current);
  assert.equal(attempted.length, 2);
  assert.equal(attempted.includes("third-program"), false);
});

test("removing a selected program unblocks selection and allows choosing a new program", () => {
  const current = ["lut-software-systems-engineering", "cmu-qatar-computer-science"];
  const afterRemoval = toggleCompareSelection(current, "lut-software-systems-engineering");
  assert.deepEqual(afterRemoval, ["cmu-qatar-computer-science"]);

  // Slot is now open: selecting a third program succeeds
  const afterNewSelection = toggleCompareSelection(afterRemoval, "third-program");
  assert.deepEqual(afterNewSelection, ["cmu-qatar-computer-science", "third-program"]);

  // Using explicit removeCompareSelection helper also unblocks
  const afterHelperRemoval = removeCompareSelection(afterNewSelection, "cmu-qatar-computer-science");
  assert.deepEqual(afterHelperRemoval, ["third-program"]);
  const afterReplacement = toggleCompareSelection(afterHelperRemoval, "fourth-program");
  assert.deepEqual(afterReplacement, ["third-program", "fourth-program"]);
});

test("toggle behavior handles add, remove, and re-add cleanly", () => {
  let list: string[] = [];
  list = toggleCompareSelection(list, "progA");
  assert.deepEqual(list, ["progA"]);

  list = toggleCompareSelection(list, "progA");
  assert.deepEqual(list, []);

  list = toggleCompareSelection(list, "progA");
  assert.deepEqual(list, ["progA"]);

  list = toggleCompareSelection(list, "progB");
  assert.deepEqual(list, ["progA", "progB"]);

  list = toggleCompareSelection(list, "progB");
  assert.deepEqual(list, ["progA"]);

  list = toggleCompareSelection(list, "progC");
  assert.deepEqual(list, ["progA", "progC"]);
});

test("persistence saves, loads, clears, and restores across simulated session", () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
  try {
    assert.equal(saveCompareSelection(["prog1", "prog2"]), true);
    assert.deepEqual(loadCompareSelection(), ["prog1", "prog2"]);

    // Clears cleanly
    assert.equal(clearCompareSelection(), true);
    assert.deepEqual(loadCompareSelection(), []);

    // Re-saving restores cleanly
    assert.equal(saveCompareSelection(["prog3"]), true);
    assert.deepEqual(loadCompareSelection(), ["prog3"]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("stale and non-existent IDs are filtered out cleanly without crashing", () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
  try {
    storage.setItem("admission-journey:v1:compare", JSON.stringify(["valid-1", "stale-deleted-id"]));
    const validCatalogIds = ["valid-1", "valid-2", "valid-3"];

    const loaded = loadCompareSelection(validCatalogIds);
    assert.deepEqual(loaded, ["valid-1"]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("duplicate IDs are normalized and prevented at parse, save, and toggle layers", () => {
  assert.deepEqual(parseCompareSelection('["dup", "dup", "other"]'), ["dup", "other"]);
  assert.deepEqual(toggleCompareSelection(["dup", "dup"], "other"), ["dup", "other"]);

  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
  try {
    saveCompareSelection(["dup", "dup", "dup"]);
    assert.deepEqual(loadCompareSelection(), ["dup"]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("clean user lifecycle: select 2 -> deselect 1 -> select different -> valid pair", () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
  try {
    const validIds = ["lut-software-systems-engineering", "cmu-qatar-computer-science", "baltic-software"];

    // 1. Initial clean state: 0 selected
    let currentSelection = loadCompareSelection(validIds);
    assert.deepEqual(currentSelection, []);

    // 2. Select first program
    currentSelection = toggleCompareSelection(currentSelection, "lut-software-systems-engineering");
    saveCompareSelection(currentSelection);
    assert.deepEqual(currentSelection, ["lut-software-systems-engineering"]);

    // 3. Select second program
    currentSelection = toggleCompareSelection(currentSelection, "cmu-qatar-computer-science");
    saveCompareSelection(currentSelection);
    assert.deepEqual(currentSelection, ["lut-software-systems-engineering", "cmu-qatar-computer-science"]);

    // 4. Attempt to select third program -> blocked
    const blocked = toggleCompareSelection(currentSelection, "baltic-software");
    assert.deepEqual(blocked, currentSelection);

    // 5. Deselect first program -> slot opens
    currentSelection = toggleCompareSelection(currentSelection, "lut-software-systems-engineering");
    saveCompareSelection(currentSelection);
    assert.deepEqual(currentSelection, ["cmu-qatar-computer-science"]);

    // 6. Select third program -> succeeds
    currentSelection = toggleCompareSelection(currentSelection, "baltic-software");
    saveCompareSelection(currentSelection);
    assert.deepEqual(currentSelection, ["cmu-qatar-computer-science", "baltic-software"]);

    // 7. Verify restored state in a refreshed session
    const restored = loadCompareSelection(validIds);
    assert.deepEqual(restored, ["cmu-qatar-computer-science", "baltic-software"]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
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
