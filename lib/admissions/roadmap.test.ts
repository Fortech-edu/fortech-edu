import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { demoPrograms } from "../../data/fixtures/demo-programs.ts";
import { programs } from "../../data/programs.ts";
import type { RoadmapItem, StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import {
  generateRoadmap,
  getNextAction,
  getPrioritizedRoadmapItems,
  getRoadmapProgress,
  hasStrongProfileState,
  roadmapHorizons,
} from "./roadmap.ts";
import { assessProgram } from "./recommend.ts";

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
const ids = (items: RoadmapItem[]) => items.map(({ id }) => id);
const text = (items: RoadmapItem[]) => items.map(({ title, description }) => `${title} ${description}`).join(" ");

test("roadmap horizons are a stable NOW, NEXT 30 DAYS, THIS SEMESTER, BEFORE APPLICATION sequence", () => {
  assert.deepEqual(roadmapHorizons.map(({ id }) => id), ["now", "next_30_days", "this_semester", "before_application"]);
});

test("a strong profile has no fake requirement gaps and still has useful actions", () => {
  const program = productionById("asu-data-science");
  const items = generateRoadmap({ ...profile, intendedField: "Data Science", gpa: 3.5, ieltsScore: 7 }, program);

  assert.equal(items.some(({ type }) => type === "requirement"), false);
  assert.equal(hasStrongProfileState(items), true);
  assert.equal(items.some(({ id }) => id.endsWith(":verify-documents")), true);
  assert.ok(items.length >= 6);
  assert.equal(items.some(({ id, title }) => id.endsWith(":prepare-documents") && title.includes(program.programName)), true);
  assert.equal(items.some(({ id, officialSourceUrl }) => id.endsWith(":verify-documents") && officialSourceUrl === program.sources.find(({ type }) => type === "admissions")!.url), true);
  assert.equal(items.some(({ id }) => id.endsWith(":review-application")), true);
  assert.equal(items.some(({ id }) => id.endsWith(":finalize-application")), true);
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

test("a numeric requirement on a non-GPA scale never becomes a GPA improvement task", () => {
  const program: UniversityProgram = {
    ...byId("northbridge-cs"),
    academicRequirement: { label: "UNT", minimumScore: 70, isRequired: true, notes: null },
  };
  const items = generateRoadmap({ ...profile, gpa: 3.4 }, program);

  assert.equal(items.some(({ id }) => id.endsWith(":improve-academics")), false);
  assert.equal(items.some(({ id }) => id.endsWith(":verify-academic")), true);
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

test("unknown document requirements stay source-backed verification work", () => {
  const program = productionById("lut-software-systems-engineering");
  const items = generateRoadmap(profile, program);
  const item = items.find(({ id }) => id.endsWith(":verify-documents"));
  assert.ok(item);
  assert.equal(item.officialSourceUrl, program.sources.find(({ type }) => type === "admissions")!.url);
  assert.match(item.description, /not yet verified/i);
  assert.equal(items.some(({ id }) => /prepare-(motivation-letter|recommendations)$/.test(id)), false);
});

test("verified motivation and recommendation requirements create only their preparation tasks", () => {
  const required = {
    ...byId("northbridge-cs"),
    applicationDocuments: { motivationLetter: true, recommendationLetters: true },
  };
  const none = {
    ...required,
    applicationDocuments: { motivationLetter: false, recommendationLetters: false },
  };
  const requiredItems = generateRoadmap(profile, required);
  const noItems = generateRoadmap(profile, none);
  assert.equal(requiredItems.some(({ id }) => id.endsWith(":prepare-motivation-letter")), true);
  assert.equal(requiredItems.some(({ id }) => id.endsWith(":prepare-recommendations")), true);
  assert.equal(noItems.some(({ id }) => /prepare-(motivation-letter|recommendations)$/.test(id)), false);
});

test("activities only enrich contextual application-material guidance", () => {
  const program = byId("northbridge-cs");
  const unchanged = generateRoadmap(profile, program);
  const blank = generateRoadmap({ ...profile, activitiesAndAchievements: "  " }, program);
  const contextual = generateRoadmap({ ...profile, activitiesAndAchievements: "Volunteer tutor and coding project" }, program);
  const materialStep = contextual.find(({ id }) => id.endsWith(":prepare-documents"));

  assert.deepEqual(blank, unchanged);
  assert.deepEqual(ids(contextual), ids(unchanged));
  assert.match(materialStep!.description, /activities and achievements.*relevant examples.*confirmed application materials/i);
  assert.doesNotMatch(materialStep!.description, /chance|probability|guarantee/i);
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
  assert.doesNotMatch(items.map(({ reason }) => reason).join(" "), /guaranteed|admission chance|you will be admitted|scholarship|probability|chance of/i);
});

test("confirmed GPA gaps receive high-priority NOW actions", () => {
  const items = generateRoadmap({ ...profile, gpa: 3 }, byId("northbridge-cs"));
  const item = items.find(({ id }) => id.endsWith(":improve-academics"))!;

  assert.ok(item);
  assert.equal(item.priority, "high");
  assert.equal(item.horizon, "now");
  assert.equal(item.relatedRequirement, "Academic requirement");
  assert.match(item.reason, /GPA is below the directly comparable published minimum/);
});

test("confirmed IELTS gaps are prioritized above verification and preparation work", () => {
  const program = byId("northbridge-cs");
  const items = generateRoadmap(profile, program);
  const prioritized = getPrioritizedRoadmapItems(items);
  const priorities = items.map(({ priority }) => priority);

  assert.equal(items.find(({ id }) => id.endsWith(":prepare-ielts"))!.priority, "high");
  assert.equal(items.find(({ id }) => id.endsWith(":take-ielts"))!.priority, "high");
  assert.equal(prioritized[0].id, "northbridge-cs:prepare-ielts");
  assert.equal(items.indexOf(prioritized[0]) < items.indexOf(prioritized.find(({ priority }) => priority !== "high")!), true);
  assert.ok(priorities.includes("medium") && priorities.includes("high"));
});

test("a missing student score stays medium priority instead of becoming a confirmed gap", () => {
  const items = generateRoadmap({ ...profile, ieltsScore: null }, byId("northbridge-cs"));
  const item = items.find(({ id }) => id.endsWith(":prepare-ielts"))!;

  assert.equal(item.priority, "medium");
  assert.equal(item.horizon, "now");
  assert.match(item.description, /No IELTS score is recorded/);
  assert.match(item.reason, /no score is recorded/);
  assert.doesNotMatch(item.reason, /below/);
});

test("tasks map to deterministic time horizons without fabricated dates", () => {
  const items = generateRoadmap(profile, byId("northbridge-cs"));
  const horizonOf = (suffix: string) => items.find(({ id }) => id.endsWith(suffix))!.horizon;

  assert.equal(horizonOf(":prepare-ielts"), "now");
  assert.equal(horizonOf(":verify-documents"), "this_semester");
  assert.equal(horizonOf(":prepare-documents"), "this_semester");
  assert.equal(horizonOf(":review-deadline"), "before_application");
  assert.equal(horizonOf(":review-application"), "before_application");

  const unknownAcademic = generateRoadmap(profile, byId("meridian-it"));
  assert.equal(unknownAcademic.find(({ id }) => id.endsWith(":verify-academic"))!.horizon, "next_30_days");

  const secondRun = generateRoadmap(profile, byId("northbridge-cs"));
  assert.deepEqual(secondRun.map(({ id, horizon }) => [id, horizon]), items.map(({ id, horizon }) => [id, horizon]));
});

test("a strong profile has no high-priority urgency and an empty NOW horizon", () => {
  const program = productionById("asu-data-science");
  const items = generateRoadmap({ ...profile, intendedField: "Data Science", gpa: 3.5, ieltsScore: 7 }, program);

  assert.equal(items.every(({ priority }) => priority !== "high"), true);
  assert.equal(items.some(({ horizon }) => horizon === "now"), false);
  assert.equal(items.length >= 6, true);
  assert.equal(hasStrongProfileState(items), true);
});

test("a selected target outside ranked matches still produces a full roadmap", () => {
  const program = byId("northbridge-cs");
  const struggling = { ...profile, gpa: 2, ieltsScore: 5.5 };
  const recommendation = assessProgram(struggling, program);

  assert.equal(recommendation.eligibility, "not_eligible");

  const items = generateRoadmap(struggling, program);
  const academics = items.find(({ id }) => id.endsWith(":improve-academics"))!;

  assert.equal(academics.priority, "high");
  assert.equal(academics.horizon, "now");
  assert.equal(items.length >= 6, true);
  assert.equal(items.some(({ id }) => id.endsWith(":submit-application")), true);
});

test("next action follows priority first and roadmap order on ties", () => {
  const program = byId("northbridge-cs");
  const items = generateRoadmap(profile, program);

  assert.equal(getNextAction(items, [])?.id, "northbridge-cs:prepare-ielts");
  assert.equal(getNextAction(items, ["northbridge-cs:prepare-ielts"])?.id, "northbridge-cs:take-ielts");

  const highDone = ["northbridge-cs:prepare-ielts", "northbridge-cs:take-ielts"];
  assert.equal(getNextAction(items, highDone)?.priority, "medium");

  const doubleGap = generateRoadmap({ ...profile, gpa: 3 }, program);
  assert.equal(getNextAction(doubleGap, [])?.id, "northbridge-cs:improve-academics");
});

test("a fully completed roadmap produces a truthful completion state", () => {
  const program = byId("northbridge-cs");
  const items = generateRoadmap(profile, program);
  const allIds = items.map(({ id }) => id);

  assert.equal(getNextAction(items, allIds), null);
  assert.deepEqual(getRoadmapProgress(items, allIds), { completed: items.length, total: items.length, percentage: 100 });
});

test("reasons and related requirements are deterministic and traceable", () => {
  const run = (profileOverride: Partial<StudentProfile> = {}) =>
    generateRoadmap({ ...profile, ...profileOverride }, byId("northbridge-cs"))
      .map(({ id, priority, reason, relatedRequirement, horizon }) => ({ id, priority, reason, relatedRequirement, horizon }));

  const first = run();
  const second = run();
  assert.deepEqual(first, second);
  assert.ok(first.every(({ reason, relatedRequirement }) => reason.length > 0 && relatedRequirement.length > 0));

  const bySuffix = (items: ReturnType<typeof run>, suffix: string) => items.find(({ id }) => id.endsWith(suffix))!;
  assert.equal(bySuffix(first, ":prepare-ielts").relatedRequirement, "IELTS");
  assert.equal(bySuffix(first, ":verify-documents").relatedRequirement, "Application documents");
  assert.equal(bySuffix(first, ":review-application").relatedRequirement, "Application instructions");
  assert.equal(bySuffix(first, ":review-application").priority, "low");
  assert.equal(bySuffix(first, ":review-deadline").relatedRequirement, "Application deadline");
});

test("budget and tuition tasks stay factual about money", () => {
  const overBudget = generateRoadmap(profile, { ...byId("northbridge-cs"), tuition: 28000 });
  const plan = overBudget.find(({ id }) => id.endsWith(":plan-budget"))!;
  assert.equal(plan.relatedRequirement, "Tuition / budget");
  assert.equal(plan.priority, "medium");
  assert.match(plan.reason, /published tuition is above the annual budget/);

  const crossCurrency = generateRoadmap(profile, productionById("lut-software-systems-engineering"));
  const review = crossCurrency.find(({ id }) => id.endsWith(":review-tuition"))!;
  assert.equal(review.priority, "low");
  assert.match(review.reason, /cannot be compared with your budget/);
});

test("known deadlines stay published without countdowns and unknown deadlines stay verification", () => {
  const known = generateRoadmap(profile, byId("northbridge-cs")).find(({ id }) => id.endsWith(":review-deadline"))!;
  assert.equal(known.dueDate, "2027-02-01");
  assert.match(known.description, /2027-02-01/);
  assert.doesNotMatch(`${known.title} ${known.description} ${known.reason}`, /days remaining|countdown|time left|in \d+ days/i);

  const unknown = generateRoadmap(profile, { ...byId("northbridge-cs"), deadline: null }).find(({ id }) => id.endsWith(":verify-deadline"))!;
  assert.equal(unknown.priority, "medium");
  assert.equal(unknown.relatedRequirement, "Application deadline");
  assert.match(unknown.reason, /has not provided a verified deadline/);
  assert.equal(unknown.dueDate, null);
});

test("activities only change contextual preparation wording, never priority, horizon, or IDs", () => {
  const program = byId("northbridge-cs");
  const withoutActivities = generateRoadmap(profile, program);
  const withActivities = generateRoadmap({ ...profile, activitiesAndAchievements: "Volunteer tutor and coding project" }, program);

  assert.deepEqual(withActivities.map(({ id }) => id), withoutActivities.map(({ id }) => id));
  const plain = withoutActivities.find(({ id }) => id.endsWith(":prepare-documents"))!;
  const contextual = withActivities.find(({ id }) => id.endsWith(":prepare-documents"))!;
  assert.match(contextual.reason, /Activities are available/);
  assert.doesNotMatch(plain.reason, /Activities are available/);
  assert.equal(contextual.priority, plain.priority);
  assert.equal(contextual.horizon, plain.horizon);
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

test("roadmap UI exposes identity, eligibility, horizons, priorities, reasons, sources, and recovery states", () => {
  const source = readFileSync(new URL("../../components/journey/roadmap-view.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Your path to this program"));
  assert.ok(source.includes("program.universityName"));
  assert.ok(source.includes("program.programName"));
  assert.ok(source.includes("EligibilityBadge"));
  assert.ok(source.includes("Next action"));
  assert.ok(source.includes("Why now: "));
  assert.ok(source.includes("Why it matters: "));
  assert.ok(source.includes("priorityLabels"));
  assert.ok(source.includes("roadmapHorizons"));
  assert.ok(source.includes("OfficialSourceLink"));
  assert.ok(source.includes('type="checkbox"'));
  assert.ok(source.includes("Build your profile first"));
  assert.ok(source.includes("Choose a program first"));
  assert.ok(source.includes("Selected program is no longer available"));
  assert.ok(source.includes("published comparable requirements we can verify"));
  assert.ok(source.includes("Current roadmap complete"));
  assert.doesNotMatch(source, /guaranteed admission|will be admitted/i);
  assert.equal(source.includes("aria-live"), false);
});

test("Program Detail still persists the selection and navigates to Roadmap", () => {
  const source = readFileSync(new URL("../../components/matches/program-detail-view.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("saveSelectedProgram(program.id)"));
  assert.ok(source.includes('router.push("/roadmap")'));
  assert.ok(source.includes("Build my roadmap for this program"));
});
