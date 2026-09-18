import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { getProgramById, programs } from "../../data/programs.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { assessProgram } from "./recommend.ts";
import { calculateFit } from "./scoring.ts";
import { evaluateEligibility } from "./eligibility.ts";
import {
  buildCardEvidence,
  buildProfileProgramCriteria,
  buildProgramComparisonCriteria,
  buildTargetRequirementFacts,
  canonicalEvidenceOrder,
  criterionRelevance,
  formatRequirement,
  formatScoreComponent,
  getProgramSource,
  resolveComparison,
  selectCardEvidence,
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
  assert.equal(criterion({ ...profile, ieltsScore: null }, program, "ielts").status, "Needs verification");
  assert.match(criterion({ ...profile, ieltsScore: null }, program, "ielts").detail, /not provided/);
  assert.equal(criterion(profile, { ...program, ieltsRequirement: null }, "ielts").status, "Needs verification");
  assert.equal(criterion(profile, { ...program, ieltsRequirement: { label: "IELTS", minimumScore: null, isRequired: false, notes: null } }, "ielts").status, "Not required");
});

test("SAT comparison separates required, not required, unknown, and missing score", () => {
  const optional = byId("northbridge-cs");
  const required = { ...optional, satRequirement: { label: "SAT", minimumScore: 1200, isRequired: true, notes: null } };
  assert.equal(criterion(profile, required, "sat").status, "Needs verification");
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

test("a target resolves to the existing program domain and exposes verified requirements", () => {
  const program = getProgramById("lut-software-systems-engineering");
  assert.strictEqual(program, productionById("lut-software-systems-engineering"));

  const facts = buildTargetRequirementFacts(program!);
  assert.equal(facts.find(({ key }) => key === "academic")?.state, "known");
  assert.match(facts.find(({ key }) => key === "academic")!.value, /Upper secondary degree/);
  assert.match(facts.find(({ key }) => key === "ielts")!.value, /6\.5 minimum/);
  assert.equal(facts.find(({ key }) => key === "sat")?.state, "not_required");
  assert.equal(facts.find(({ key }) => key === "deadline")?.value, "2027-04-30");
});

test("target requirements preserve unknown data instead of inferring it", () => {
  const unknown = {
    ...productionById("lut-software-systems-engineering"),
    academicRequirement: null,
    ieltsRequirement: null,
    satRequirement: null,
    languageOfInstruction: null,
    applicationDocuments: null,
    deadline: null,
  };
  const facts = buildTargetRequirementFacts(unknown);

  assert.equal(facts.every(({ state }) => state === "unknown"), true);
  assert.equal(facts.every(({ value }) => value === "Unknown"), true);
  assert.equal(facts.some(({ detail }) => /infer|assume/i.test(detail)), false);
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

test("criterionRelevance scores actionable gaps and non-comparables above matches and unknowns", () => {
  const gap = criterion({ ...profile, gpa: 2.5 }, byId("northbridge-cs"), "academic");
  const nonComparable = criterion(
    { ...profile, gpa: 3.5 },
    { ...byId("northbridge-cs"), academicRequirement: { label: "UNT", minimumScore: 100, isRequired: true, notes: null } },
    "academic",
  );
  const match = criterion({ ...profile, gpa: 3.8 }, byId("northbridge-cs"), "academic");
  const informativeUnknown = criterion(
    { ...profile, gpa: null },
    byId("northbridge-cs"),
    "academic",
  );
  const unprovidedUnknown = criterion(
    { ...profile, annualBudget: null },
    { ...byId("northbridge-cs"), tuition: null },
    "tuition",
  );
  const notRequiredSat = criterion(profile, byId("northbridge-cs"), "sat");
  const notRequiredLang = criterion(profile, byId("northbridge-cs"), "languageOfInstruction");

  assert.equal(gap.status, "Action needed");
  assert.equal(nonComparable.status, "Not comparable");
  assert.equal(match.status, "Match");
  assert.equal(informativeUnknown.status, "Needs verification");
  assert.equal(unprovidedUnknown.status, "Needs verification");
  assert.equal(notRequiredSat.status, "Not required");
  assert.equal(notRequiredLang.status, "Not required");

  assert.ok(criterionRelevance(gap) > criterionRelevance(nonComparable));
  assert.ok(criterionRelevance(nonComparable) > criterionRelevance(match));
  assert.ok(criterionRelevance(match) > criterionRelevance(informativeUnknown));
  assert.ok(criterionRelevance(informativeUnknown) > criterionRelevance(notRequiredSat));
  assert.ok(criterionRelevance(notRequiredSat) > criterionRelevance(unprovidedUnknown));
  assert.ok(criterionRelevance(unprovidedUnknown) > criterionRelevance(notRequiredLang));
});

test("real production programs produce 3 to 5 compact evidence rows with valid statuses", () => {
  const lut = productionById("lut-software-systems-engineering");
  const asu = productionById("asu-data-science");

  const lutEvidence = buildCardEvidence(profile, assessProgram(profile, lut));
  assert.ok(lutEvidence.length >= 3 && lutEvidence.length <= 5);
  for (const item of lutEvidence) {
    assert.ok(["Match", "Action needed", "Needs verification", "Not required", "Not comparable"].includes(item.status));
    assert.ok(item.label.length > 0);
    assert.ok(item.programValue.length > 0);
    assert.ok(item.detail.length > 0);
  }

  const asuEvidence = buildCardEvidence(profile, assessProgram(profile, asu));
  assert.ok(asuEvidence.length >= 3 && asuEvidence.length <= 5);
  for (const item of asuEvidence) {
    assert.ok(["Match", "Action needed", "Needs verification", "Not required", "Not comparable"].includes(item.status));
    assert.ok(item.label.length > 0);
    assert.ok(item.programValue.length > 0);
    assert.ok(item.detail.length > 0);
  }
});

test("known academic match appears as Match in card evidence", () => {
  const program = byId("northbridge-cs");
  const evidence = buildCardEvidence({ ...profile, gpa: 3.8 }, assessProgram({ ...profile, gpa: 3.8 }, program));
  const academicItem = evidence.find((item) => item.key === "academic");
  assert.ok(academicItem);
  assert.equal(academicItem.status, "Match");
  assert.equal(academicItem.detail, "Your provided score meets this published minimum.");
});

test("known academic gap appears as Action needed and is prioritized in card evidence", () => {
  const program = byId("northbridge-cs");
  const candidate = { ...profile, gpa: 2.8 };
  const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
  const academicItem = evidence.find((item) => item.key === "academic");
  assert.ok(academicItem);
  assert.equal(academicItem.status, "Action needed");
  assert.match(academicItem.detail, /below the published minimum/);
});

test("missing student value is Needs verification, not a failure or gap", () => {
  const program = byId("northbridge-cs");
  const candidate = { ...profile, gpa: null, ieltsScore: null };
  const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
  const academicItem = evidence.find((item) => item.key === "academic");
  const ieltsItem = evidence.find((item) => item.key === "ielts");

  assert.ok(academicItem);
  assert.equal(academicItem.status, "Needs verification");
  assert.match(academicItem.detail, /not treated as a confirmed gap/);

  assert.ok(ieltsItem);
  assert.equal(ieltsItem.status, "Needs verification");
  assert.match(ieltsItem.detail, /not treated as a confirmed gap/);
});

test("unknown program requirement is Needs verification without fabricated thresholds", () => {
  const program = { ...byId("northbridge-cs"), academicRequirement: null, ieltsRequirement: null };
  const evidence = buildCardEvidence(profile, assessProgram(profile, program));
  const academicItem = evidence.find((item) => item.key === "academic");
  const ieltsItem = evidence.find((item) => item.key === "ielts");

  assert.ok(academicItem);
  assert.equal(academicItem.status, "Needs verification");
  assert.equal(academicItem.programValue, "Unknown");
  assert.match(academicItem.detail, /current verified data does not state/);

  assert.ok(ieltsItem);
  assert.equal(ieltsItem.status, "Needs verification");
  assert.equal(ieltsItem.programValue, "Unknown");
});

test("SAT not required remains Not required and provides positive clarity", () => {
  const program = byId("northbridge-cs");
  const allCriteria = buildProfileProgramCriteria(profile, assessProgram(profile, program));
  const satCriterion = allCriteria.find((item) => item.key === "sat");
  assert.ok(satCriterion);
  assert.equal(satCriterion.status, "Not required");
  assert.equal(satCriterion.programValue, "Not required");
  assert.equal(satCriterion.detail, "A missing score is not treated as a problem for this program.");

  // When budget and timeline are not provided, SAT not-required is selected into card evidence
  const candidate = { ...profile, annualBudget: null, targetIntake: null };
  const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
  const satItem = evidence.find((item) => item.key === "sat");
  assert.ok(satItem);
  assert.equal(satItem.status, "Not required");
});

test("non-GPA academic scale remains Not comparable and is surfaced in evidence", () => {
  const program: UniversityProgram = {
    ...byId("northbridge-cs"),
    academicRequirement: { label: "UNT", minimumScore: 100, isRequired: true, notes: null },
  };
  const candidate = { ...profile, gpa: 3.5 };
  const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
  const academicItem = evidence.find((item) => item.key === "academic");

  assert.ok(academicItem);
  assert.equal(academicItem.status, "Not comparable");
  assert.match(academicItem.detail, /different scales, so no numeric gap is calculated/);
});

test("verified language match appears as Match in card evidence", () => {
  const program = { ...byId("northbridge-cs"), languageOfInstruction: "English" };
  const candidate = { ...profile, preferredLanguage: "English" };
  const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
  const langItem = evidence.find((item) => item.key === "languageOfInstruction");

  assert.ok(langItem);
  assert.equal(langItem.status, "Match");
  assert.equal(langItem.detail, "This program is taught in your preferred language.");
});

test("unknown program language with student preference appears as Needs verification", () => {
  const program = { ...byId("northbridge-cs"), languageOfInstruction: null };
  const candidate = { ...profile, preferredLanguage: "English" };
  const allCriteria = buildProfileProgramCriteria(candidate, assessProgram(candidate, program));
  const langCriterion = allCriteria.find((item) => item.key === "languageOfInstruction");

  assert.ok(langCriterion);
  assert.equal(langCriterion.status, "Needs verification");
  assert.equal(langCriterion.programValue, "Unknown");
  assert.match(langCriterion.detail, /current verified program data does not state the teaching language/);

  // When budget and intake are not set, language verification is selected into card evidence
  const evidence = buildCardEvidence({ ...candidate, annualBudget: null, targetIntake: null }, assessProgram(candidate, program));
  const langItem = evidence.find((item) => item.key === "languageOfInstruction");
  assert.ok(langItem);
  assert.equal(langItem.status, "Needs verification");
});

test("no language preference creates no negative signal and stays Not required", () => {
  const program = { ...byId("northbridge-cs"), languageOfInstruction: "English" };
  const candidate = { ...profile, preferredLanguage: null };
  const allCriteria = buildProfileProgramCriteria(candidate, assessProgram(candidate, program));
  const langCriterion = allCriteria.find((item) => item.key === "languageOfInstruction");

  assert.ok(langCriterion);
  assert.equal(langCriterion.status, "Not required");
  assert.equal(langCriterion.profileValue, "No preference");
  assert.match(langCriterion.detail, /No language preference is set, so this does not affect your profile alignment/);
});

test("comparable tuition distinguishes within budget match and over budget action", () => {
  const program = { ...byId("northbridge-cs"), tuition: 15000, tuitionCurrency: "USD", tuitionPeriod: "year" as const };

  const within = buildCardEvidence({ ...profile, annualBudget: 20000, budgetCurrency: "USD" }, assessProgram(profile, program));
  const withinTuition = within.find((item) => item.key === "tuition");
  assert.ok(withinTuition);
  assert.equal(withinTuition.status, "Match");
  assert.match(withinTuition.detail, /within your annual budget/);

  const over = buildCardEvidence({ ...profile, annualBudget: 12000, budgetCurrency: "USD" }, assessProgram({ ...profile, annualBudget: 12000 }, program));
  const overTuition = over.find((item) => item.key === "tuition");
  assert.ok(overTuition);
  assert.equal(overTuition.status, "Action needed");
  assert.match(overTuition.detail, /above your annual budget/);
});

test("incompatible currency or period stays Not comparable and explains exchange rates are not guessed", () => {
  const program = { ...byId("northbridge-cs"), tuition: 15000, tuitionCurrency: "EUR", tuitionPeriod: "year" as const };
  const candidate = { ...profile, annualBudget: 20000, budgetCurrency: "USD" };
  const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
  const tuitionItem = evidence.find((item) => item.key === "tuition");

  assert.ok(tuitionItem);
  assert.equal(tuitionItem.status, "Not comparable");
  assert.match(tuitionItem.detail, /Currencies or billing periods differ\. We don't guess exchange rates\./);
});

test("unknown deadline or intake stays Needs verification", () => {
  const noDeadline = { ...byId("northbridge-cs"), deadline: null };
  const allNoDeadline = buildProfileProgramCriteria(profile, assessProgram(profile, noDeadline));
  const timelineCriterion = allNoDeadline.find((item) => item.key === "timeline");
  assert.ok(timelineCriterion);
  assert.equal(timelineCriterion.status, "Needs verification");
  assert.match(timelineCriterion.detail, /No verified deadline is available in the current data\./);

  const noIntake = { ...profile, targetIntake: null };
  const allNoIntake = buildProfileProgramCriteria(noIntake, assessProgram(noIntake, byId("northbridge-cs")));
  const timelineCriterion2 = allNoIntake.find((item) => item.key === "timeline");
  assert.ok(timelineCriterion2);
  assert.equal(timelineCriterion2.status, "Needs verification");
  assert.match(timelineCriterion2.detail, /Add a target intake to compare timing\./);

  // When selected into card evidence (e.g. limit 7 or minimal profile)
  const fullEvidence = buildCardEvidence(profile, assessProgram(profile, noDeadline), 7);
  assert.equal(fullEvidence.find((item) => item.key === "timeline")?.status, "Needs verification");
});

test("card evidence evaluation leaves calculateFit Fit Score completely unchanged", () => {
  const program = byId("northbridge-cs");
  const baselineFit = calculateFit(profile, program);

  const rec = assessProgram(profile, program);
  const evidence = buildCardEvidence(profile, rec);
  assert.ok(evidence.length >= 3);

  const afterFit = calculateFit(profile, program);
  assert.deepEqual(baselineFit, afterFit);
  assert.equal(rec.fitScore, baselineFit.fitScore);
});

test("card evidence evaluation leaves evaluateEligibility completely unchanged", () => {
  const program = byId("northbridge-cs");
  const baselineEligibility = evaluateEligibility(profile, program);

  const rec = assessProgram(profile, program);
  const evidence = buildCardEvidence(profile, rec);
  assert.ok(evidence.length >= 3);

  const afterEligibility = evaluateEligibility(profile, program);
  assert.equal(baselineEligibility, afterEligibility);
  assert.equal(rec.eligibility, baselineEligibility);
});

test("activitiesAndAchievements has zero effect on Fit Score, eligibility, and card evidence", () => {
  const program = byId("northbridge-cs");
  const withActivities = { ...profile, activitiesAndAchievements: "Winner of national informatics olympiad; 100 hours volunteering" };

  const baselineFit = calculateFit(profile, program);
  const actFit = calculateFit(withActivities, program);
  assert.deepEqual(baselineFit, actFit);

  const baselineElig = evaluateEligibility(profile, program);
  const actElig = evaluateEligibility(withActivities, program);
  assert.equal(baselineElig, actElig);

  const baselineEvidence = buildCardEvidence(profile, assessProgram(profile, program));
  const actEvidence = buildCardEvidence(withActivities, assessProgram(withActivities, program));
  assert.deepEqual(baselineEvidence, actEvidence);
});

test("evidence ordering is strictly deterministic across profiles and criteria sets", () => {
  const program = byId("northbridge-cs");
  const profiles = [
    profile,
    { ...profile, gpa: 2.5, ieltsScore: 5.5, annualBudget: 5000 },
    { ...profile, gpa: null, ieltsScore: null, annualBudget: null, preferredLanguage: "English" },
    { ...profile, gpa: 4.0, ieltsScore: 8.5, satScore: 1550, preferredLanguage: "English", annualBudget: 50000 },
  ];

  for (const candidate of profiles) {
    const evidence = buildCardEvidence(candidate, assessProgram(candidate, program));
    const indices = evidence.map((item) => canonicalEvidenceOrder[item.key]);
    for (let i = 1; i < indices.length; i++) {
      assert.ok(indices[i] > indices[i - 1], `Indices should be strictly increasing: ${indices.join(", ")}`);
    }
  }
});

test("strong, gap-heavy, and unknown profiles all receive 3 to 5 actionable, meaningful rows", () => {
  const program = byId("northbridge-cs");

  // Strong profile
  const strongProfile = {
    ...profile,
    gpa: 3.9,
    ieltsScore: 7.5,
    satScore: 1400,
    preferredLanguage: "English",
    annualBudget: 30000,
    budgetCurrency: "USD",
  };
  const strongEvidence = buildCardEvidence(strongProfile, assessProgram(strongProfile, program));
  assert.ok(strongEvidence.length >= 3 && strongEvidence.length <= 5);
  assert.ok(strongEvidence.some((item) => item.status === "Match"));

  // Gap-heavy profile
  const gapProfile = {
    ...profile,
    gpa: 2.8,
    ieltsScore: 5.5,
    annualBudget: 5000,
    budgetCurrency: "USD",
  };
  const gapEvidence = buildCardEvidence(gapProfile, assessProgram(gapProfile, program));
  assert.ok(gapEvidence.length >= 3 && gapEvidence.length <= 5);
  assert.ok(gapEvidence.some((item) => item.status === "Action needed"));

  // Unknown / minimal profile
  const unknownProfile = {
    ...profile,
    gpa: null,
    ieltsScore: null,
    satScore: null,
    annualBudget: null,
    targetIntake: null,
    preferredLanguage: null,
  };
  const unknownEvidence = buildCardEvidence(unknownProfile, assessProgram(unknownProfile, program));
  assert.ok(unknownEvidence.length >= 3 && unknownEvidence.length <= 5);
  assert.ok(unknownEvidence.some((item) => item.status === "Needs verification"));
});

test("selectCardEvidence respects custom count limits and handles fewer criteria safely", () => {
  const all = buildProfileProgramCriteria(profile, assessProgram(profile, byId("northbridge-cs")));
  const three = selectCardEvidence(all, 3);
  assert.equal(three.length, 3);

  const four = selectCardEvidence(all, 4);
  assert.equal(four.length, 4);

  const capped = selectCardEvidence(all.slice(0, 2), 4);
  assert.equal(capped.length, 2);
});
