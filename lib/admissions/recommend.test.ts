import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/programs.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { evaluateEligibility } from "./eligibility.ts";
import { recommendPrograms } from "./recommend.ts";
import { calculateFit, fieldsMatch } from "./scoring.ts";

const profile: StudentProfile = {
  fullName: "Demo Student",
  nationality: "Kazakhstan",
  countryOfResidence: "Kazakhstan",
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Canada"],
  targetIntake: "Fall 2027",
  gpa: 3.4,
  ieltsScore: 6.5,
  satScore: 1300,
  annualBudget: 30000,
  budgetCurrency: "USD",
};

const byId = (id: string) => demoPrograms.find((program) => program.id === id)!;

test("CS profile excludes unrelated business programs", () => {
  const recommendations = recommendPrograms(profile, demoPrograms);

  assert.equal(recommendations[0].program.id, "northbridge-cs");
  assert.equal(
    recommendations.some((item) =>
      ["horizon-business", "danube-management", "atlantic-finance", "eastgate-analytics"].includes(
        item.program.id,
      ),
    ),
    false,
  );
});

test("Business profile excludes unrelated tech programs", () => {
  const recommendations = recommendPrograms(
    { ...profile, intendedField: "Business", preferredCountries: [] },
    demoPrograms,
  );

  assert.equal(
    recommendations.some((item) =>
      ["northbridge-cs", "baltic-software", "pacifica-data", "meridian-it"].includes(
        item.program.id,
      ),
    ),
    false,
  );
});

test("changing the selected field changes the recommendation set", () => {
  const csIds = recommendPrograms(profile, demoPrograms).map((item) => item.program.id);
  const businessIds = recommendPrograms(
    { ...profile, intendedField: "Business", preferredCountries: [] },
    demoPrograms,
  ).map((item) => item.program.id);

  assert.notDeepEqual(csIds, businessIds);
  assert.equal(csIds.some((id) => businessIds.includes(id)), false);
});

test("explicitly related fields remain supported", () => {
  const recommendations = recommendPrograms(profile, demoPrograms);

  assert.equal(fieldsMatch("Computer Science", "Software Engineering"), true);
  assert.equal(fieldsMatch("Computer Science", "Data Science"), true);
  assert.equal(fieldsMatch("Computer Science", "Business Analytics"), false);
  assert.equal(
    recommendations.some((item) => item.program.id === "baltic-software"),
    true,
  );
});

test("lowering the budget changes the ranking", () => {
  const expensive: UniversityProgram = {
    ...byId("northbridge-cs"),
    id: "expensive",
    tuition: 30000,
    ieltsRequirement: { ...byId("northbridge-cs").ieltsRequirement!, minimumScore: 6 },
  };
  const affordable: UniversityProgram = {
    ...byId("baltic-software"),
    id: "affordable",
    tuition: 12000,
    deadline: "2028-05-15",
  };
  const programs = [expensive, affordable];
  const neutralProfile = { ...profile, preferredCountries: [] };

  assert.equal(recommendPrograms(neutralProfile, programs)[0].program.id, "expensive");
  assert.equal(
    recommendPrograms({ ...neutralProfile, annualBudget: 12000 }, programs)[0].program.id,
    "affordable",
  );
});

test("IELTS below the requirement creates a gap", () => {
  const [recommendation] = recommendPrograms(
    { ...profile, ieltsScore: 6 },
    [byId("northbridge-cs")],
  );

  assert.ok(recommendation.gaps.includes("IELTS needs improvement from 6 to 6.5"));
  assert.equal(recommendation.eligibility, "with_actions");
});

test("meeting the IELTS requirement removes its gap", () => {
  const [recommendation] = recommendPrograms(profile, [byId("northbridge-cs")]);

  assert.equal(recommendation.gaps.some((gap) => gap.startsWith("IELTS")), false);
  assert.ok(recommendation.reasons.includes("Your IELTS meets the requirement"));
});

