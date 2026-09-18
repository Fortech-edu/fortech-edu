export function createAIResultCacheKey(kind: "diagnosis" | "recommendation", requestBody: string) {
  return `admission-journey:v2:ai:${kind}:${requestBody}`;
}
