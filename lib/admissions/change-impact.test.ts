import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { programs } from "../../data/programs.ts";
import type {
  Recommendation,
  ScoreBreakdown,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import { buildChangeImpact, buildTargetChangeImpact, buildTargetPlanImpact, buildTargetPlanImpactForEdit, hasMeaningfulImpact } from "./change-impact.ts";
import { recommendPrograms } from "./recommend.ts";

const profile: StudentProfile = {
  fullName: "Student",
  nationality: "Kazakhstan",
  countryOfResidence: "Kazakhstan",
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Finland"],
  preferredLanguage: null,
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
  languageOfInstruction: null,
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

test("a removed preferred country is structured", () => {
  const impact = buildChangeImpact(
    { ...profile, preferredCountries: ["Finland", "Netherlands"] },
    profile,
    [],
    [],
  );

  assert.deepEqual(impact.changedInputs, [
    {
      input: "preferredCountries",
      addedCountries: [],
      removedCountries: ["Netherlands"],
    },
  ]);
});

test("unknown-to-known IELTS is recorded as a change without treating unknown as zero", () => {
  const impact = buildChangeImpact(
    { ...profile, ieltsScore: null },
    { ...profile, ieltsScore: 6.5 },
    [],
    [],
  );

  assert.deepEqual(impact.changedInputs.at(-1), {
    input: "ieltsScore",
    previousValue: null,
    nextValue: 6.5,
  });
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

const targetProgram = demoPrograms.find(({ id }) => id === "northbridge-cs")!;

test("identical profiles produce no target plan impact", () => {
  const plan = buildTargetPlanImpact(profile, profile, targetProgram);

  assert.deepEqual(plan, { criterionChanges: [], roadmapTaskChanges: [], nextActionChange: null });
  const impact = { ...buildChangeImpact(profile, profile, [], []), targetPlan: plan };
  assert.equal(hasMeaningfulImpact(impact), false);
});

test("an IELTS gap becoming satisfied updates criterion, roadmap, and Next Action together", () => {
  const before = { ...profile, ieltsScore: 6 };
  const after = { ...profile, ieltsScore: 7 };
  const plan = buildTargetPlanImpact(before, after, targetProgram);

  assert.deepEqual(
    plan.criterionChanges.map(({ key, previousStatus, nextStatus }) => ({ key, previousStatus, nextStatus })),
    [{ key: "ielts", previousStatus: "Action needed", nextStatus: "Match" }],
  );

  const removedIds = plan.roadmapTaskChanges
    .filter((change) => change.change === "removed")
    .map((change) => (change.change === "removed" ? change.taskId : ""));
  assert.deepEqual(removedIds.sort(), ["northbridge-cs:prepare-ielts", "northbridge-cs:take-ielts"]);

  assert.deepEqual(plan.nextActionChange, {
    previousTitle: "Raise your IELTS score to the published minimum",
    nextTitle: "Confirm the required application documents",
  });

  const impact = { ...buildChangeImpact(before, after, [], []), targetPlan: plan };
  assert.equal(hasMeaningfulImpact(impact), true);
});

test("unknown to known IELTS keeps the previous value unknown and transitions truthfully", () => {
  const plan = buildTargetPlanImpact({ ...profile, ieltsScore: null }, { ...profile, ieltsScore: 7 }, targetProgram);
  const ielts = plan.criterionChanges.find(({ key }) => key === "ielts")!;

  assert.equal(ielts.previousStatus, "Needs verification");
  assert.equal(ielts.nextStatus, "Match");
  assert.equal(ielts.previousValue, "Not provided");
  assert.doesNotMatch(ielts.previousValue, /0|fail/i);
});

test("a changed plan still produces impact when recommendation ranks do not move", () => {
  const before = { ...profile, ieltsScore: 6 };
  const after = { ...profile, ieltsScore: 7 };
  const unchangedRecommendations = recommendPrograms(before, demoPrograms);

  const impact = buildChangeImpact(before, after, unchangedRecommendations, unchangedRecommendations);
  assert.deepEqual(impact.programChanges, []);

  const plan = buildTargetPlanImpact(before, after, targetProgram);
  assert.ok(plan.criterionChanges.length > 0);
  assert.ok(plan.roadmapTaskChanges.length > 0);
  assert.equal(hasMeaningfulImpact({ ...impact, targetPlan: plan }), true);
});

test("roadmap task diff uses stable task IDs for added, removed, and priority changes", () => {
  const removed = buildTargetPlanImpact({ ...profile, ieltsScore: 6 }, { ...profile, ieltsScore: 7 }, targetProgram);
  assert.deepEqual(
    removed.roadmapTaskChanges
      .filter((change) => change.change === "removed")
      .map((change) => (change.change === "removed" ? change.taskId : ""))
      .sort(),
    ["northbridge-cs:prepare-ielts", "northbridge-cs:take-ielts"],
  );

  const added = buildTargetPlanImpact({ ...profile, ieltsScore: 7 }, { ...profile, ieltsScore: 6 }, targetProgram);
  assert.deepEqual(
    added.roadmapTaskChanges
      .filter((change) => change.change === "added")
      .map((change) => (change.change === "added" ? change.taskId : ""))
      .sort(),
    ["northbridge-cs:prepare-ielts", "northbridge-cs:take-ielts"],
  );

  const deprioritized = buildTargetPlanImpact({ ...profile, ieltsScore: 6 }, { ...profile, ieltsScore: null }, targetProgram);
  const priorityChange = deprioritized.roadmapTaskChanges.find(
    (change) => change.change === "priority_changed" && change.taskId === "northbridge-cs:prepare-ielts",
  );
  assert.ok(priorityChange);
  assert.equal(priorityChange.change === "priority_changed" ? priorityChange.previousPriority : "", "high");
  assert.equal(priorityChange.change === "priority_changed" ? priorityChange.nextPriority : "", "medium");
  assert.equal(
    deprioritized.roadmapTaskChanges.some(
      (change) => change.change === "removed" && change.taskId === "northbridge-cs:prepare-ielts",
    ),
    false,
  );
});

test("next action diff applies the same completed task ids on both sides", () => {
  const plan = buildTargetPlanImpact(
    { ...profile, ieltsScore: 6 },
    { ...profile, ieltsScore: 7 },
    targetProgram,
    ["northbridge-cs:prepare-ielts"],
  );

  assert.deepEqual(plan.nextActionChange, {
    previousTitle: "Take or retake IELTS",
    nextTitle: "Confirm the required application documents",
  });
});

test("a changed input with no downstream consequence does not fabricate impact", () => {
  const before = { ...profile, preferredCountries: ["Finland"] };
  const after = { ...profile, preferredCountries: [] };
  const unchangedRecommendations = recommendPrograms(before, demoPrograms);

  const plan = buildTargetPlanImpact(before, after, targetProgram);
  assert.deepEqual(plan.criterionChanges, []);
  assert.deepEqual(plan.roadmapTaskChanges, []);
  assert.equal(plan.nextActionChange, null);

  const impact = buildChangeImpact(before, after, unchangedRecommendations, unchangedRecommendations);
  assert.equal(impact.changedInputs.length > 0, true);
  assert.equal(hasMeaningfulImpact({ ...impact, targetPlan: plan }), false);
});

test("improving an already satisfied IELTS fabricates no plan impact", () => {
  const before = { ...profile, ieltsScore: 7 };
  const after = { ...profile, ieltsScore: 7.5 };

  const plan = buildTargetPlanImpact(before, after, targetProgram);
  assert.deepEqual(plan.criterionChanges, []);
  assert.deepEqual(plan.roadmapTaskChanges, []);
  assert.equal(plan.nextActionChange, null);

  const impact = buildChangeImpact(before, after, [], []);
  assert.equal(hasMeaningfulImpact({ ...impact, targetPlan: plan }), false);
});

test("a real verified target shows the same deterministic IELTS transition", () => {
  const twente = programs.find(({ id }) => id === "utwente-technical-computer-science")!;
  const plan = buildTargetPlanImpact({ ...profile, ieltsScore: 5.5 }, { ...profile, ieltsScore: 6.5 }, twente);

  assert.deepEqual(
    plan.criterionChanges.map(({ key, previousStatus, nextStatus }) => ({ key, previousStatus, nextStatus })),
    [{ key: "ielts", previousStatus: "Action needed", nextStatus: "Match" }],
  );
  assert.equal(
    plan.roadmapTaskChanges.some((change) => change.change === "removed" && change.taskId === "utwente-technical-computer-science:prepare-ielts"),
    true,
  );
});

test("a target change records the identity change without fabricating cross-target diffs", () => {
  const previousTarget = demoPrograms.find(({ id }) => id === "northbridge-cs")!;
  const nextTarget = demoPrograms.find(({ id }) => id === "horizon-business")!;
  const plan = buildTargetChangeImpact(previousTarget, nextTarget);

  assert.deepEqual(plan.criterionChanges, []);
  assert.deepEqual(plan.roadmapTaskChanges, []);
  assert.equal(plan.nextActionChange, null);
  assert.deepEqual(plan.targetChange, {
    previousProgramId: "northbridge-cs",
    nextProgramId: "horizon-business",
    previousName: "BSc Computer Science @ Northbridge Institute",
    nextName: "BBA Business Administration @ Horizon Business School",
  });

  const impact = buildChangeImpact(profile, profile, [], []);
  assert.equal(hasMeaningfulImpact({ ...impact, targetPlan: plan }), true);
});

test("a legacy baseline with an unknown previous target cannot fabricate target-plan impact", () => {
  const target = programs.find(({ id }) => id === "utwente-technical-computer-science")!;
  const before = { ...profile, ieltsScore: 5.5 };
  const after = { ...profile, ieltsScore: 6.5 };
  const recommendationImpact = buildChangeImpact(
    before,
    after,
    recommendPrograms(before, programs),
    recommendPrograms(after, programs),
  );

  assert.equal(buildTargetPlanImpactForEdit(before, after, null, target), undefined);
  assert.equal("targetPlan" in recommendationImpact, false);
  assert.equal(recommendationImpact.programChanges.length > 0, true);
  assert.equal(hasMeaningfulImpact(recommendationImpact), true);
});

test("same-target comparisons never carry a target-change record", () => {
  const plan = buildTargetPlanImpact({ ...profile, ieltsScore: 6 }, { ...profile, ieltsScore: 7 }, targetProgram);
  assert.equal(plan.targetChange, undefined);
  assert.ok(plan.criterionChanges.length > 0);
});

test("a GPA change reaches changed inputs and produces truthful plan impact", () => {
  // northbridge-cs publishes a directly comparable GPA minimum of 3.2.
  const before = { ...profile, gpa: 2.8, ieltsScore: 7 };
  const after = { ...profile, gpa: 3.5, ieltsScore: 7 };

  const unchangedRecommendations = recommendPrograms(before, demoPrograms);
  const impact = buildChangeImpact(before, after, unchangedRecommendations, unchangedRecommendations);
  assert.deepEqual(impact.programChanges, []);
  assert.ok(
    impact.changedInputs.some(
      (change) => change.input === "gpa" && change.previousValue === 2.8 && change.nextValue === 3.5,
    ),
  );

  const plan = buildTargetPlanImpact(before, after, targetProgram);
  assert.deepEqual(
    plan.criterionChanges.map(({ key, previousStatus, nextStatus }) => ({ key, previousStatus, nextStatus })),
    [{ key: "academic", previousStatus: "Action needed", nextStatus: "Match" }],
  );
  assert.ok(
    plan.roadmapTaskChanges.some((change) => change.change === "removed" && change.taskId === "northbridge-cs:improve-academics"),
  );
  assert.deepEqual(plan.nextActionChange, {
    previousTitle: "Address the published academic requirement gap",
    nextTitle: "Confirm the required application documents",
  });

  assert.equal(hasMeaningfulImpact({ ...impact, targetPlan: plan }), true);
});

test("an unknown-to-known GPA keeps the previous value neutral in changed inputs", () => {
  const impact = buildChangeImpact({ ...profile, gpa: null }, { ...profile, gpa: 3.4 }, [], []);
  const gpa = impact.changedInputs.find((change) => change.input === "gpa");
  assert.ok(gpa);
  assert.equal(gpa.input === "gpa" ? gpa.previousValue : "", null);
  assert.equal(gpa.input === "gpa" ? gpa.nextValue : "", 3.4);
});
