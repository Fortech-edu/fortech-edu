export function createAIResultCacheKey(kind: "diagnosis" | "recommendation", requestBody: string) {
  return `admission-journey:v1:ai:${kind}:${requestBody}`;
}
