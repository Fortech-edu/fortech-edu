import assert from "node:assert/strict";
import test from "node:test";
import { getProgramById, programs } from "../../data/programs.ts";
import { evaluateEligibility } from "./eligibility.ts";
import { getPrimaryMatches } from "./matches.ts";
import { buildProfileProgramCriteria, formatTuition } from "./presentation.ts";
import { assessProgram, recommendPrograms } from "./recommend.ts";
import { generateRoadmap, roadmapHorizons } from "./roadmap.ts";
import { calculateFit } from "./scoring.ts";
import { emptyProfile, inferFieldFromTarget } from "../onboarding.ts";
import type { StudentProfile } from "../../types/admissions.ts";

const profileCS: StudentProfile = {
  ...emptyProfile,
  fullName: "CS Applicant",
  nationality: "Kazakhstan",
  countryOfResidence: "Kazakhstan",
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Kazakhstan", "United States", "United Kingdom", "Singapore"],
  preferredLanguage: "English",
  gpa: 3.8,
  ieltsScore: 7.5,
  satScore: 1480,
  annualBudget: 35000,
  budgetCurrency: "USD",
};

const profileBusiness: StudentProfile = {
  ...emptyProfile,
  fullName: "Business Applicant",
  nationality: "South Korea",
  countryOfResidence: "South Korea",
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Business",
  preferredCountries: ["South Korea", "Hong Kong", "Malaysia"],
  preferredLanguage: "English",
  gpa: 3.5,
  ieltsScore: 6.5,
  satScore: null,
  annualBudget: 20000,
  budgetCurrency: "USD",
};

const importedProgramIds = [
  "nu-computer-science",
  "kbtu-computer-science",
  "xjtlu-computer-science-technology",
  "unnc-computer-science",
  "cuhksz-computer-science",
  "dku-computation-design",
  "um-computer-science",
  "monash-malaysia-computer-science",
  "nottingham-malaysia-computer-science",
  "kaist-computer-science",
  "yonsei-uic-economics",
  "skku-global-business-administration",
  "nus-computer-science",
  "ntu-computer-science",
  "smu-information-systems",
  "hku-computer-science",
  "cuhk-computer-science",
  "cityu-computer-science",
  "edinburgh-computer-science",
  "warwick-computer-science",
  "bristol-computer-science",
  "utoronto-computer-science",
  "waterloo-computer-science",
  "purdue-computer-science",
  "gatech-computer-science",
  "apu-cyber-security",
  "heriot-watt-malaysia-actuarial",
  "sunway-computer-science",
  "uic-data-science",
  "wku-computer-science",
  "postech-computer-science",
  "hanyang-data-science",
  "cmu-computer-science",
  "umich-computer-science",
  "ucl-computer-science",
  "imperial-computing",
  "mcmaster-computer-science",
  "sit-applied-computing",
  "lingnan-data-science",
  "satbayev-software-engineering",
] as const;

test("catalog expansion: check 1 - every program ID is unique across full catalog", () => {
  assert.equal(programs.length, 58);
  const ids = programs.map((p) => p.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 58, "All 58 program IDs must be strictly unique");
  assert.equal(importedProgramIds.length, 40, "Must import exactly 40 shortlisted programs");
  for (const id of importedProgramIds) {
    assert.ok(uniqueIds.has(id), `Expected catalog to contain imported program ${id}`);
  }
});

test("catalog expansion: check 2 - every imported record has university/program/country/field/degreeLevel", () => {
  for (const id of importedProgramIds) {
    const program = getProgramById(id);
    assert.ok(program, `Program ${id} should exist`);
    assert.ok(typeof program.universityName === "string" && program.universityName.trim().length > 0);
    assert.ok(typeof program.programName === "string" && program.programName.trim().length > 0);
    assert.ok(typeof program.country === "string" && program.country.trim().length > 0);
    assert.ok(typeof program.field === "string" && program.field.trim().length > 0);
    assert.ok(inferFieldFromTarget(program.field) !== null, `Field ${program.field} must be mappable`);
    assert.ok(typeof program.degreeLevel === "string" && program.degreeLevel.trim().length > 0);
    assert.equal(program.languageOfInstruction, "English");
    assert.ok(program.city && program.city.trim().length > 0);
  }
});

test("catalog expansion: check 3 - every non-null tuition has a valid currency and period", () => {
  const validPeriods = new Set(["semester", "year", "program"]);
  for (const program of programs) {
    if (program.tuition !== null) {
      assert.ok(typeof program.tuition === "number" && program.tuition > 0);
      assert.ok(typeof program.tuitionCurrency === "string" && program.tuitionCurrency.length >= 3);
      assert.ok(program.tuitionPeriod && validPeriods.has(program.tuitionPeriod));
      const formatted = formatTuition(program);
      assert.notEqual(formatted, "Unknown");
      assert.ok(formatted.includes(program.tuitionCurrency));
    } else {
      assert.equal(program.tuitionCurrency, null);
      assert.equal(program.tuitionPeriod, null);
    }
  }
});

