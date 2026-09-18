import {
  diagnosisFallback,
  recommendationFallback,
  roadmapTaskFallback,
} from "./fallback.ts";
import { AIProviderError, type AIProvider } from "./provider.ts";
import { diagnosisPrompt, recommendationPrompt, roadmapTaskPrompt } from "./prompts.ts";
import {
  isFactuallySafe,
  validateDiagnosisOutput,
  validateRecommendationOutput,
  validateRoadmapTaskOutput,
} from "./schemas.ts";
import type {
  DiagnosisAIInput,
  DiagnosisAIOutput,
  RecommendationAIInput,
  RecommendationAIOutput,
  RoadmapTaskAIInput,
  RoadmapTaskAIOutput,
} from "./schemas.ts";

export type AIResult<T> = { content: T; source: "ai" | "fallback" };

export interface AIService {
  generateDiagnosis(input: DiagnosisAIInput): Promise<AIResult<DiagnosisAIOutput>>;
  generateRecommendationExplanation(input: RecommendationAIInput): Promise<AIResult<RecommendationAIOutput>>;
  rewriteRoadmapTask(input: RoadmapTaskAIInput): Promise<AIResult<RoadmapTaskAIOutput>>;
}

type AIInput = DiagnosisAIInput | RecommendationAIInput | RoadmapTaskAIInput;
type AIOutput = DiagnosisAIOutput | RecommendationAIOutput | RoadmapTaskAIOutput;
type AIKind = "diagnosis" | "explanation" | "roadmap";

export function createAIService(
  provider: AIProvider | null,
  options: { timeoutMs?: number; log?: (message: string) => void } = {},
): AIService {
  const timeoutMs = options.timeoutMs ?? 6_000;
  const log = options.log ?? ((message: string) => console.info(message));

  async function run<TInput extends AIInput, TOutput extends AIOutput>(
    kind: AIKind,
    input: TInput,
    prompt: string,
    validate: (value: unknown) => TOutput | null,
    fallback: (value: TInput) => TOutput,
  ): Promise<AIResult<TOutput>> {
    if (!provider) {
      log(`AI ${kind}: provider_not_configured`);
      return { content: fallback(input), source: "fallback" };
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      log(`AI ${kind}: provider_request_started`);
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error("AIRequestTimeout"));
        }, timeoutMs);
      });
      const raw = await Promise.race([
        provider.generateJson({ systemPrompt: prompt, payload: input, signal: controller.signal }),
        timeout,
      ]);
      const output = validate(raw);
      if (!output) {
        log(`AI ${kind}: provider_invalid_response`);
        return { content: fallback(input), source: "fallback" };
      }
      if (!isFactuallySafe(output, input)) {
        log(`AI ${kind}: provider_unsafe_output`);
        return { content: fallback(input), source: "fallback" };
      }
      log(`AI ${kind}: provider_success`);
      return { content: output, source: "ai" };
    } catch (error) {
      if (timedOut || (error instanceof Error && error.message === "AIRequestTimeout")) {
        log(`AI ${kind}: provider_timeout`);
      } else if (error instanceof AIProviderError) {
        log(`AI ${kind}: ${error.failure}${error.status ? ` status=${error.status}` : ""}`);
      } else {
        log(`AI ${kind}: provider_http_error`);
      }
      return { content: fallback(input), source: "fallback" };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    generateDiagnosis: (input) => run("diagnosis", input, diagnosisPrompt, validateDiagnosisOutput, diagnosisFallback),
    generateRecommendationExplanation: (input) => run("explanation", input, recommendationPrompt, validateRecommendationOutput, recommendationFallback),
    rewriteRoadmapTask: (input) => run("roadmap", input, roadmapTaskPrompt, validateRoadmapTaskOutput, roadmapTaskFallback),
  };
}
