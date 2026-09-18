import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { programs } from "../../data/programs.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { assessProgram } from "./recommend.ts";
import {
  buildProfileProgramCriteria,
  buildProgramComparisonCriteria,
  formatRequirement,
  formatScoreComponent,
  getProgramSource,
  resolveComparison,
} from "./presentation.ts";

const profile: StudentProfile = {
  fullName: "Demo Student",
  nationality: "Kazakhstan",
  countryOfResidence: "Kazakhstan",
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

const byId = (id: string) => demoPrograms.find((program) => program.id === id)!;
const productionById = (id: string) => programs.find((program) => program.id === id)!;
const criterion = (candidate: StudentProfile, program: UniversityProgram, key: string) =>
  buildProfileProgramCriteria(candidate, assessProgram(candidate, program)).find((item) => item.key === key)!;

test("unknown score components and requirements stay explicit", () => {
  assert.equal(formatScoreComponent(null), "Unknown");
  assert.equal(formatRequirement(null), "Unknown");
  assert.equal(formatScoreComponent(0), "0 points");
});

test("a missing source URL does not create a fake link", () => {
  assert.equal(getProgramSource(demoPrograms[0]), null);
});

test("field comparison uses the existing exact and related-field rules", () => {
  assert.deepEqual(
    criterion(profile, byId("northbridge-cs"), "field"),
    {
      key: "field",
      label: "Study field",
      profileValue: "Computer Science",
      programValue: "Computer Science",
      status: "Match",
      detail: "Same field.",
    },
  );
  assert.equal(criterion(profile, byId("baltic-software"), "field").detail, "Related field under the current matching rules.");
});

test("academic comparison separates numeric, qualification-specific, and unknown requirements", () => {
  assert.equal(criterion(profile, byId("northbridge-cs"), "academic").status, "Match");

  const qualificationSpecific = criterion(profile, productionById("lut-software-systems-engineering"), "academic");
  assert.equal(qualificationSpecific.status, "Needs verification");
  assert.match(qualificationSpecific.programValue, /qualification-specific criteria/);

  const unknown = criterion(profile, { ...byId("northbridge-cs"), academicRequirement: null }, "academic");
  assert.equal(unknown.status, "Needs verification");
  assert.equal(unknown.programValue, "Unknown");
});

test("IELTS comparison preserves met, below, missing, unknown, and not-required states", () => {
  const program = byId("northbridge-cs");
  assert.equal(criterion({ ...profile, ieltsScore: 6.5 }, program, "ielts").status, "Match");
  assert.equal(criterion({ ...profile, ieltsScore: 7 }, program, "ielts").status, "Match");
  assert.equal(criterion(profile, program, "ielts").status, "Action needed");
  assert.match(criterion({ ...profile, ieltsScore: null }, program, "ielts").detail, /not provided/);
  assert.equal(criterion(profile, { ...program, ieltsRequirement: null }, "ielts").status, "Needs verification");
  assert.equal(criterion(profile, { ...program, ieltsRequirement: { label: "IELTS", minimumScore: null, isRequired: false, notes: null } }, "ielts").status, "Not required");
});

test("SAT comparison separates required, not required, unknown, and missing score", () => {
  const optional = byId("northbridge-cs");
  const required = { ...optional, satRequirement: { label: "SAT", minimumScore: 1200, isRequired: true, notes: null } };
  assert.equal(criterion(profile, required, "sat").status, "Action needed");
  assert.equal(criterion({ ...profile, satScore: 1300 }, required, "sat").status, "Match");
  assert.equal(criterion(profile, optional, "sat").status, "Not required");
  assert.equal(criterion(profile, { ...optional, satRequirement: null }, "sat").status, "Needs verification");
});

test("budget comparison handles same-currency limits, cross-currency, and unknown values", () => {
  const program = { ...byId("northbridge-cs"), tuition: 18000 };
  assert.equal(criterion(profile, program, "tuition").status, "Match");
  assert.equal(criterion({ ...profile, annualBudget: 17000 }, program, "tuition").status, "Action needed");

  const crossCurrency = criterion(profile, { ...program, tuitionCurrency: "EUR" }, "tuition");
  assert.equal(crossCurrency.status, "Not comparable");
  assert.match(crossCurrency.detail, /don't guess exchange rates/);

  assert.equal(criterion(profile, { ...program, tuition: null }, "tuition").status, "Needs verification");
  assert.equal(criterion({ ...profile, annualBudget: null }, program, "tuition").status, "Needs verification");
});

test("timeline comparison shows known alignment and preserves an unknown deadline", () => {
  assert.equal(criterion(profile, byId("northbridge-cs"), "timeline").status, "Match");
  const unknown = criterion(profile, { ...byId("northbridge-cs"), deadline: null }, "timeline");
  assert.equal(unknown.status, "Needs verification");
  assert.equal(unknown.programValue, "Unknown");
});

test("language-of-instruction evidence distinguishes no preference, unknown, match, and mismatch", () => {
  const program = { ...byId("northbridge-cs"), languageOfInstruction: "English" };
  assert.equal(criterion(profile, program, "languageOfInstruction").status, "Not required");
  assert.equal(criterion({ ...profile, preferredLanguage: "English" }, program, "languageOfInstruction").status, "Match");
  assert.equal(criterion({ ...profile, preferredLanguage: "Finnish" }, program, "languageOfInstruction").status, "Action needed");
  assert.equal(criterion({ ...profile, preferredLanguage: "English" }, { ...program, languageOfInstruction: null }, "languageOfInstruction").status, "Needs verification");
});

test("official source URLs pass through unchanged", () => {
  const program = productionById("lut-software-systems-engineering");
  assert.deepEqual(
    program.sources.map(({ url }) => url),
    [
      "https://www.lut.fi/en/studies/tekniikka/bachelors-programme-software-and-systems-engineering-hebut-double-degree",
      "https://www.lut.fi/en/studies/apply-lut/applying-bachelors-programmes/rolling-admission-bachelors-studies/admission-criteria-non-eu-eea-applicants",
      "https://www.lut.fi/en/studies/apply-lut/applying-bachelors-programmes/international-rolling-admission-bachelors-studies",
      "https://www.lut.fi/en/studies/tekniikka/bachelors-programme-software-and-systems-engineering-hebut-double-degree",
    ],
  );
});

test("compare rows mark same and different values without declaring a winner", () => {
  const first = assessProgram(profile, byId("northbridge-cs"));
  const same = assessProgram(profile, { ...byId("northbridge-cs"), id: "same-program" });
  const different = assessProgram(profile, byId("baltic-software"));
  const sameRows = buildProgramComparisonCriteria(first, same);
  const differentRows = buildProgramComparisonCriteria(first, different);

  assert.equal(sameRows.find(({ key }) => key === "ielts")!.different, false);
  assert.equal(differentRows.find(({ key }) => key === "ielts")!.different, true);
  assert.equal(differentRows.some((row) => /winner|better|safer/i.test(`${row.label} ${row.note}`)), false);
});

test("compare preserves known, unknown, and not-required requirement differences", () => {
  const base = byId("northbridge-cs");
  const known = assessProgram(profile, base);
  const unknown = assessProgram(profile, { ...base, id: "unknown", ieltsRequirement: null, satRequirement: null });
  const rows = buildProgramComparisonCriteria(known, unknown);

  assert.deepEqual(
    rows.find(({ key }) => key === "ielts") && [rows.find(({ key }) => key === "ielts")!.firstValue, rows.find(({ key }) => key === "ielts")!.secondValue],
    ["6.5 minimum", "Unknown"],
  );
  assert.deepEqual(
    rows.find(({ key }) => key === "sat") && [rows.find(({ key }) => key === "sat")!.firstValue, rows.find(({ key }) => key === "sat")!.secondValue],
    ["Not required", "Unknown"],
  );
});

test("compare tuition explains same-currency and cross-currency treatment", () => {
  const first = assessProgram(profile, byId("northbridge-cs"));
  const sameCurrency = assessProgram(profile, byId("baltic-software"));
  const otherCurrency = assessProgram(profile, { ...byId("baltic-software"), id: "eur-program", tuitionCurrency: "EUR" });

  assert.match(buildProgramComparisonCriteria(first, sameCurrency).find(({ key }) => key === "tuition")!.note!, /Directly comparable/);
  assert.match(buildProgramComparisonCriteria(first, otherCurrency).find(({ key }) => key === "tuition")!.note!, /Not directly comparable/);
});

test("compare shows missing deadlines plus eligibility and Fit differences", () => {
  const first = assessProgram(profile, byId("northbridge-cs"));
  const second = assessProgram(profile, { ...byId("pacifica-data"), deadline: null });
  const rows = buildProgramComparisonCriteria(first, second);

  assert.equal(rows.find(({ key }) => key === "deadline")!.secondValue, "Unknown");
  assert.equal(rows.find(({ key }) => key === "eligibility")!.different, true);
  assert.equal(rows.find(({ key }) => key === "fit")!.different, true);
});

test("compare resolution rejects zero, one, invalid, duplicate, and profile-invalidated selections", () => {
  const first = assessProgram(profile, byId("northbridge-cs"));
  const second = assessProgram(profile, byId("baltic-software"));
  const current = [first, second];

  assert.equal(resolveComparison([], current), null);
  assert.equal(resolveComparison([first.program.id], current), null);
  assert.equal(resolveComparison([first.program.id, "missing"], current), null);
  assert.equal(resolveComparison([first.program.id, first.program.id], current), null);
  assert.equal(resolveComparison([first.program.id, second.program.id], [first]), null);
  assert.deepEqual(resolveComparison([first.program.id, second.program.id], current), [first, second]);
});
