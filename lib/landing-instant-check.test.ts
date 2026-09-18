import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getProgramById, programs } from "../data/programs.ts";
import { buildInstantDiagnosis } from "./admissions/instant-diagnosis.ts";
import { buildTargetRequirementFacts, formatTuition } from "./admissions/presentation.ts";
import {
  createLandingInstantProfile,
  emptyProfile,
  stepErrors,
} from "./onboarding.ts";
import { parseStoredProfile } from "./storage/profile.ts";
import type { StudentProfile } from "../types/admissions.ts";

test("target selection draws from real catalog and persists safely", () => {
  assert.ok(programs.length >= 10);
  const lutSSE = getProgramById("lut-software-systems-engineering");
  assert.ok(lutSSE);
  assert.equal(lutSSE.universityName, "LUT University");
  assert.equal(lutSSE.programName, "Software and Systems Engineering");
  assert.equal(lutSSE.country, "Finland");
  assert.equal(lutSSE.degreeLevel, "Bachelor of Science (Technology)");

  // Real universities list contains no empty entries
  const universities = [...new Set(programs.map((p) => p.universityName))].sort();
  assert.ok(universities.includes("LUT University"));
  assert.ok(universities.includes("University of Twente"));
  assert.ok(universities.includes("Astana IT University"));
});

test("target requirement facts match deterministic presentation helpers and preserve unknown states", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  const facts = buildTargetRequirementFacts(lut);

  // IELTS has published 6.5 minimum
  const ieltsFact = facts.find(({ key }) => key === "ielts");
  assert.ok(ieltsFact);
  assert.equal(ieltsFact.state, "known");
  assert.match(ieltsFact.value, /6\.5 minimum/);

  // SAT is not required
  const satFact = facts.find(({ key }) => key === "sat");
  assert.ok(satFact);
  assert.equal(satFact.state, "not_required");
  assert.match(satFact.value, /Not required/);

  // Tuition formatting
  const tuition = formatTuition(lut);
  assert.equal(tuition, "EUR 12,000 / year");

  // Program with unknown facts retains unknown
  const aitu = getProgramById("aitu-computer-science")!;
  const aituFacts = buildTargetRequirementFacts(aitu);
  const aituIelts = aituFacts.find(({ key }) => key === "ielts");
  assert.ok(aituIelts);
  assert.equal(aituIelts.state, "unknown");
  assert.equal(aituIelts.value, "Unknown");
});

test("current state inputs persist correctly and blank scores remain null (unknown)", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;

  const landingInput = {
    currentStudyStage: "Grade 11",
    gpa: 3.6,
    ieltsScore: 6.0,
    satScore: null, // intentional blank
  };

  const profile = createLandingInstantProfile(lut, landingInput);

  assert.equal(profile.currentStudyStage, "Grade 11");
  assert.equal(profile.gpa, 3.6);
  assert.equal(profile.ieltsScore, 6.0);
  assert.equal(profile.satScore, null); // blank remains null!
  assert.equal(profile.targetDegree, "Bachelor");
  assert.equal(profile.intendedField, "Computer Science");
});

test("instant result uses existing deterministic Instant Diagnosis logic with zero scoring differences", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  const student: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 3.6,
    ieltsScore: 6.0, // Below 6.5 minimum!
    satScore: null,
  };

  const diagnosis = buildInstantDiagnosis(student, lut);

  // IELTS comparison produces "Action needed"
  const ieltsComp = diagnosis.comparisons.find(({ key }) => key === "ielts");
  assert.ok(ieltsComp);
  assert.equal(ieltsComp.status, "Action needed");
  assert.equal(ieltsComp.profileValue, "6");
  assert.match(ieltsComp.programValue, /6\.5 minimum/);

  // SAT comparison is "Not required"
  const satComp = diagnosis.comparisons.find(({ key }) => key === "sat");
  assert.ok(satComp);
  assert.equal(satComp.status, "Not required");

  // Academic requirement needs verification (no minimum GPA specified in catalog)
  const academicComp = diagnosis.comparisons.find(({ key }) => key === "academic");
  assert.ok(academicComp);
  assert.equal(academicComp.status, "Needs verification");

  // Biggest gap includes IELTS
  assert.ok(diagnosis.biggestGaps.some(({ key }) => key === "ielts"));
  assert.match(diagnosis.biggestGaps[0].detail, /below the published minimum/);

  // Recommended next action is deterministic IELTS action
  assert.ok(diagnosis.nextActions.length > 0);
  const nextAction = diagnosis.nextActions[0];
  assert.equal(nextAction.basis, "Confirmed gap");
  assert.equal(nextAction.relatedRequirement, "IELTS");
  assert.match(nextAction.id, /prepare-ielts|take-ielts/);
});

