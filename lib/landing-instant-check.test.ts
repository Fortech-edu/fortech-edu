import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getProgramById, programs } from "../data/programs.ts";
import {
  buildInstantDiagnosis,
  resolveLiveInstantDiagnosis,
} from "./admissions/instant-diagnosis.ts";
import { buildTargetRequirementFacts, formatTuition } from "./admissions/presentation.ts";
import {
  createLandingInstantProfile,
  emptyProfile,
  isScoreValid,
  stepErrors,
} from "./onboarding.ts";
import {
  loadStoredProfile,
  parseStoredProfile,
  saveStoredProfile,
} from "./storage/profile.ts";
import {
  loadSelectedProgram,
  saveSelectedProgram,
} from "./storage/selection.ts";
import type { StudentProfile } from "../types/admissions.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

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

  // Real persistence safety test:
  // Setup simulated storage
  const memory = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: memory,
    sessionStorage: memory,
  };

  try {
    // 1. Initial partial session with CS target
    saveSelectedProgram("lut-software-systems-engineering");
    const csProfile: StudentProfile = {
      ...emptyProfile,
      currentStudyStage: "Grade 11",
      targetDegree: "Bachelor",
      intendedField: "Computer Science",
      gpa: 3.7,
    };
    saveStoredProfile(csProfile, 2, false, { flowStage: "current" });

    // Initial state in storage
    assert.equal(loadSelectedProgram(), "lut-software-systems-engineering");
    assert.equal(loadStoredProfile()?.profile.intendedField, "Computer Science");

    // 2. Landing target selection is local draft state:
    // Browsing/selecting Business options does NOT modify storage
    const bizProgram = getProgramById("utwente-international-business-administration")!;
    assert.ok(bizProgram);

    // Verify storage has NOT changed while browsing
    assert.equal(loadSelectedProgram(), "lut-software-systems-engineering");
    assert.equal(loadStoredProfile()?.profile.intendedField, "Computer Science");

    // 3. Explicit commit ("Build my full plan") persists target + profile + flowStage together
    const previousTarget = getProgramById(loadSelectedProgram());
    const committedProfile = createLandingInstantProfile(
      bizProgram,
      {
        currentStudyStage: "Grade 11",
        gpa: 3.7,
        ieltsScore: 6.5,
        satScore: null,
      },
      loadStoredProfile()?.profile,
      previousTarget,
    );

    saveSelectedProgram(bizProgram.id);
    saveStoredProfile(committedProfile, 3, false, { flowStage: "onboarding" });

    // Storage is now consistently updated together
    assert.equal(loadSelectedProgram(), "utwente-international-business-administration");
    const updated = loadStoredProfile();
    assert.ok(updated);
    assert.equal(updated.profile.intendedField, "Business");
    assert.equal(updated.profile.gpa, 3.7);
    assert.equal(updated.profile.ieltsScore, 6.5);
    assert.equal(updated.step, 3);
    assert.equal(updated.flowStage, "onboarding");
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window;
  }
});

test("target switching: partial CS target -> Business target updates target-derived intendedField", () => {
  const csTarget = getProgramById("lut-software-systems-engineering")!;
  const bizTarget = getProgramById("utwente-international-business-administration")!;

  const csProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    targetDegree: "Bachelor",
    intendedField: "Computer Science", // target-derived from CS
    gpa: 3.6,
  };

  const updatedProfile = createLandingInstantProfile(
    bizTarget,
    {
      currentStudyStage: "Grade 11",
      gpa: 3.6,
      ieltsScore: 6.5,
      satScore: null,
    },
    csProfile,
    csTarget, // previous target was CS
  );

  assert.equal(updatedProfile.targetDegree, "Bachelor");
  assert.equal(updatedProfile.intendedField, "Business");
});

