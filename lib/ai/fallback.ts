import { eligibilityLabels } from "../admissions/presentation.ts";
import type {
  DiagnosisAIInput,
  DiagnosisAIOutput,
  RecommendationAIInput,
  RecommendationAIOutput,
  RoadmapTaskAIInput,
  RoadmapTaskAIOutput,
} from "./schemas.ts";

export function diagnosisFallback(input: DiagnosisAIInput): DiagnosisAIOutput {
  const { deterministicDiagnosis } = input;
  return {
    summary: deterministicDiagnosis.gaps.length
      ? "Your profile has a useful foundation, with a few details and actions still to address."
      : "Your profile has a clear foundation for exploring relevant programs.",
    strengths: deterministicDiagnosis.strengths.slice(0, 4),
    actions: [...deterministicDiagnosis.gaps, ...deterministicDiagnosis.missingInformation.map((item) => `Verify ${item.toLowerCase()}`)].slice(0, 4),
  };
}

export function recommendationFallback(input: RecommendationAIInput): RecommendationAIOutput {
  const { recommendation } = input;
  return {
    summary: `This program has a ${recommendation.fitScore} out of 100 profile match with ${recommendation.dataCoverage}% data coverage. Its current status is ${eligibilityLabels[recommendation.eligibility].toLowerCase()}.`,
    whyItFits: recommendation.reasons.slice(0, 4),
    watchOutFor: recommendation.gaps.slice(0, 4),
  };
}

export function roadmapTaskFallback(input: RoadmapTaskAIInput): RoadmapTaskAIOutput {
  return { title: input.task.title, description: input.task.description };
}
