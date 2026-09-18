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
  const { programName, universityName } = input.programFacts;
  const target = `${programName} at ${universityName}`;
  const gap = input.biggestConfirmedGap;
  const verification = input.verificationItems[0];
  const nextAction = input.nextAction;
  return {
    summary: gap
      ? `For ${target}, ${gap.label} is a confirmed gap: ${gap.profileValue} current against ${gap.programValue}. ${gap.detail}`
      : `For ${target}, no provided value is below a directly comparable published minimum. This does not guarantee admission.`,
    focus: [
      nextAction ? `Next action: ${nextAction.title}. ${nextAction.description}` : null,
      verification ? `Needs verification: ${verification.label}. ${verification.detail}` : null,
    ].filter((item): item is string => item !== null),
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
