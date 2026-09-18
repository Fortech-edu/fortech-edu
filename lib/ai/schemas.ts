import type {
  EligibilityStatus,
  Recommendation,
  RoadmapItem,
  StudentProfile,
  UniversityProgram,
} from "../../types/admissions.ts";
import type {
  DiagnosisVerificationItem,
  TargetDiagnosis,
} from "../admissions/diagnosis.ts";
import type { InstantDiagnosisAction } from "../admissions/instant-diagnosis.ts";
import type { ProfileProgramCriterion } from "../admissions/presentation.ts";

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
  programFacts: Pick<UniversityProgram, "id" | "universityName" | "programName" | "country">;
  requirementCoverage: ProfileProgramCriterion[];
  biggestConfirmedGap: ProfileProgramCriterion | null;
  verificationItems: DiagnosisVerificationItem[];
  nextAction: Pick<InstantDiagnosisAction, "title" | "basis" | "relatedRequirement" | "description"> | null;
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
  strengths: string[];
  uncertainties: string[];
  priority: string;
  nextSteps: string[];
  advisorNote: string;
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

export function toDiagnosisAIInput(
  profile: StudentProfile,
  program: UniversityProgram,
  diagnosis: TargetDiagnosis,
): DiagnosisAIInput {
  const { id, universityName, programName, country } = program;
  const nextAction = diagnosis.priorities[0];
  return {
    profile: toAIProfile(profile),
    programFacts: { id, universityName, programName, country },
    requirementCoverage: diagnosis.requirementCoverage,
    biggestConfirmedGap: diagnosis.biggestGaps[0] ?? null,
    verificationItems: diagnosis.unknowns,
    nextAction: nextAction ? {
      title: nextAction.title,
      basis: nextAction.basis,
      relatedRequirement: nextAction.relatedRequirement,
      description: nextAction.description,
    } : null,
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
    preferredLanguage: null,
    ...profile,
  };
}

export function validateDiagnosisOutput(value: unknown): DiagnosisAIOutput | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["summary", "strengths", "uncertainties", "priority", "nextSteps", "advisorNote"])
  ) {
    return null;
  }
  return isShortText(value.summary) &&
    isShortTextArray(value.strengths, 3) &&
    isShortTextArray(value.uncertainties, 3) &&
    isShortText(value.priority) &&
    isShortTextArray(value.nextSteps, 3) &&
    isShortText(value.advisorNote)
    ? {
        summary: value.summary,
        strengths: value.strengths,
        uncertainties: value.uncertainties,
        priority: value.priority,
        nextSteps: value.nextSteps,
        advisorNote: value.advisorNote,
      }
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
  if (/acceptance rate|acceptance chance|admission (?:probability|chance|odds)|chance of admission|likely (?:accepted|admitted)|guarantee(?:d)?|scholarship|will be admitted|will get in/.test(text)) return false;

  const knownNumbers = new Set((JSON.stringify(input).match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map(normalizeNumber));
  const outputNumbers = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
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

  if (
    "requirementCoverage" in input &&
    !diagnosisStatusesAreSafe(text, input.requirementCoverage, input.verificationItems)
  ) {
    return false;
  }

  if ("recommendation" in input) {
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
  return String(Number(value.replaceAll(",", "")));
}

function diagnosisStatusesAreSafe(
  text: string,
  criteria: ProfileProgramCriterion[],
  verificationItems: DiagnosisVerificationItem[],
) {
  const sentences = text.split(/[.!?]/);
  const criteriaAreSafe = criteria.every((criterion) => {
    const topic = diagnosisTopic(criterion.key);
    const mentions = sentences.filter((sentence) => topic.test(sentence));

    if (criterion.status === "Action needed") {
      return mentions.every((sentence) =>
        !/\b(?:requirements?\s+)?(?:is|are)\s+(?:met|satisfied|matched|ready)\b|\b(?:meets|satisfies|matches)\b/i.test(sentence),
      );
    }
    if (criterion.status === "Match") {
      return mentions.every((sentence) =>
        !/\b(?:below|unmet|does not meet|action needed|confirmed gap)\b/i.test(sentence) ||
        /\b(?:no|not|isn't|is not|no longer)\b[^.!?]{0,35}\b(?:gap|below|unmet|action needed)\b/i.test(sentence),
      );
    }
    if (criterion.status === "Needs verification" || criterion.status === "Not comparable") {
      return mentions.every((sentence) =>
        /unknown|verif(?:y|ied|ication)|confirm|not comparable|not (?:provided|available|specified|listed)/i.test(sentence),
      );
    }
    return true;
  });
  if (!criteriaAreSafe) return false;

  return verificationItems.every((item) => {
    const mentions = sentences.filter((sentence) => diagnosisTopic(item.key).test(sentence));
    return mentions.every((sentence) =>
      /unknown|verif(?:y|ied|ication)|confirm|check|not comparable|not (?:provided|available|specified|listed)/i.test(sentence),
    );
  });
}

function diagnosisTopic(key: string): RegExp {
  const topics: Record<string, RegExp> = {
    academic: /\bacademic\b|\bgpa\b|\bdiploma\b/i,
    documents: /\bdocuments?\b|motivation letter|recommendation letters?/i,
    field: /study field|intended field/i,
    ielts: /\bielts\b|english requirement/i,
    languageOfInstruction: /language of instruction|teaching language/i,
    sat: /\bsat\b|standardized test/i,
    timeline: /\btimeline\b|\bintake\b|\bdeadline\b|application date/i,
    tuition: /\btuition\b|\bfees?\b|\bcost\b|\bbudget\b/i,
    currentStudyStage: /study stage|school year|grade level/i,
  };
  return topics[key] ?? new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

function requirementUnknown(requirement: UniversityProgram["ieltsRequirement"]) {
  return requirement === null || requirement.isRequired === null || (requirement.isRequired && requirement.minimumScore === null);
}

function unknownMentionsAreSafe(text: string, unknown: boolean, topic: RegExp) {
  if (!unknown) return true;
  const mentions = text.split(/[.!?]/).filter((sentence) => topic.test(sentence));
  return mentions.every((sentence) => /unknown|verif(?:y|ied|ication)|confirm|not (?:provided|available|specified|listed)/.test(sentence));
}
