import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { programs } from "../../data/programs.ts";
import type { RoadmapItem, StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import {
  generateRoadmap,
  getNextAction,
  getRoadmapProgress,
  hasStrongProfileState,
  roadmapPhases,
} from "./roadmap.ts";

const profile: StudentProfile = {
  fullName: "Demo Student",
  nationality: "Kazakhstan",
  countryOfResidence: "Kazakhstan",
  currentStudyStage: "Grade 11",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Finland", "Netherlands"],
  targetIntake: "Fall 2027",
  gpa: 3.5,
  ieltsScore: 6,
  satScore: null,
  annualBudget: 20000,
  budgetCurrency: "USD",
};

const byId = (id: string) => demoPrograms.find((program) => program.id === id)!;
const productionById = (id: string) => programs.find((program) => program.id === id)!;
const ids = (items: RoadmapItem[]) => items.map(({ id }) => id);
const text = (items: RoadmapItem[]) => items.map(({ title, description }) => `${title} ${description}`).join(" ");

test("roadmap phases are a stable NOW, PREPARE, APPLY sequence", () => {
  assert.deepEqual(roadmapPhases.map(({ id }) => id), ["now", "prepare", "apply"]);
});

test("a strong profile has no fake requirement gaps and still has useful actions", () => {
  const program = productionById("asu-data-science");
  const items = generateRoadmap({ ...profile, intendedField: "Data Science", gpa: 3.5, ieltsScore: 7 }, program);

  assert.equal(items.some(({ type }) => type === "requirement"), false);
  assert.equal(hasStrongProfileState(items), true);
  assert.equal(items.some(({ id }) => id.endsWith(":verify-documents")), true);
  assert.equal(items.some(({ id }) => id.endsWith(":review-application")), true);
  assert.equal(items.some(({ id }) => id.endsWith(":submit-application")), true);
});

test("IELTS below a known minimum is the first specific action", () => {
  const items = generateRoadmap(profile, productionById("lut-software-systems-engineering"));
  assert.equal(items[0].id, "lut-software-systems-engineering:prepare-ielts");
  assert.match(items[0].description, /current IELTS score is 6.*minimum of 6\.5/);
  assert.equal(items[0].phase, "now");
  assert.equal(items[0].type, "requirement");
});

test("meeting a known IELTS minimum creates no IELTS action", () => {
  const items = generateRoadmap({ ...profile, ieltsScore: 7 }, byId("northbridge-cs"));
  assert.equal(items.some(({ id }) => id.includes("ielts")), false);
});

test("a missing IELTS score creates a specific requirement action", () => {
  const items = generateRoadmap({ ...profile, ieltsScore: null }, byId("northbridge-cs"));
  const item = items.find(({ id }) => id.endsWith(":prepare-ielts"));
  assert.ok(item);
  assert.match(item.description, /No IELTS score is recorded.*minimum of 6\.5/);
});

test("an unknown IELTS requirement creates verification, not improvement", () => {
  const program: UniversityProgram = { ...byId("northbridge-cs"), ieltsRequirement: null };
  const items = generateRoadmap(profile, program);
  const item = items.find(({ id }) => id.endsWith(":verify-ielts"));
  assert.ok(item);
  assert.equal(item.type, "verification");
  assert.doesNotMatch(item.title, /improve|raise/i);
});

test("SAT required and missing creates preparation and exam actions", () => {
  const items = generateRoadmap({ ...profile, gpa: 3.8, ieltsScore: 7 }, byId("pacifica-data"));
  assert.equal(items.some(({ id }) => id.endsWith(":prepare-sat")), true);
  assert.equal(items.some(({ id }) => id.endsWith(":take-sat")), true);
});

test("SAT not required creates no SAT action", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.equal(items.some(({ id }) => id.includes("sat")), false);
});

test("unknown SAT stays a verification task", () => {
  const program: UniversityProgram = { ...byId("northbridge-cs"), satRequirement: null };
  const item = generateRoadmap(profile, program).find(({ id }) => id.endsWith(":verify-sat"));
  assert.ok(item);
  assert.equal(item.type, "verification");
});

test("numeric academic requirements distinguish met, below, and missing GPA", () => {
  const program = byId("northbridge-cs");
  assert.equal(generateRoadmap(profile, program).some(({ id }) => id.includes("academic")), false);
  assert.equal(generateRoadmap({ ...profile, gpa: 3 }, program)[0].id, "northbridge-cs:improve-academics");
  assert.equal(generateRoadmap({ ...profile, gpa: null }, program)[0].id, "northbridge-cs:verify-academic-score");
});

test("qualification-specific and unknown academic criteria stay verification work", () => {
  const qualificationSpecific = generateRoadmap(profile, productionById("lut-software-systems-engineering")).find(({ id }) => id.endsWith(":verify-academic"));
  const unknown = generateRoadmap(profile, { ...byId("northbridge-cs"), academicRequirement: null }).find(({ id }) => id.endsWith(":verify-academic"));
  assert.match(qualificationSpecific!.description, /qualification-specific/);
  assert.equal(qualificationSpecific!.type, "verification");
  assert.equal(unknown!.type, "verification");
  assert.equal(hasStrongProfileState(generateRoadmap(profile, productionById("hkust-computer-science"))), false);
});

test("same-currency tuition within budget creates no budget task", () => {
  const program = { ...byId("northbridge-cs"), tuition: 18000 };
  assert.equal(generateRoadmap(profile, program).some(({ id }) => /budget|tuition/.test(id)), false);
});