test("catalog expansion: check 4 - no unsupported currency conversions exist and original currencies are preserved", () => {
  const allowedCurrencies = new Set(["USD", "EUR", "HKD", "KZT", "RMB", "MYR", "KRW", "SGD", "GBP", "CAD"]);
  for (const program of programs) {
    if (program.tuitionCurrency !== null) {
      assert.ok(
        allowedCurrencies.has(program.tuitionCurrency),
        `Unexpected currency ${program.tuitionCurrency} in ${program.id}`,
      );
    }
  }

  // Verify key markets preserve native currency without fake FX rates
  assert.equal(getProgramById("kbtu-computer-science")?.tuitionCurrency, "KZT");
  assert.equal(getProgramById("satbayev-software-engineering")?.tuitionCurrency, "KZT");
  assert.equal(getProgramById("xjtlu-computer-science-technology")?.tuitionCurrency, "RMB");
  assert.equal(getProgramById("apu-cyber-security")?.tuitionCurrency, "MYR");
  assert.equal(getProgramById("kaist-computer-science")?.tuitionCurrency, "KRW");
  assert.equal(getProgramById("nus-computer-science")?.tuitionCurrency, "SGD");
  assert.equal(getProgramById("hku-computer-science")?.tuitionCurrency, "HKD");
  assert.equal(getProgramById("edinburgh-computer-science")?.tuitionCurrency, "GBP");
  assert.equal(getProgramById("utoronto-computer-science")?.tuitionCurrency, "CAD");
  assert.equal(getProgramById("purdue-computer-science")?.tuitionCurrency, "USD");
});

test("catalog expansion: check 5 - source URLs exist and are valid HTTPS links for all imported records", () => {
  const validSourceTypes = new Set(["program", "admissions", "tuition", "deadline"]);
  for (const id of importedProgramIds) {
    const program = getProgramById(id)!;
    assert.ok(program.sources.length >= 1, `${id} must have at least one source`);
    for (const source of program.sources) {
      assert.ok(validSourceTypes.has(source.type), `Invalid source type ${source.type} in ${id}`);
      assert.ok(typeof source.title === "string" && source.title.trim().length > 0);
      assert.ok(source.url.startsWith("https://"), `Source URL must start with https:// in ${id}`);
    }
  }
});

test("catalog expansion: check 6 - minimumScore: null does not produce false Action Needed", () => {
  const nullMinPrograms = [
    "nu-computer-science",
    "kbtu-computer-science",
    "satbayev-software-engineering",
    "utoronto-computer-science",
    "waterloo-computer-science",
    "edinburgh-computer-science",
    "ucl-computer-science",
    "imperial-computing",
  ];

  for (const id of nullMinPrograms) {
    const program = getProgramById(id)!;
    assert.equal(program.academicRequirement?.minimumScore, null);

    const assessment = assessProgram(profileCS, program);
    const criteria = buildProfileProgramCriteria(profileCS, assessment);
    const academicCriterion = criteria.find((c) => c.key === "academic");

    assert.ok(academicCriterion, `Academic criterion should exist for ${id}`);
    assert.notEqual(
      academicCriterion.status,
      "Action needed",
      `Expected ${id} with minimumScore: null to NOT have status "Action needed"`,
    );
    assert.equal(
      academicCriterion.status,
      "Needs verification",
      `Expected ${id} with minimumScore: null to have status "Needs verification"`,
    );
  }
});

test("catalog expansion: check 7 - optional SAT does not become a required failure", () => {
  const optionalSatPrograms = [
    "nu-computer-science",
    "umich-computer-science",
    "asu-computer-science",
  ];

  const profileNoSat: StudentProfile = {
    ...profileCS,
    satScore: null,
  };

  for (const id of optionalSatPrograms) {
    const program = getProgramById(id)!;
    if (program.satRequirement) {
      assert.equal(program.satRequirement.isRequired, false, `${id} SAT requirement should be optional`);
    }

    const assessment = assessProgram(profileNoSat, program);
    const criteria = buildProfileProgramCriteria(profileNoSat, assessment);
    const satCriterion = criteria.find((c) => c.key === "sat");

    assert.ok(satCriterion);
    assert.notEqual(
      satCriterion.status,
      "Action needed",
      `Optional SAT without student SAT score must never be "Action needed" in ${id}`,
    );
    assert.ok(
      satCriterion.status === "Not required" || satCriterion.status === "Needs verification",
      `Expected "Not required" or "Needs verification", got ${satCriterion.status} for ${id}`,
    );
  }
});

test("catalog expansion: check 8 - unknown requirements stay Unknown / Needs verification", () => {
  for (const id of importedProgramIds) {
    const program = getProgramById(id)!;
    const assessment = assessProgram(emptyProfile, program);
    assert.notEqual(assessment.eligibility, "eligible_now");
    assert.equal(evaluateEligibility(emptyProfile, program), assessment.eligibility);
    assert.ok(assessment.dataCoverage <= 100);
  }
});