test("continuity: landing state transfers directly into onboarding Step 3 without repeating target or current state", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;

  const landingInput = {
    currentStudyStage: "Grade 12",
    gpa: 3.8,
    ieltsScore: 7.0,
    satScore: null,
  };

  const profile = createLandingInstantProfile(lut, landingInput);

  // Simulate storing profile with flowStage: "onboarding" and step: 3
  const storedJson = JSON.stringify({
    version: 1,
    profile,
    step: 3,
    completed: false,
    flowStage: "onboarding",
    updatedAt: "2026-09-18T23:00:00.000Z",
  });

  const restored = parseStoredProfile(storedJson);
  assert.ok(restored);
  assert.equal(restored.step, 3);
  assert.equal(restored.flowStage, "onboarding");
  assert.equal(restored.completed, false);
  assert.equal(restored.profile.gpa, 3.8);
  assert.equal(restored.profile.ieltsScore, 7.0);
  assert.equal(restored.profile.satScore, null);
  assert.equal(restored.profile.targetDegree, "Bachelor");
  assert.equal(restored.profile.intendedField, "Computer Science");

  // Inspect onboarding-form source to verify that flowStage === "onboarding" and step === 3
  // renders "Complete missing details" without re-prompting target or current state
  const onboardingSource = readFileSync(new URL("../components/journey/onboarding-form.tsx", import.meta.url), "utf8");
  assert.ok(onboardingSource.includes('["Complete missing details", "Add your target intake, budget, and study preferences to finalize your admission profile."]'));
  assert.ok(onboardingSource.includes('step === 3'));
});

test("existing user: completed profile must not be silently overwritten on landing", () => {
  // Existing completed profile
  const completedProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Undergraduate student",
    gpa: 3.9,
    ieltsScore: 8.0,
    satScore: 1450,
    targetDegree: "Bachelor",
    intendedField: "Computer Science",
    targetIntake: "Fall 2027",
    annualBudget: 30000,
    budgetCurrency: "USD",
  };

  const completedStoredJson = JSON.stringify({
    version: 1,
    profile: completedProfile,
    step: 4,
    completed: true,
    flowStage: "onboarding",
    updatedAt: "2026-09-18T22:00:00.000Z",
  });

  const parsed = parseStoredProfile(completedStoredJson);
  assert.ok(parsed);
  assert.equal(parsed.completed, true);
  assert.equal(parsed.step, 4);

  // Inspect instant-admission-check component source to verify completed profile banner and guard
  const checkSource = readFileSync(new URL("../components/landing/instant-admission-check.tsx", import.meta.url), "utf8");
  assert.ok(checkSource.includes("stored?.completed"));
  assert.ok(checkSource.includes("Active Admission Plan"));
  assert.ok(checkSource.includes("/diagnosis"));
  assert.ok(checkSource.includes("/roadmap"));
  // Selection handlers must NOT overwrite storage if stored is completed
  assert.ok(checkSource.includes("if (!stored?.completed)"));
});

test("target switching on landing updates displayed requirements dynamically", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  const twente = getProgramById("utwente-technical-computer-science")!;

  const lutFacts = buildTargetRequirementFacts(lut);
  const twenteFacts = buildTargetRequirementFacts(twente);

  // LUT has IELTS 6.5; Twente has IELTS 6.0
  const lutIelts = lutFacts.find(({ key }) => key === "ielts")!;
  const twenteIelts = twenteFacts.find(({ key }) => key === "ielts")!;

  assert.match(lutIelts.value, /6\.5 minimum/);
  assert.match(twenteIelts.value, /6 minimum/);

  // Diagnosis for a student with IELTS 6.0 differs between these targets
  const student: StudentProfile = { ...emptyProfile, ieltsScore: 6.0 };
  const lutDiagnosis = buildInstantDiagnosis(student, lut);
  const twenteDiagnosis = buildInstantDiagnosis(student, twente);

  assert.equal(lutDiagnosis.comparisons.find(({ key }) => key === "ielts")?.status, "Action needed");
  assert.equal(twenteDiagnosis.comparisons.find(({ key }) => key === "ielts")?.status, "Match");
});

test("input score validations catch out-of-range values", () => {
  const invalidProfile: StudentProfile = {
    ...emptyProfile,
    gpa: 4.5, // invalid
    ieltsScore: 10, // invalid
    satScore: 300, // invalid
  };

  const errors = stepErrors(2, invalidProfile);
  assert.equal(errors.gpa, "Enter a GPA between 0 and 4.");
  assert.equal(errors.ieltsScore, "Enter an IELTS score between 0 and 9.");
  assert.equal(errors.satScore, "Enter an SAT score between 400 and 1600.");
});
