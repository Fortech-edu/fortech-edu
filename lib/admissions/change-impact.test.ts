import assert from "node:assert/strict";
import test from "node:test";
import type {
  Recommendation,
  ScoreBreakdown,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import { buildChangeImpact } from "./change-impact.ts";

const profile: StudentProfile = {
  fullName: "Student",
  nationality: "Kazakhstan",
  countryOfResidence: "Kazakhstan",
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Finland"],
  targetIntake: "Fall 2027",
  gpa: 3.5,
  ieltsScore: 5.5,
  satScore: 1200,
  annualBudget: 30000,
  budgetCurrency: "USD",
};

const baseProgram: UniversityProgram = {
  id: "program",
  universityName: "Test University",
  programName: "Test Program",
  field: "Computer Science",
  country: "Finland",
  city: null,
  degreeLevel: "Bachelor",
  tuition: 20000,
  tuitionCurrency: "USD",
  tuitionPeriod: "year",
  tuitionNotes: null,
  academicRequirement: null,
  ieltsRequirement: null,
  satRequirement: null,
  deadline: null,
  sources: [],
  verificationDate: null,
};

const baseBreakdown: ScoreBreakdown = {
  fieldFit: 25,
  academicFit: 15,
  budgetFit: 15,
  languageFit: 10,
  countryPreference: 10,
  timelineFit: 10,
};

type RecommendationOverrides = Partial<
  Omit<Recommendation, "program" | "breakdown">
> & {
  program?: Partial<UniversityProgram>;
  breakdown?: Partial<ScoreBreakdown>;
};

function recommendation(
  id: string,
  overrides: RecommendationOverrides = {},
): Recommendation {
  const { program, breakdown, ...values } = overrides;
  return {
    program: {
      ...baseProgram,
      id,
      programName: `Program ${id}`,
      ...program,
    },
    fitScore: 75,
    dataCoverage: 100,
    breakdown: { ...baseBreakdown, ...breakdown },
    eligibility: "eligible_now",
    reasons: [],
    gaps: [],
    ...values,
  };
}

const changeFor = (
  programId: string,
  previous: Recommendation[],
  next: Recommendation[],
) =>
  buildChangeImpact(profile, profile, previous, next).programChanges.find(
    (change) => change.programId === programId,
  );

test("identical state has no impact", () => {
  const recommendations = [recommendation("a")];
  const impact = buildChangeImpact(profile, profile, recommendations, recommendations);

  assert.deepEqual(impact, {
    changedInputs: [],
    programChanges: [],
    summary: {
      entered: 0,
      removed: 0,
      movedUp: 0,
      movedDown: 0,
      eligibilityChanged: 0,
    },
  });
});

test("a non-relevant profile change is ignored", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, fullName: "Another Student" },
    [],
    [],
  );

  assert.deepEqual(impact.changedInputs, []);
  assert.deepEqual(impact.programChanges, []);
});

test("a field change removes old programs and enters new programs", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, intendedField: "Business" },
    [recommendation("technology-a"), recommendation("technology-b")],
    [recommendation("business-a"), recommendation("business-b")],
  );

  assert.deepEqual(impact.changedInputs[0], {
    input: "intendedField",
    previousValue: "Computer Science",
    nextValue: "Business",
  });
  assert.deepEqual(
    impact.programChanges.map(({ structuralChange }) => structuralChange).sort(),
    ["entered", "entered", "removed", "removed"],
  );
  assert.equal(
    impact.programChanges.some(({ structuralChange }) =>
      ["moved_up", "moved_down"].includes(structuralChange),
    ),
    false,
  );
});

test("preferred-country order is semantically unchanged", () => {
  const impact = buildChangeImpact(
    { ...profile, preferredCountries: ["Finland", "Netherlands"] },
    { ...profile, preferredCountries: ["Netherlands", "Finland"] },
    [],
    [],
  );

  assert.deepEqual(impact.changedInputs, []);
});

test("an added preferred country is structured", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, preferredCountries: ["Finland", "Netherlands"] },
    [],
    [],
  );

  assert.deepEqual(impact.changedInputs, [
    {
      input: "preferredCountries",
      addedCountries: ["Netherlands"],
      removedCountries: [],
    },
  ]);
});

test("rank moving from four to two is moved up with one-based ranks", () => {
  const previous = ["a", "b", "c", "target"].map((id) => recommendation(id));
  const next = ["a", "target", "b", "c"].map((id) => recommendation(id));
  const change = changeFor("target", previous, next)!;

  assert.equal(change.structuralChange, "moved_up");
  assert.equal(change.previousRank, 4);
  assert.equal(change.nextRank, 2);
});

test("rank moving from one to three is moved down", () => {
  const previous = ["target", "a", "b"].map((id) => recommendation(id));
  const next = ["a", "b", "target"].map((id) => recommendation(id));
  const change = changeFor("target", previous, next)!;

  assert.equal(change.structuralChange, "moved_down");
  assert.equal(change.previousRank, 1);
  assert.equal(change.nextRank, 3);
});

test("a Fit Score change at the same rank remains structurally unchanged", () => {
  const change = changeFor(
    "a",
    [recommendation("a", { fitScore: 70 })],
    [recommendation("a", { fitScore: 80 })],
  )!;

  assert.equal(change.structuralChange, "unchanged");
  assert.equal(change.previousFitScore, 70);
  assert.equal(change.nextFitScore, 80);
});

