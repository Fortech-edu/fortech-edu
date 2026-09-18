import type { AIResult } from "./service.ts";
import {
  isFactuallySafe,
  validateDiagnosisOutput,
} from "./schemas.ts";
import type {
  DiagnosisAIInput,
  DiagnosisAIOutput,
} from "./schemas.ts";

export function parseDiagnosisResult(
  value: unknown,
  input: DiagnosisAIInput,
): AIResult<DiagnosisAIOutput> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (result.source !== "ai" && result.source !== "fallback") return null;
  const content = validateDiagnosisOutput(result.content);
  return content && isFactuallySafe(content, input)
    ? { content, source: result.source }
    : null;
}

export function diagnosisExplanationCopy(source: "ai" | "fallback" | null) {
  if (source === "ai") {
    return {
      title: "Your AI advisor",
      disclosure: "Interprets your deterministic diagnosis. It cannot change requirements, eligibility, Fit Score, or your roadmap.",
    };
  }
  if (source === "fallback") {
    return {
      title: "Your AI advisor",
      disclosure: "The AI advisor is unavailable; this is the deterministic summary and your admissions analysis is unchanged.",
    };
  }
  return {
    title: "Your AI advisor",
    disclosure: "Preparing an interpretation of your deterministic results.",
  };
}
