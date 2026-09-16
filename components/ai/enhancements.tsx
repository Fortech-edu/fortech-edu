"use client";

import { useEffect, useState } from "react";
import { diagnosisFallback, recommendationFallback } from "../../lib/ai/fallback.ts";
import { createAIResultCacheKey } from "../../lib/ai/cache.ts";
import {
  toAIProfile,
  validateDiagnosisOutput,
  validateRecommendationOutput,
} from "../../lib/ai/schemas.ts";
import type { Diagnosis, Recommendation, StudentProfile } from "../../types/admissions.ts";

const pendingRequests = new Map<string, Promise<unknown>>();

export function DiagnosisEnhancement({ profile, diagnosis }: { profile: StudentProfile; diagnosis: Diagnosis }) {
  const aiProfile = toAIProfile(profile);
  const input = { profile: aiProfile, deterministicDiagnosis: diagnosis };
  const [content, setContent] = useState(() => diagnosisFallback(input));
  const [loading, setLoading] = useState(true);
  const requestBody = JSON.stringify({ profile: aiProfile });
  const cacheKey = createAIResultCacheKey("diagnosis", requestBody);

  useEffect(() => {
    let active = true;
    requestEnhancement(cacheKey, "/api/ai/diagnosis", requestBody)
      .then((result: unknown) => {
        if (typeof result !== "object" || result === null || !("content" in result)) return;
        const validated = validateDiagnosisOutput((result as { content: unknown }).content);
        if (active && validated) setContent(validated);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [cacheKey, requestBody]);

  return (
    <div className="mt-5 rounded-2xl border border-forest-100 bg-white p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-forest-900">Personalized summary</h2>
        {loading && <span className="text-xs font-medium text-muted">Personalizing explanation…</span>}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{content.summary}</p>
    </div>
  );
}

export function RecommendationEnhancement({ profile, recommendation }: { profile: StudentProfile; recommendation: Recommendation }) {
  const aiProfile = toAIProfile(profile);
  const fallbackInput = {
    profile: aiProfile,
    programFacts: recommendation.program,
    recommendation: {
      fitScore: recommendation.fitScore,
      dataCoverage: recommendation.dataCoverage,
      breakdown: recommendation.breakdown,
      eligibility: recommendation.eligibility,
      reasons: recommendation.reasons,
      gaps: recommendation.gaps,
    },
  };
  const [content, setContent] = useState(() => recommendationFallback(fallbackInput));
  const [loading, setLoading] = useState(true);
  const requestBody = JSON.stringify({ profile: aiProfile, programId: recommendation.program.id });
  const cacheKey = createAIResultCacheKey("recommendation", requestBody);

  useEffect(() => {
    let active = true;
    requestEnhancement(cacheKey, "/api/ai/explanation", requestBody)
      .then((result: unknown) => {
        if (typeof result !== "object" || result === null || !("content" in result)) return;
        const validated = validateRecommendationOutput((result as { content: unknown }).content);
        if (active && validated) setContent(validated);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [cacheKey, requestBody]);

  return (
    <section className="mt-7 rounded-2xl bg-forest-50 p-5" aria-labelledby="ai-fit-title" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-fit-title" className="text-xl font-semibold text-forest-900">Why this fits your profile</h2>
        {loading && <span className="text-xs font-medium text-muted">Personalizing explanation…</span>}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{content.summary}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ExplanationList title="What aligns" items={content.whyItFits} />
        <ExplanationList title="What to check" items={content.watchOutFor} />
      </div>
    </section>
  );
}

function ExplanationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-forest-900">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-ink">
        {items.length ? items.map((item) => <li key={item}>• {item}</li>) : <li className="text-muted">Nothing additional to show.</li>}
      </ul>
    </div>
  );
}

function requestEnhancement(cacheKey: string, endpoint: string, body: string) {
  try {
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) return Promise.resolve(JSON.parse(cached) as unknown);
  } catch {
    // Continue without cache when browser storage is unavailable.
  }

  const existing = pendingRequests.get(cacheKey);
  if (existing) return existing;

  const request = fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("RequestFailed")))
    .then((result: unknown) => {
      try {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        // The deterministic content remains available without cache.
      }
      return result;
    })
    .finally(() => pendingRequests.delete(cacheKey));

  pendingRequests.set(cacheKey, request);
  return request;
}