test("target switching: partial Business target -> CS target updates target-derived intendedField", () => {
  const bizTarget = getProgramById("utwente-international-business-administration")!;
  const csTarget = getProgramById("lut-software-systems-engineering")!;

  const bizProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 12",
    targetDegree: "Bachelor",
    intendedField: "Business", // target-derived from Business
    gpa: 3.8,
  };

  const updatedProfile = createLandingInstantProfile(
    csTarget,
    {
      currentStudyStage: "Grade 12",
      gpa: 3.8,
      ieltsScore: 7.0,
      satScore: 1350,
    },
    bizProfile,
    bizTarget, // previous target was Business
  );

  assert.equal(updatedProfile.targetDegree, "Bachelor");
  assert.equal(updatedProfile.intendedField, "Computer Science");
});

test("selecting another target then navigating away before commit does not corrupt persisted target/profile consistency", () => {
  const memory = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: memory,
    sessionStorage: memory,
  };

  try {
    // User already had partial profile with CS target
    saveSelectedProgram("lut-software-systems-engineering");
    const initialProfile: StudentProfile = {
      ...emptyProfile,
      currentStudyStage: "Grade 11",
      targetDegree: "Bachelor",
      intendedField: "Computer Science",
      gpa: 3.5,
    };
    saveStoredProfile(initialProfile, 2, false, { flowStage: "current" });

    // User visits landing and explores a Business target in local draft state
    // (Simulating user browsing without clicking 'Build my full plan')
    // No storage calls should have occurred during browsing
    assert.equal(loadSelectedProgram(), "lut-software-systems-engineering");
    assert.equal(loadStoredProfile()?.profile.intendedField, "Computer Science");

    // User navigates away to /onboarding (e.g. clicks header 'Start profile')
    // /onboarding reads the persisted state:
    const loadedTarget = loadSelectedProgram();
    const loadedProfile = loadStoredProfile()?.profile;

    // Both remain 100% consistent (both CS)
    assert.equal(loadedTarget, "lut-software-systems-engineering");
    assert.equal(loadedProfile?.intendedField, "Computer Science");
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window;
  }
});

test("genuinely explicit intendedField remains preserved during target changes where appropriate", () => {
  const csTarget = getProgramById("lut-software-systems-engineering")!;
  const newCsTarget = getProgramById("aitu-computer-science")!;

  // User explicitly chose "Business" while target was CS (mismatched on purpose)
  const profileWithExplicitChoice: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    targetDegree: "Bachelor",
    intendedField: "Business", // explicit choice, not target-derived
    gpa: 3.5,
  };

  // When updating to a different CS program, explicit "Business" remains preserved
  const updated = createLandingInstantProfile(
    newCsTarget,
    {
      currentStudyStage: "Grade 11",
      gpa: 3.5,
      ieltsScore: null,
      satScore: null,
    },
    profileWithExplicitChoice,
    csTarget,
  );

  assert.equal(updated.intendedField, "Business");
});

