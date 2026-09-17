import type {
  Diagnosis,
  EligibilityStatus,
  Recommendation,
  RoadmapItem,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";

export type AIProfile = Pick<
  StudentProfile,
  | "currentStudyStage"
  | "targetDegree"
  | "intendedField"
  | "preferredCountries"
  | "targetIntake"
  | "gpa"
  | "ieltsScore"
  | "satScore"
  | "annualBudget"
  | "budgetCurrency"
>;

export type DiagnosisAIInput = {
  profile: AIProfile;
  deterministicDiagnosis: Diagnosis;
};

export type RecommendationAIInput = {
  profile: AIProfile;
  programFacts: UniversityProgram;
  recommendation: Pick<
    Recommendation,
    "fitScore" | "dataCoverage" | "breakdown" | "eligibility" | "reasons" | "gaps"
  >;
};

export type RoadmapTaskAIInput = {
  profile: AIProfile;
  programFacts: UniversityProgram;
  task: RoadmapItem;
};

export type DiagnosisAIOutput = {
  summary: string;
  focus: string[];
};

export type RecommendationAIOutput = {
  summary: string;
  whyItFits: string[];
  watchOutFor: string[];
};

export type RoadmapTaskAIOutput = {
  title: string;
  description: string;
};

const nullableString = (value: unknown) =>
  value === null || (typeof value === "string" && value.length <= 120);
const nullableNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

export function toAIProfile(profile: StudentProfile): AIProfile {
  const {
    currentStudyStage,
    targetDegree,
    intendedField,
    preferredCountries,
    targetIntake,
    gpa,
    ieltsScore,
    satScore,
    annualBudget,
    budgetCurrency,
  } = profile;
  return {
    currentStudyStage,
    targetDegree,
    intendedField,
    preferredCountries,
    targetIntake,
    gpa,
    ieltsScore,
    satScore,
    annualBudget,
    budgetCurrency,
  };
}

export function isAIProfile(value: unknown): value is AIProfile {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, [
      "currentStudyStage",
      "targetDegree",
      "intendedField",
      "preferredCountries",
      "targetIntake",
      "gpa",
      "ieltsScore",
      "satScore",
      "annualBudget",
      "budgetCurrency",
    ]) &&
    nullableString(value.currentStudyStage) &&
    nullableString(value.targetDegree) &&
    nullableString(value.intendedField) &&
    Array.isArray(value.preferredCountries) &&
    value.preferredCountries.length <= 10 &&
    value.preferredCountries.every((country) => typeof country === "string" && country.length <= 120) &&
    nullableString(value.targetIntake) &&
    nullableNumber(value.gpa) &&
    nullableNumber(value.ieltsScore) &&
    nullableNumber(value.satScore) &&
    nullableNumber(value.annualBudget) &&
    nullableString(value.budgetCurrency)
  );
}

export function toStudentProfile(profile: AIProfile): StudentProfile {
  return {
    fullName: null,
    nationality: null,
    countryOfResidence: null,
    ...profile,
  };
}

export function validateDiagnosisOutput(value: unknown): DiagnosisAIOutput | null {
  if (!isRecord(value) || !hasExactKeys(value, ["summary", "focus"])) return null;
  return isShortText(value.summary) && isShortTextArray(value.focus, 2)
    ? { summary: value.summary, focus: value.focus }
    : null;
}

export function validateRecommendationOutput(value: unknown): RecommendationAIOutput | null {
  if (!isRecord(value) || !hasExactKeys(value, ["summary", "whyItFits", "watchOutFor"])) return null;
  return isShortText(value.summary) && isShortTextArray(value.whyItFits) && isShortTextArray(value.watchOutFor)
    ? { summary: value.summary, whyItFits: value.whyItFits, watchOutFor: value.watchOutFor }
    : null;
}

export function validateRoadmapTaskOutput(value: unknown): RoadmapTaskAIOutput | null {
  if (!isRecord(value) || !hasExactKeys(value, ["title", "description"])) return null;
  return isShortText(value.title) && isShortText(value.description)
    ? { title: value.title, description: value.description }
    : null;
}

export function isFactuallySafe(
  output: DiagnosisAIOutput | RecommendationAIOutput | RoadmapTaskAIOutput,
  input: DiagnosisAIInput | RecommendationAIInput | RoadmapTaskAIInput,
) {
  const text = collectText(output).toLowerCase();
  if (/acceptance rate|admission probability|chance of admission|guaranteed|scholarship|will be admitted|will get in/.test(text)) return false;

  const knownNumbers = new Set((JSON.stringify(input).match(/\d+(?:\.\d+)?/g) ?? []).map(normalizeNumber));
  const outputNumbers = text.match(/\d+(?:\.\d+)?/g) ?? [];
  if (outputNumbers.some((number) => !knownNumbers.has(normalizeNumber(number)))) return false;

  if ("recommendation" in input) {
    const current = input.recommendation.eligibility;
    const labels: Record<EligibilityStatus, string> = {
      eligible_now: "requirements met",
      with_actions: "possible with actions",
      requires_verification: "needs verification",
      not_eligible: "not currently eligible",
    };
    if (Object.entries(labels).some(([status, label]) => status !== current && text.includes(label))) return false;
  }

  if ("programFacts" in input) {
    const facts = input.programFacts;
    if (!unknownMentionsAreSafe(text, facts.tuition === null, /tuition|fees?|cost/)) return false;
    if (!unknownMentionsAreSafe(text, facts.deadline === null, /deadline|application date/)) return false;
    if (!unknownMentionsAreSafe(text, requirementUnknown(facts.ieltsRequirement), /ielts|language requirement/)) return false;
    if (!unknownMentionsAreSafe(text, requirementUnknown(facts.satRequirement), /\bsat\b/)) return false;
    if (!unknownMentionsAreSafe(text, requirementUnknown(facts.academicRequirement), /academic requirement|\bgpa\b/)) return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && [...keys].sort().every((key, index) => key === actual[index]);
}

function isShortText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 360;
}

function isShortTextArray(value: unknown, maxLength = 4): value is string[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(isShortText);
}

function collectText(output: DiagnosisAIOutput | RecommendationAIOutput | RoadmapTaskAIOutput) {
  return Object.values(output).flat().join(" ");
}

function normalizeNumber(value: string) {
  return String(Number(value));
}

function requirementUnknown(requirement: UniversityProgram["ieltsRequirement"]) {
  return requirement === null || requirement.isRequired === null || (requirement.isRequired && requirement.minimumScore === null);
}

function unknownMentionsAreSafe(text: string, unknown: boolean, topic: RegExp) {
  if (!unknown) return true;
  const mentions = text.split(/[.!?]/).filter((sentence) => topic.test(sentence));
  return mentions.every((sentence) => /unknown|verify|confirm|not provided|not available/.test(sentence));
}
