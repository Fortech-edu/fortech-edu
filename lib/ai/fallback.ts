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
  const nextAction = input.nextAction;
  const strengths = input.requirementCoverage
    .filter(({ status }) => status === "Match")
    .slice(0, 3)
    .map(({ label }) => `${label} matches the published requirement for this program.`);
  const uncertainties = input.verificationItems.slice(0, 3).map(
    ({ label, detail }) => `${label} still needs verification. ${detail}`,
  );

  return {
    summary: gap
      ? `For ${target}, the one confirmed priority is ${gap.label}: ${gap.profileValue} current against ${gap.programValue}. ${gap.detail} Everything else in your supplied profile is either on track or awaiting verification.`
      : `For ${target}, no provided value is below a directly comparable published minimum. This does not guarantee admission. The fastest progress now comes from resolving the verification items below.`,
    strengths,
    uncertainties,
    priority: gap
      ? `${gap.label} is the priority: ${gap.profileValue} current against ${gap.programValue}, so closing it changes your confirmed readiness the most. ${gap.detail}`
      : nextAction
        ? `${nextAction.title}. ${nextAction.description}`
        : "No confirmed gap or verification item is currently recorded for this target.",
    nextSteps: nextAction ? [`${nextAction.title}. ${nextAction.description}`] : [],
    advisorNote: gap
      ? `Concentrate on ${gap.label} before anything else; the remaining verification items matter, but none of them is your current bottleneck.`
      : `Nothing supplied is blocking right now. Keep your confirmed facts up to date and clear the verification items when convenient; none of them should delay you.`,
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
