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
  preferredLanguage: null,
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
  // Most records share one baseline verification pass; a small set of
  // demo-critical programs was re-verified later against official sources
  // (see docs/DEMO_PROGRAM_DATA_AUDIT.md) and carries a newer date.
  const knownVerificationDates = new Set(["2026-09-17", "2026-09-18"]);
  for (const program of programs) {
    assert.ok(knownVerificationDates.has(program.verificationDate ?? ""), `unexpected verificationDate for ${program.id}`);
    assert.ok(program.sources.some(({ type }) => type === "program"));
    assert.ok(program.sources.every(({ url }) => url.startsWith("https://")));
  }
});

test("demo-critical program facts preserve the official published currency and never invent a numeric threshold for unverified data", () => {
  const byId = (id: string) => programs.find((program) => program.id === id)!;

  // HKUST publishes its tuition in HKD; the product's own policy is to never
  // perform its own currency conversion, so all undergraduate programs must match
  // the official HKD currency rather than a USD approximation.
  const hkustPrograms = programs.filter(({ universityName }) => universityName === "Hong Kong University of Science and Technology");
  assert.equal(hkustPrograms.length, 4);
  for (const program of hkustPrograms) {
    assert.equal(program.tuitionCurrency, "HKD");
    assert.equal(program.tuition, 260000);
    assert.equal(program.tuitionPeriod, "year");
  }

  const hkustCs = byId("hkust-computer-science");
  assert.equal(hkustCs.ieltsRequirement?.isRequired, true);
  assert.equal(hkustCs.applicationDocuments?.motivationLetter, true);
  assert.equal(hkustCs.applicationDocuments?.recommendationLetters, true);

  // Application documents that could not be confirmed from an official page
  // stay unknown rather than false — absence from a list is not a "not
  // required" statement.
  const aitu = byId("aitu-computer-science");
  assert.equal(aitu.applicationDocuments, null);
  const utwente = byId("utwente-technical-computer-science");
  assert.equal(utwente.applicationDocuments, null);
  const lut = byId("lut-software-systems-engineering");
  assert.equal(lut.applicationDocuments, null);

  // ASU Data Science models multiple aptitude routes (GPA / SAT / ACT / class rank)
  // so minimumScore stays null rather than producing a fake universal GPA threshold.
  // Deadline stays null rather than storing an obsolete past date.
  const asu = byId("asu-data-science");
  assert.equal(asu.academicRequirement?.minimumScore, null);
  assert.equal(asu.academicRequirement?.label, "Aptitude requirement");
  assert.equal(asu.academicRequirement?.isRequired, true);
  assert.notEqual(asu.deadline, "2026-01-15");
  assert.equal(asu.deadline, null);

  // A confirmed "not required" statement is recorded as false, not left blank.
  assert.equal(asu.applicationDocuments?.motivationLetter, false);
  assert.equal(asu.applicationDocuments?.recommendationLetters, null);
});

test("ASU Data Science aptitude routes prevent false GPA rejection for sub-3.0 profiles", () => {
  const asu = programs.filter(({ id }) => id === "asu-data-science");
  const sub3Profile = { ...profileA, gpa: 2.7, intendedField: "Data Science" };
  const recommendations = recommendPrograms(sub3Profile, asu);
  assert.equal(recommendations[0].eligibility, "requires_verification");
  assert.equal(recommendations[0].gaps.includes("GPA needs improvement"), false);
  assert.ok(recommendations[0].gaps.some((gap) => gap.includes("academic requirement needs verification")));
});

test("technology and business profiles produce different pools", () => {
  const technology = getPrimaryMatches(profileA).map(({ program }) => program.id);
  const business = getPrimaryMatches(profileC).map(({ program }) => program.id);

  assert.ok(technology.length >= 6);
  assert.ok(business.length >= 4);
  assert.equal(technology.some((id) => business.includes(id)), false);
});

test("the bachelor-only catalog does not recommend programs for a master's profile", () => {
  assert.deepEqual(getPrimaryMatches({ ...profileA, targetDegree: "Master" }), []);
});

test("budget changes ranking among otherwise relevant programs", () => {
  const candidates = programs.filter(({ id }) => ["aitu-computer-science", "hkust-computer-science"].includes(id));
  assert.equal(recommendPrograms(profileA, candidates)[0].program.id, "hkust-computer-science");
  assert.equal(recommendPrograms(profileB, candidates)[0].program.id, "aitu-computer-science");
});

test("IELTS changes eligibility when an official threshold is known", () => {
  const asu = programs.filter(({ id }) => id === "asu-data-science");
  // When academic aptitude is satisfied/known, IELTS threshold separates eligible_now from with_actions
  const benchmark = asu.map((p) => ({
    ...p,
    academicRequirement: { ...p.academicRequirement!, minimumScore: 3.0 },
  }));
  assert.equal(recommendPrograms(profileA, benchmark)[0].eligibility, "eligible_now");
  assert.equal(recommendPrograms(profileB, benchmark)[0].eligibility, "with_actions");

  // In the real catalog, ASU Data Science preserves qualification-specific aptitude verification
  assert.equal(recommendPrograms(profileA, asu)[0].eligibility, "requires_verification");
  assert.equal(recommendPrograms(profileB, asu)[0].eligibility, "requires_verification");
  // But IELTS still changes language fit score and surfaces the IELTS gap
  const recA = recommendPrograms(profileA, asu)[0];
  const recB = recommendPrograms(profileB, asu)[0];
  assert.ok(recA.breakdown.languageFit! > recB.breakdown.languageFit!);
  assert.ok(recA.reasons.some((r) => r.includes("Your IELTS meets the requirement")));
  assert.ok(recB.gaps.some((g) => g.includes("IELTS needs improvement")));
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
