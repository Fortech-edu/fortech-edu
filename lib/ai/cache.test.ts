import assert from "node:assert/strict";
import test from "node:test";
import {
  createAIResultCacheKey,
  getCachedAIResult,
  setCachedAIResult,
} from "./cache.ts";
import type { StorageLike } from "./cache.ts";

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

test("source:'ai' can be cached", () => {
  const storage = new MemoryStorage();
  const key = createAIResultCacheKey("diagnosis", '{"programId":"lut-se"}');
  const aiResult = {
    source: "ai",
    content: {
      summary: "AI analysis of your admission profile",
      strengths: ["Strong academic background"],
      uncertainties: [],
      priority: "Prepare for IELTS",
      nextSteps: ["Register for upcoming IELTS test"],
      advisorNote: "Excellent target alignment",
    },
  };

  const cached = setCachedAIResult(key, aiResult, storage);
  assert.equal(cached, true);
  assert.ok(storage.getItem(key));

  const retrieved = getCachedAIResult(key, storage);
  assert.deepEqual(retrieved, aiResult);
});

test("source:'fallback' is not cached", () => {
  const storage = new MemoryStorage();
  const key = createAIResultCacheKey("diagnosis", '{"programId":"lut-se"}');
  const fallbackResult = {
    source: "fallback",
    content: {
      summary: "Deterministic summary of requirements",
      strengths: [],
      uncertainties: [],
      priority: null,
      nextSteps: [],
      advisorNote: null,
    },
  };

  const cached = setCachedAIResult(key, fallbackResult, storage);
  assert.equal(cached, false);
  assert.equal(storage.getItem(key), null);
  assert.equal(getCachedAIResult(key, storage), null);
});

test("stale fallback cache is ignored", () => {
  const storage = new MemoryStorage();
  const key = createAIResultCacheKey("diagnosis", '{"programId":"lut-se"}');
  const staleFallback = {
    source: "fallback",
    content: { summary: "Outdated deterministic summary from a previous outage" },
  };

  // Simulate poisoned storage entry
  storage.setItem(key, JSON.stringify(staleFallback));
  assert.ok(storage.getItem(key));

  // When reading, stale fallback must return null and be purged from storage
  const result = getCachedAIResult(key, storage);
  assert.equal(result, null);
  assert.equal(storage.getItem(key), null, "Stale fallback entry should be removed from storage");
});

test("malformed cache is ignored safely", () => {
  const storage = new MemoryStorage();
  const key = createAIResultCacheKey("recommendation", '{"programId":"lut-se"}');

  // Case 1: Invalid JSON
  storage.setItem(key, "{not-json");
  assert.equal(getCachedAIResult(key, storage), null);
  assert.equal(storage.getItem(key), null, "Invalid JSON should be removed");

  // Case 2: Primitive string
  storage.setItem(key, JSON.stringify("plain-string"));
  assert.equal(getCachedAIResult(key, storage), null);
  assert.equal(storage.getItem(key), null, "Primitive string should be removed");

  // Case 3: Array instead of object
  storage.setItem(key, JSON.stringify([1, 2, 3]));
  assert.equal(getCachedAIResult(key, storage), null);
  assert.equal(storage.getItem(key), null, "Array should be removed");

  // Case 4: Missing content property
  storage.setItem(key, JSON.stringify({ source: "ai" }));
  assert.equal(getCachedAIResult(key, storage), null);
  assert.equal(storage.getItem(key), null, "Object without content should be removed");

  // Case 5: Missing or unexpected source property
  storage.setItem(key, JSON.stringify({ content: { summary: "Test" }, source: "unknown" }));
  assert.equal(getCachedAIResult(key, storage), null);
  assert.equal(storage.getItem(key), null, "Unknown source should be removed");

  // Case 6: Non-object passed to setCachedAIResult
  assert.equal(setCachedAIResult(key, null, storage), false);
  assert.equal(setCachedAIResult(key, "invalid", storage), false);

  // Case 7: Storage access exceptions handled gracefully without crashing
  const throwingStorage: StorageLike = {
    getItem: () => {
      throw new Error("SecurityError: Access is denied");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError: Access is denied");
    },
  };
  assert.equal(getCachedAIResult(key, throwingStorage), null);
  assert.equal(setCachedAIResult(key, { source: "ai", content: {} }, throwingStorage), false);
});

test("v2 cache keys are no longer used", () => {
  const body = '{"profile":{},"programId":"lut-se"}';
  const diagnosisKey = createAIResultCacheKey("diagnosis", body);
  const recommendationKey = createAIResultCacheKey("recommendation", body);

  // Verifies namespace was bumped to v3
  assert.match(diagnosisKey, /^admission-journey:v3:ai:diagnosis:/);
  assert.match(recommendationKey, /^admission-journey:v3:ai:recommendation:/);
  assert.equal(diagnosisKey.includes(":v2:"), false);
  assert.equal(recommendationKey.includes(":v2:"), false);

  // Existing v2 cache entry in storage is ignored by v3 cache queries
  const storage = new MemoryStorage();
  const oldV2Key = `admission-journey:v2:ai:diagnosis:${body}`;
  storage.setItem(
    oldV2Key,
    JSON.stringify({ source: "ai", content: { summary: "Old v2 cache item" } }),
  );

  // Querying using the generated key (v3) returns null
  assert.equal(getCachedAIResult(diagnosisKey, storage), null);

  // Even if an obsolete v2 key is directly queried, getCachedAIResult ignores and purges it
  assert.equal(getCachedAIResult(oldV2Key, storage), null);
  assert.equal(storage.getItem(oldV2Key), null, "Obsolete v2 key should be purged upon access");
});