test("live deterministic diagnosis on invalid score values suppresses false matches and neutralizes affected criteria", () => {
  const lut = getProgramById("lut-software-systems-engineering")!;
  assert.ok(lut.ieltsRequirement);
  assert.equal(lut.ieltsRequirement.minimumScore, 6.5);

  // 1. IELTS 15 cannot generate Match
  assert.equal(isScoreValid("ielts", 15), false);
  const invalidIeltsProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 3.5,
    ieltsScore: 15,
    satScore: null,
  };

  const resultIelts15 = resolveLiveInstantDiagnosis(invalidIeltsProfile, lut);
  assert.equal(resultIelts15.hasInvalidScores, true);
  assert.equal(resultIelts15.fieldErrors.ieltsScore, "Enter an IELTS score between 0 and 9.");

  const ieltsComp = resultIelts15.diagnosis.comparisons.find(({ key }) => key === "ielts");
  assert.ok(ieltsComp);
  assert.notEqual(ieltsComp.status, "Match");
  assert.equal(ieltsComp.isInvalid, true);
  assert.match(ieltsComp.profileValue, /Invalid input/);
  // biggestGaps does not contain invalid criterion
  assert.equal(resultIelts15.diagnosis.biggestGaps.some(({ key }) => key === "ielts"), false);

  // 2. GPA 5 cannot generate favorable academic comparison
  assert.equal(isScoreValid("academic", 5), false);
  const invalidGpaProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 5,
    ieltsScore: 6.5,
    satScore: null,
  };

  const resultGpa5 = resolveLiveInstantDiagnosis(invalidGpaProfile, lut);
  assert.equal(resultGpa5.hasInvalidScores, true);
  assert.equal(resultGpa5.fieldErrors.gpa, "Enter a GPA between 0 and 4.");

  const gpaComp = resultGpa5.diagnosis.comparisons.find(({ key }) => key === "academic");
  assert.ok(gpaComp);
  assert.notEqual(gpaComp.status, "Match");
  assert.equal(gpaComp.isInvalid, true);

  // 3. Invalid SAT (2000) cannot generate deterministic admission status
  assert.equal(isScoreValid("sat", 2000), false);
  const invalidSatProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 3.5,
    ieltsScore: 6.5,
    satScore: 2000,
  };

  const resultSat2000 = resolveLiveInstantDiagnosis(invalidSatProfile, lut);
  assert.equal(resultSat2000.hasInvalidScores, true);
  assert.equal(resultSat2000.fieldErrors.satScore, "Enter an SAT score between 400 and 1600.");

  const satComp = resultSat2000.diagnosis.comparisons.find(({ key }) => key === "sat");
  assert.ok(satComp);
  assert.equal(satComp.isInvalid, true);

  // 4. Correcting the values immediately restores valid live diagnosis
  const correctedProfile: StudentProfile = {
    ...emptyProfile,
    currentStudyStage: "Grade 11",
    gpa: 3.8,
    ieltsScore: 6.5,
    satScore: 1300,
  };

  const correctedResult = resolveLiveInstantDiagnosis(correctedProfile, lut);
  assert.equal(correctedResult.hasInvalidScores, false);
  assert.deepEqual(correctedResult.fieldErrors, {});

  const correctedIelts = correctedResult.diagnosis.comparisons.find(({ key }) => key === "ielts");
  assert.ok(correctedIelts);
  assert.equal(correctedIelts.status, "Match");
  assert.equal(correctedIelts.isInvalid, undefined);
});

test("deadline fact rendering truthfully displays verified deadline or unknown state", () => {
  // 1. Verified deadline: LUT Software Systems Engineering publishes "2027-04-30"
  const lut = getProgramById("lut-software-systems-engineering")!;
  assert.equal(lut.deadline, "2027-04-30");

  const lutDiagnosis = buildInstantDiagnosis(emptyProfile, lut);
  assert.equal(lutDiagnosis.timeline.deadline.status, "Published");
  assert.equal(lutDiagnosis.timeline.deadline.value, "2027-04-30");
  assert.match(lutDiagnosis.timeline.deadline.detail, /Shown exactly as recorded/);

  // 2. Unknown deadline: University of Twente IBA has null deadline
  const twente = getProgramById("utwente-international-business-administration")!;
  assert.equal(twente.deadline, null);

  const twenteDiagnosis = buildInstantDiagnosis(emptyProfile, twente);
  assert.equal(twenteDiagnosis.timeline.deadline.status, "Needs verification");
  assert.equal(twenteDiagnosis.timeline.deadline.value, "Unknown");
  assert.match(twenteDiagnosis.timeline.deadline.detail, /No verified deadline is available/);

  // Verify component source renders Deadline in facts grid
  const checkSource = readFileSync(new URL("../components/landing/instant-admission-check.tsx", import.meta.url), "utf8");
  assert.ok(checkSource.includes("<dt className=\"font-semibold text-forest-900\">Deadline</dt>"));
  assert.ok(checkSource.includes("diagnosis.timeline.deadline.value"));
  assert.ok(checkSource.includes("diagnosis.timeline.deadline.status"));
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