test("same-currency tuition over budget creates a funding plan without claims", () => {
  const program = { ...byId("northbridge-cs"), tuition: 28000 };
  const item = generateRoadmap(profile, program).find(({ id }) => id.endsWith(":plan-budget"));
  assert.ok(item);
  assert.match(item.description, /USD 28,000.*USD 20,000/);
  assert.doesNotMatch(item.description, /scholarship/i);
});

test("cross-currency tuition is explicitly not compared", () => {
  const item = generateRoadmap(profile, productionById("lut-software-systems-engineering")).find(({ id }) => id.endsWith(":review-tuition"));
  assert.ok(item);
  assert.match(item.description, /do not estimate exchange rates/i);
  assert.doesNotMatch(item.description, /above|below|within budget/i);
});

test("unknown tuition and unknown budget create verification without comparison", () => {
  const unknownTuition = generateRoadmap(profile, { ...byId("northbridge-cs"), tuition: null, tuitionCurrency: null, tuitionPeriod: null }).find(({ id }) => id.endsWith(":verify-tuition"));
  const unknownBudget = generateRoadmap({ ...profile, annualBudget: null }, byId("northbridge-cs")).find(({ id }) => id.endsWith(":verify-tuition"));
  assert.equal(unknownTuition?.title, "Confirm tuition for this program");
  assert.equal(unknownBudget?.title, "Add an annual budget and currency");
});

test("known and unknown deadlines remain distinct Apply actions", () => {
  const known = generateRoadmap(profile, byId("northbridge-cs")).find(({ id }) => id.endsWith(":review-deadline"));
  const unknown = generateRoadmap(profile, { ...byId("northbridge-cs"), deadline: null }).find(({ id }) => id.endsWith(":verify-deadline"));
  assert.equal(known?.phase, "apply");
  assert.equal(known?.dueDate, "2027-02-01");
  assert.equal(unknown?.phase, "apply");
  assert.equal(unknown?.dueDate, null);
  assert.match(unknown!.description, /No verified deadline/);
});

test("document checks do not claim motivation letters or references are required", () => {
  const item = generateRoadmap(profile, productionById("lut-software-systems-engineering")).find(({ id }) => id.endsWith(":verify-documents"));
  assert.ok(item);
  assert.match(item.description, /Confirm whether.*motivation letter or references are requested/);
  assert.doesNotMatch(item.description, /motivation letter is required|references are required|recommendation letters are required/i);
});

test("relevant official sources pass through unchanged", () => {
  const program = productionById("lut-software-systems-engineering");
  const items = generateRoadmap(profile, program);
  const ielts = items.find(({ id }) => id.endsWith(":prepare-ielts"))!;
  const deadline = items.find(({ id }) => id.endsWith(":review-deadline"))!;
  assert.equal(ielts.officialSourceUrl, program.sources.find(({ type }) => type === "admissions")!.url);
  assert.equal(deadline.officialSourceUrl, program.sources.find(({ type }) => type === "deadline")!.url);
});

test("source-less programs keep source metadata empty", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.equal(items.every(({ officialSourceLabel, officialSourceUrl }) => officialSourceLabel === null && officialSourceUrl === null), true);
});

test("roadmap copy avoids misleading admissions claims", () => {
  const items = programs.flatMap((program) => generateRoadmap(profile, program));
  assert.doesNotMatch(text(items), /guaranteed|admission chance|you will be admitted|scholarship available|\bsafe\b|\breach\b/i);
});

test("the same inputs produce the same ordered stable task IDs", () => {
  const first = ids(generateRoadmap(profile, productionById("lut-software-systems-engineering")));
  const second = ids(generateRoadmap(profile, productionById("lut-software-systems-engineering")));
  assert.deepEqual(first, second);
});

test("stale completion IDs do not affect progress", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.deepEqual(getRoadmapProgress(items, [items[0].id, "removed-task"]), {
    completed: 1,
    total: items.length,
    percentage: Math.round(100 / items.length),
  });
});

test("next action advances to the first valid incomplete task", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  assert.equal(getNextAction(items, [])?.id, items[0].id);
  assert.equal(getNextAction(items, [items[0].id])?.id, items[1].id);
});

test("profile edits regenerate and remove resolved IELTS actions", () => {
  const program = productionById("lut-software-systems-engineering");
  const before = generateRoadmap(profile, program);
  const after = generateRoadmap({ ...profile, ieltsScore: 7 }, program);
  assert.equal(before.some(({ id }) => id.includes("ielts")), true);
  assert.equal(after.some(({ id }) => id.includes("ielts")), false);
  assert.equal(after.some(({ id }) => id.endsWith(":verify-documents")), true);
});

test("roadmap UI exposes identity, eligibility, phases, sources, and recovery states", () => {
  const source = readFileSync(new URL("../../components/journey/roadmap-view.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Your path to this program"));
  assert.ok(source.includes("program.universityName"));
  assert.ok(source.includes("program.programName"));
  assert.ok(source.includes("EligibilityBadge"));
  assert.ok(source.includes("Next action"));
  assert.ok(source.includes("OfficialSourceLink"));
  assert.ok(source.includes('type="checkbox"'));
  assert.ok(source.includes("Build your profile first"));
  assert.ok(source.includes("Choose a program first"));
  assert.ok(source.includes("Selected program is no longer a current match"));
  assert.ok(source.includes("published comparable requirements we can verify"));
  assert.equal(source.includes("aria-live"), false);
});

test("Program Detail still persists the selection and navigates to Roadmap", () => {
  const source = readFileSync(new URL("../../components/matches/program-detail-view.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("saveSelectedProgram(program.id)"));
  assert.ok(source.includes('router.push("/roadmap")'));
  assert.ok(source.includes("Build my roadmap for this program"));
});