test("known IELTS and language-fit improvement emits a reason", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, ieltsScore: 6.5 },
    [recommendation("a", { breakdown: { languageFit: 10 } })],
    [recommendation("a", { fitScore: 80, breakdown: { languageFit: 15 } })],
  );

  assert.deepEqual(impact.changedInputs.at(-1), {
    input: "ieltsScore",
    previousValue: 5.5,
    nextValue: 6.5,
  });
  assert.ok(impact.programChanges[0].reasonCodes.includes("language_fit_improved"));
});

test("unknown-to-known language fit does not invent an improvement reason", () => {
  const change = changeFor(
    "a",
    [recommendation("a", { breakdown: { languageFit: null } })],
    [recommendation("a", { fitScore: 80, breakdown: { languageFit: 15 } })],
  )!;

  assert.deepEqual(change.fitComponentChanges, [
    { component: "languageFit", previousValue: null, nextValue: 15 },
  ]);
  assert.equal(change.reasonCodes.includes("language_fit_improved"), false);
});

test("known comparable budget-fit improvement emits a reason", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, annualBudget: 40000 },
    [recommendation("a", { breakdown: { budgetFit: 10 } })],
    [recommendation("a", { fitScore: 80, breakdown: { budgetFit: 20 } })],
  );

  assert.deepEqual(impact.changedInputs[0], {
    input: "annualBudget",
    previousValue: 30000,
    nextValue: 40000,
    previousCurrency: "USD",
    nextCurrency: "USD",
  });
  assert.ok(impact.programChanges[0].reasonCodes.includes("budget_fit_improved"));
});

test("a currency-only budget change remains structured as annual budget", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, budgetCurrency: "EUR" },
    [],
    [],
  );

  assert.deepEqual(impact.changedInputs, [
    {
      input: "annualBudget",
      previousValue: 30000,
      nextValue: 30000,
      previousCurrency: "USD",
      nextCurrency: "EUR",
    },
  ]);
});

test("unknown or incomparable budget fit emits no directional reason", () => {
  const change = changeFor(
    "a",
    [recommendation("a", { breakdown: { budgetFit: null } })],
    [recommendation("a", { fitScore: 80, breakdown: { budgetFit: 20 } })],
  )!;

  assert.equal(change.reasonCodes.includes("budget_fit_improved"), false);
  assert.equal(change.reasonCodes.includes("budget_fit_decreased"), false);
});

test("eligibility-only change is meaningful and counted", () => {
  const impact = buildChangeImpact(
    profile,
    profile,
    [recommendation("a")],
    [recommendation("a", { eligibility: "with_actions" })],
  );

  assert.equal(impact.programChanges.length, 1);
  assert.equal(impact.programChanges[0].previousEligibility, "eligible_now");
  assert.equal(impact.programChanges[0].nextEligibility, "with_actions");
  assert.deepEqual(impact.programChanges[0].reasonCodes, ["eligibility_changed"]);
  assert.equal(impact.summary.eligibilityChanged, 1);
});

test("a program entering has no previous values", () => {
  const impact = buildChangeImpact(profile, profile, [], [recommendation("a")]);
  const [change] = impact.programChanges;

  assert.equal(change.structuralChange, "entered");
  assert.equal(change.previousRank, null);
  assert.equal(change.previousFitScore, null);
  assert.equal(change.previousEligibility, null);
  assert.equal(change.nextRank, 1);
  assert.equal(impact.summary.entered, 1);
});

test("a program leaving has no next values", () => {
  const impact = buildChangeImpact(profile, profile, [recommendation("a")], []);
  const [change] = impact.programChanges;

  assert.equal(change.structuralChange, "removed");
  assert.equal(change.nextRank, null);
  assert.equal(change.nextFitScore, null);
  assert.equal(change.nextEligibility, null);
  assert.equal(change.previousRank, 1);
  assert.equal(impact.summary.removed, 1);
});

test("target degree is tracked because it controls the recommendation pool", () => {
  const impact = buildChangeImpact(
    profile,
    { ...profile, targetDegree: "Master" },
    [recommendation("a")],
    [],
  );

  assert.deepEqual(impact.changedInputs[0], {
    input: "targetDegree",
    previousValue: "Bachelor",
    nextValue: "Master",
  });
});

test("eligibility changes sort before structural changes with deterministic ranks", () => {
  const impact = buildChangeImpact(
    profile,
    profile,
    [recommendation("eligible-change"), recommendation("removed")],
    [
      recommendation("entered"),
      recommendation("eligible-change", { eligibility: "with_actions" }),
    ],
  );

  assert.deepEqual(
    impact.programChanges.map(({ programId }) => programId),
    ["eligible-change", "entered", "removed"],
  );
});

test("an unknown-only breakdown transition is not meaningful by itself", () => {
  const impact = buildChangeImpact(
    profile,
    profile,
    [recommendation("a", { breakdown: { languageFit: null } })],
    [recommendation("a", { breakdown: { languageFit: 10 } })],
  );

  assert.deepEqual(impact.programChanges, []);
});
