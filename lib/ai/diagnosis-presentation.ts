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
      title: "AI-assisted explanation",
      disclosure: "Based only on your profile and verified information available to the system.",
    };
  }
  if (source === "fallback") {
    return {
      title: "Profile explanation",
      disclosure: "AI is temporarily unavailable. Your deterministic results are unchanged.",
    };
  }
  return {
    title: "AI-assisted explanation",
    disclosure: "Creating a concise explanation while your deterministic analysis stays available.",
  };
}
