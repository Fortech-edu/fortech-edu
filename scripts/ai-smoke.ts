import { programs } from "../data/programs.ts";
import { diagnoseProfile } from "../lib/admissions/diagnosis.ts";
import { assessProgram } from "../lib/admissions/recommend.ts";
import { getConfiguredProvider, type AIProvider } from "../lib/ai/provider.ts";
import { toAIProfile } from "../lib/ai/schemas.ts";
import { createAIService } from "../lib/ai/service.ts";
import type { StudentProfile } from "../types/admissions.ts";

const configured = getConfiguredProvider();
if (!configured) throw new Error("AI smoke failed: provider_not_configured");

let providerCalls = 0;
const provider: AIProvider = {
  generateJson(request) {
    providerCalls += 1;
    return configured.generateJson(request);
  },
};

const profile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: "Grade 12",
  targetDegree: "Bachelor",
  intendedField: "Computer Science",
  preferredCountries: ["Kazakhstan"],
  preferredLanguage: null,
  targetIntake: "Fall 2027",
  gpa: 3.6,
  ieltsScore: 6.5,
  satScore: 1320,
  annualBudget: 25_000,
  budgetCurrency: "USD",
};
const aiProfile = toAIProfile(profile);
const program = programs[0];
const assessed = assessProgram(profile, program);
const service = createAIService(provider, { timeoutMs: 30_000 });

const diagnosis = await service.generateDiagnosis({
  profile: aiProfile,
  deterministicDiagnosis: diagnoseProfile(profile),
});
const explanation = await service.generateRecommendationExplanation({
  profile: aiProfile,
  programFacts: program,
  recommendation: {
    fitScore: assessed.fitScore,
    dataCoverage: assessed.dataCoverage,
    breakdown: assessed.breakdown,
    eligibility: assessed.eligibility,
    reasons: assessed.reasons,
    gaps: assessed.gaps,
  },
});

if (providerCalls !== 2 || diagnosis.source !== "ai" || explanation.source !== "ai") {
  throw new Error(`AI smoke failed: calls=${providerCalls} diagnosis=${diagnosis.source} explanation=${explanation.source}`);
}

console.log("AI smoke passed: provider calls=2, diagnosis=ai, explanation=ai");
