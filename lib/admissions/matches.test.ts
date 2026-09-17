import assert from "node:assert/strict";
import test from "node:test";
import { programs } from "../../data/programs.ts";
import type { StudentProfile } from "../../types/admissions.ts";
import { getPrimaryMatches } from "./matches.ts";
import { recommendPrograms } from "./recommend.ts";

const profileA: StudentProfile = {
  fullName: "Profile A",
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Hong Kong"],
  targetIntake: "Fall 2027",
  gpa: 3.8,
  ieltsScore: 7,
  satScore: 1400,
  annualBudget: 50000,
  budgetCurrency: "USD",
};

const profileB: StudentProfile = {
  ...profileA,
  fullName: "Profile B",
  preferredCountries: [],
  ieltsScore: 5.5,
  annualBudget: 7000,
};

const profileC: StudentProfile = {
  ...profileA,
  fullName: "Profile C",
  intendedField: "Business",
  preferredCountries: ["Finland"],
  annualBudget: 20000,
  budgetCurrency: "EUR",
};

test("production recommendations use 18 sourced real programs", () => {
  assert.equal(programs.length, 18);
  assert.equal(new Set(programs.map(({ universityName }) => universityName)).size, 5);
  assert.equal(new Set(programs.map(({ country }) => country)).size, 5);
  for (const program of programs) {
    assert.equal(program.verificationDate, "2026-09-17");
    assert.ok(program.sources.some(({ type }) => type === "program"));
    assert.ok(program.sources.every(({ url }) => url.startsWith("https://")));
  }
});

test("technology and business profiles produce different pools", () => {
  const technology = getPrimaryMatches(profileA).map(({ program }) => program.id);
  const business = getPrimaryMatches(profileC).map(({ program }) => program.id);

  assert.ok(technology.length >= 6);
  assert.ok(business.length >= 4);
  assert.equal(technology.some((id) => business.includes(id)), false);
});

test("budget changes ranking among otherwise relevant programs", () => {
  const candidates = programs.filter(({ id }) => ["aitu-computer-science", "hkust-computer-science"].includes(id));
  assert.equal(recommendPrograms(profileA, candidates)[0].program.id, "hkust-computer-science");
  assert.equal(recommendPrograms(profileB, candidates)[0].program.id, "aitu-computer-science");
});

test("IELTS changes eligibility when an official threshold is known", () => {
  const asu = programs.filter(({ id }) => id === "asu-data-science");
  assert.equal(recommendPrograms(profileA, asu)[0].eligibility, "eligible_now");
  assert.equal(recommendPrograms(profileB, asu)[0].eligibility, "with_actions");
});

test("unknown critical requirements remain verification work", () => {
  const hkust = programs.filter(({ id }) => id === "hkust-computer-science");
  const recommendation = recommendPrograms(profileA, hkust)[0];
  assert.equal(recommendation.eligibility, "requires_verification");
  assert.ok(recommendation.dataCoverage < 100);
});

test("country preference and intended field change fit results", () => {
  const finland = getPrimaryMatches(profileC).find(({ program }) => program.id === "lut-digital-business")!;
  const unitedStates = getPrimaryMatches({ ...profileC, preferredCountries: ["United States"] })
    .find(({ program }) => program.id === "lut-digital-business")!;

  assert.ok(finland.fitScore > unitedStates.fitScore);
  assert.notDeepEqual(
    getPrimaryMatches(profileA).map(({ program }) => program.id),
    getPrimaryMatches(profileC).map(({ program }) => program.id),
  );
});