test("catalog expansion: check 9 - all 40 imported program IDs resolve via getProgramById", () => {
  for (const id of importedProgramIds) {
    const program = getProgramById(id);
    assert.ok(program !== null, `Failed to resolve program with id ${id}`);
    assert.equal(program.id, id);
  }
  assert.equal(getProgramById("non-existent-id"), null);
  assert.equal(getProgramById(null), null);
});

test("catalog expansion: check 10 - Matches can process full expanded catalog without errors", () => {
  const csMatches = getPrimaryMatches(profileCS);
  const directCsMatches = recommendPrograms(profileCS, programs);
  assert.deepEqual(csMatches, directCsMatches);
  assert.ok(csMatches.length >= 25, `Expected >= 25 CS matches in expanded catalog, got ${csMatches.length}`);

  const busMatches = getPrimaryMatches(profileBusiness);
  assert.ok(busMatches.length >= 5, `Expected >= 5 Business matches in expanded catalog, got ${busMatches.length}`);

  for (const match of [...csMatches, ...busMatches]) {
    assert.ok(match.fitScore >= 0 && match.fitScore <= 100);
    assert.ok(match.dataCoverage >= 0 && match.dataCoverage <= 100);
    assert.ok(!Number.isNaN(match.fitScore));
    assert.ok(!Number.isNaN(match.dataCoverage));
    assert.ok(match.reasons.length > 0 || match.gaps.length > 0);
  }
});

test("catalog expansion: check 11 - Compare can process imported programs side-by-side", () => {
  const testPairs = [
    ["nu-computer-science", "gatech-computer-science"],
    ["imperial-computing", "ucl-computer-science"],
    ["hku-computer-science", "nus-computer-science"],
    ["apu-cyber-security", "sunway-computer-science"],
    ["kaist-computer-science", "postech-computer-science"],
    ["utoronto-computer-science", "waterloo-computer-science"],
  ] as const;

  for (const [idA, idB] of testPairs) {
    const progA = getProgramById(idA)!;
    const progB = getProgramById(idB)!;
    assert.ok(progA && progB);

    const fitA = calculateFit(profileCS, progA);
    const fitB = calculateFit(profileCS, progB);
    assert.ok(!Number.isNaN(fitA.fitScore));
    assert.ok(!Number.isNaN(fitB.fitScore));

    const critA = buildProfileProgramCriteria(profileCS, assessProgram(profileCS, progA));
    const critB = buildProfileProgramCriteria(profileCS, assessProgram(profileCS, progB));
    assert.ok(critA.length >= 4);
    assert.ok(critB.length >= 4);
  }
});

test("catalog expansion: check 12 - roadmap generation does not crash on new records", () => {
  const validHorizons = new Set(roadmapHorizons.map((h) => h.id));
  const validPriorities = new Set(["high", "medium", "low"]);

  for (const id of importedProgramIds) {
    const program = getProgramById(id)!;
    const roadmapCS = generateRoadmap(profileCS, program);
    assert.ok(roadmapCS.length > 0, `Roadmap for ${id} should have items`);

    for (const item of roadmapCS) {
      assert.ok(item.id.startsWith(program.id));
      assert.ok(item.title.trim().length > 0);
      assert.ok(item.description.trim().length > 0);
      assert.ok(validHorizons.has(item.horizon), `Invalid horizon ${item.horizon} in ${item.id}`);
      assert.ok(validPriorities.has(item.priority), `Invalid priority ${item.priority} in ${item.id}`);
    }

    const roadmapEmpty = generateRoadmap(emptyProfile, program);
    assert.ok(roadmapEmpty.length > 0, `Roadmap for ${id} with empty profile should generate items`);
  }
});

test("catalog expansion: check 13 - existing demo programs still behave exactly as before", () => {
  const demoIds = [
    "aitu-computer-science",
    "utwente-technical-computer-science",
    "lut-software-systems-engineering",
    "hkust-computer-science",
    "asu-computer-science",
    "asu-data-science",
  ];

  for (const id of demoIds) {
    const prog = getProgramById(id);
    assert.ok(prog, `Demo program ${id} must still exist`);
  }

  const aitu = getProgramById("aitu-computer-science")!;
  assert.equal(aitu.tuition, 5000);
  assert.equal(aitu.tuitionCurrency, "USD");
  assert.equal(aitu.academicRequirement?.label, "UNT");

  const hkust = getProgramById("hkust-computer-science")!;
  assert.equal(hkust.tuition, 260000);
  assert.equal(hkust.tuitionCurrency, "HKD");
  assert.equal(hkust.ieltsRequirement?.minimumScore, 6);

  const asuDataScience = getProgramById("asu-data-science")!;
  assert.equal(asuDataScience.academicRequirement?.minimumScore, null);
  assert.equal(asuDataScience.academicRequirement?.label, "Aptitude requirement");
  assert.equal(asuDataScience.deadline, null);

  const utwente = getProgramById("utwente-technical-computer-science")!;
  assert.equal(utwente.tuition, 16869);
  assert.equal(utwente.tuitionCurrency, "EUR");
});
