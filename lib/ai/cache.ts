export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const AI_CACHE_NAMESPACE = "admission-journey:v3:ai";

export function createAIResultCacheKey(kind: "diagnosis" | "recommendation", requestBody: string): string {
  return `${AI_CACHE_NAMESPACE}:${kind}:${requestBody}`;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Reads a cached AI result from browser session storage or provided storage.
 * - If cached result has source === "fallback", removes it and returns null (forcing a fresh request).
 * - Malformed cached values (invalid JSON, non-object, missing content/source) are safely purged and ignored.
 * - Legacy v2 cache keys are purged and ignored.
 * - ONLY returns valid cached results where source === "ai".
 */
export function getCachedAIResult<T = unknown>(
  cacheKey: string,
  storage: StorageLike | null = getDefaultStorage(),
): T | null {
  if (!storage) return null;

  try {
    // Invalidate and purge obsolete v2 keys if encountered
    if (cacheKey.includes(":v2:")) {
      try {
        storage.removeItem(cacheKey);
      } catch {
        // Continue safely if storage throws
      }
      return null;
    }

    const raw = storage.getItem(cacheKey);
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON: purge and ignore safely
      try {
        storage.removeItem(cacheKey);
      } catch {
        // Continue safely if storage throws
      }
      return null;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      try {
        storage.removeItem(cacheKey);
      } catch {
        // Continue safely if storage throws
      }
      return null;
    }

    const candidate = parsed as { source?: unknown; content?: unknown };

    // Never accept or retain fallback entries: remove immediately and return null
    if (candidate.source === "fallback") {
      try {
        storage.removeItem(cacheKey);
      } catch {
        // Continue safely if storage throws
      }
      return null;
    }

    // Only source === "ai" with content is a valid AI cache entry
    if (candidate.source !== "ai" || !("content" in candidate)) {
      try {
        storage.removeItem(cacheKey);
      } catch {
        // Continue safely if storage throws
      }
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Stores an AI response in session storage.
 * - ONLY caches successful AI responses where result.source === "ai".
 * - NEVER caches responses where source === "fallback" or non-ai.
 */
export function setCachedAIResult(
  cacheKey: string,
  result: unknown,
  storage: StorageLike | null = getDefaultStorage(),
): boolean {
  if (!storage) return false;

  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return false;
  }

  const candidate = result as { source?: unknown; content?: unknown };

  // ONLY cache successful AI responses where result.source === "ai"
  // NEVER cache source === "fallback"
  if (candidate.source !== "ai" || !("content" in candidate)) {
    return false;
  }

  try {
    storage.setItem(cacheKey, JSON.stringify(result));
    return true;
  } catch {
    return false;
  }
}

export const getAICache = getCachedAIResult;
export const setAICache = setCachedAIResult;
