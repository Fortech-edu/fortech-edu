import {
  diagnosisFallback,
  recommendationFallback,
  roadmapTaskFallback,
} from "./fallback.ts";
import type { AIProvider } from "./provider.ts";
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

export function createAIService(
  provider: AIProvider | null,
  options: { timeoutMs?: number; log?: (message: string) => void } = {},
): AIService {
  const timeoutMs = options.timeoutMs ?? 6_000;
  const log = options.log ?? ((message: string) => console.error(message));

  async function run<TInput extends AIInput, TOutput extends AIOutput>(
    input: TInput,
    prompt: string,
    validate: (value: unknown) => TOutput | null,
    fallback: (value: TInput) => TOutput,
  ): Promise<AIResult<TOutput>> {
    if (!provider) return { content: fallback(input), source: "fallback" };

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("AIRequestTimeout"));
        }, timeoutMs);
      });
      const raw = await Promise.race([
        provider.generateJson({ systemPrompt: prompt, payload: input, signal: controller.signal }),
        timeout,
      ]);
      const output = validate(raw);
      if (!output || !isFactuallySafe(output, input)) {
        throw new Error("InvalidAIOutput");
      }
      return { content: output, source: "ai" };
    } catch (error) {
      log(`AI enhancement unavailable (${error instanceof Error ? error.name : "UnknownError"})`);
      return { content: fallback(input), source: "fallback" };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    generateDiagnosis: (input) => run(input, diagnosisPrompt, validateDiagnosisOutput, diagnosisFallback),
    generateRecommendationExplanation: (input) => run(input, recommendationPrompt, validateRecommendationOutput, recommendationFallback),
    rewriteRoadmapTask: (input) => run(input, roadmapTaskPrompt, validateRoadmapTaskOutput, roadmapTaskFallback),
  };
}
