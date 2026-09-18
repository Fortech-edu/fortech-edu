import assert from "node:assert/strict";
import test from "node:test";
import type { ChangeImpact } from "../admissions/change-impact.ts";
import type { StudentProfile } from "../../types/admissions.ts";
import {
  RECENT_IMPACT_STORAGE_KEY,
  RECENT_IMPACT_TTL_MS,
  clearEditBaseline,
  clearRecentChangeImpact,
  loadEditBaseline,
  loadRecentChangeImpact,
  parseRecentChangeImpact,
  saveEditBaseline,
  saveRecentChangeImpact,
} from "./change-impact.ts";

const profile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 11",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Finland", "Netherlands"],
  preferredLanguage: null,
  targetIntake: "Fall 2027",
  gpa: 3.5,
  ieltsScore: 6,
  satScore: null,
  annualBudget: 20000,
  budgetCurrency: "USD",
};

const impact: ChangeImpact = {
  changedInputs: [{ input: "ieltsScore", previousValue: 6, nextValue: 6.5 }],
  programChanges: [],
  summary: { entered: 0, removed: 0, movedUp: 0, movedDown: 0, eligibilityChanged: 0 },
};

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("first-time sessions have no edit baseline or recent impact", () => {
  const storage = new MemoryStorage();
  assert.equal(loadEditBaseline(storage), null);
  assert.equal(loadRecentChangeImpact(storage), null);
});

test("first-time reset clears stale edit context", () => {
  const storage = new MemoryStorage();
  saveEditBaseline(profile, storage);
  saveRecentChangeImpact(impact, storage);
  clearEditBaseline(storage);
  clearRecentChangeImpact(storage);
  assert.equal(loadEditBaseline(storage), null);
  assert.equal(loadRecentChangeImpact(storage), null);
});

test("edit baseline and recent impact survive navigation in the same session", () => {
  const storage = new MemoryStorage();
  assert.equal(saveEditBaseline(profile, storage), true);
  assert.deepEqual(loadEditBaseline(storage), profile);
  assert.equal(saveRecentChangeImpact(impact, storage, 1000), true);
  assert.deepEqual(loadRecentChangeImpact(storage, 1001), impact);
  assert.deepEqual(loadRecentChangeImpact(storage, 1002), impact);
});

test("empty impact remains valid but contains no recommendation changes", () => {
  const storage = new MemoryStorage();
  saveRecentChangeImpact(impact, storage, 1000);
  assert.deepEqual(loadRecentChangeImpact(storage, 1001)?.programChanges, []);
});

test("stale recent impact expires and is removed", () => {
  const storage = new MemoryStorage();
  saveRecentChangeImpact(impact, storage, 1000);
  assert.equal(loadRecentChangeImpact(storage, 1000 + RECENT_IMPACT_TTL_MS + 1), null);
  assert.equal(storage.getItem(RECENT_IMPACT_STORAGE_KEY), null);
});

test("malformed recent impact is ignored", () => {
  assert.equal(parseRecentChangeImpact("not json"), null);
  assert.equal(parseRecentChangeImpact('{"version":1,"savedAt":1,"impact":{}}', 1), null);
});

test("sessionStorage failures never break profile or matches flows", () => {
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.equal(saveEditBaseline(profile, broken), false);
  assert.equal(loadEditBaseline(broken), null);
  assert.equal(saveRecentChangeImpact(impact, broken), false);
  assert.equal(loadRecentChangeImpact(broken), null);
});