test("a preferred country improves its program's ranking", () => {
  const canada = byId("northbridge-cs");
  const germany = { ...canada, id: "germany-copy", country: "Germany" };
  const noPreference = recommendPrograms(
    { ...profile, preferredCountries: [] },
    [germany, canada],
  );
  const canadaPreferred = recommendPrograms(profile, [germany, canada]);

  assert.equal(noPreference[0].program.id, "germany-copy");
  assert.equal(canadaPreferred[0].program.id, "northbridge-cs");
});

test("an unknown university requirement requires verification", () => {
  assert.equal(evaluateEligibility(profile, byId("meridian-it")), "requires_verification");
});

test("a high-fit not-eligible program does not outrank a viable recommendation", () => {
  const highFitNotEligible: UniversityProgram = {
    ...byId("northbridge-cs"),
    id: "high-fit-not-eligible",
    academicRequirement: {
      label: "GPA",
      minimumScore: 3.5,
      isRequired: true,
      notes: null,
    },
  };
  const viable = byId("baltic-software");
  const recommendations = recommendPrograms(profile, [highFitNotEligible, viable]);

  assert.ok(
    calculateFit(profile, highFitNotEligible).fitScore >
      calculateFit(profile, viable).fitScore,
  );
  assert.equal(recommendations[0].program.id, viable.id);
  assert.equal(
    recommendations.some((recommendation) => recommendation.eligibility === "not_eligible"),
    false,
  );
});

test("unknown requirements reduce coverage without boosting Fit Score confidence", () => {
  const known = byId("northbridge-cs");
  const unknown = { ...known, id: "unknown-academic", academicRequirement: null };
  const knownFit = calculateFit(profile, known);
  const unknownFit = calculateFit(profile, unknown);

  assert.equal(knownFit.dataCoverage, 100);
  assert.equal(unknownFit.dataCoverage, 80);
  assert.equal(unknownFit.breakdown.academicFit, null);
  assert.ok(unknownFit.fitScore <= knownFit.fitScore);
  assert.equal(recommendPrograms(profile, [unknown, known])[0].program.id, known.id);
});

test("Fit Score always remains between 0 and 100", () => {
  const profiles = [
    profile,
    { ...profile, gpa: -1, ieltsScore: -1, annualBudget: -1 },
    {
      ...profile,
      intendedField: null,
      gpa: null,
      ieltsScore: null,
      satScore: null,
      annualBudget: null,
      budgetCurrency: null,
      targetIntake: null,
    },
  ];

  for (const candidate of profiles) {
    for (const program of demoPrograms) {
      const { fitScore } = calculateFit(candidate, program);
      assert.ok(fitScore >= 0 && fitScore <= 100);
    }
  }
});

test("eligibility remains separate from Fit Score", () => {
  const optionalSat = byId("northbridge-cs");
  const requiredSat = {
    ...optionalSat,
    id: "required-sat",
    satRequirement: {
      label: "SAT",
      minimumScore: 1200,
      isRequired: true,
      notes: null,
    },
  };
  const missingSat = { ...profile, satScore: null };

  assert.equal(calculateFit(missingSat, optionalSat).fitScore, calculateFit(missingSat, requiredSat).fitScore);
  assert.equal(evaluateEligibility(missingSat, optionalSat), "eligible_now");
  assert.equal(evaluateEligibility(missingSat, requiredSat), "requires_verification");
});

test("IELTS changes its fit component and eligibility without changing other components", () => {
  const program = byId("northbridge-cs");
  const meeting = calculateFit(profile, program);
  const belowProfile = { ...profile, ieltsScore: 6 };
  const below = calculateFit(belowProfile, program);
  const { languageFit: meetingLanguage, ...meetingOther } = meeting.breakdown;
  const { languageFit: belowLanguage, ...belowOther } = below.breakdown;

  assert.equal(evaluateEligibility(profile, program), "eligible_now");
  assert.equal(evaluateEligibility(belowProfile, program), "with_actions");
  assert.ok(below.fitScore < meeting.fitScore);
  assert.ok(belowLanguage! < meetingLanguage!);
  assert.deepEqual(belowOther, meetingOther);
});

test("the same inputs always return the same recommendations", () => {
  assert.deepEqual(
    recommendPrograms(profile, demoPrograms),
    recommendPrograms(profile, demoPrograms),
  );
});
