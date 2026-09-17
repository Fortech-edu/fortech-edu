"use client";

import { useEffect, useState } from "react";
import { diagnosisFallback, recommendationFallback } from "../../lib/ai/fallback.ts";
import { createAIResultCacheKey } from "../../lib/ai/cache.ts";
import {
  diagnosisExplanationCopy,
  parseDiagnosisResult,
} from "../../lib/ai/diagnosis-presentation.ts";
import {
  toAIProfile,
  validateRecommendationOutput,
} from "../../lib/ai/schemas.ts";
import type { DiagnosisAIOutput } from "../../lib/ai/schemas.ts";
import type { AIResult } from "../../lib/ai/service.ts";
import type { Diagnosis, Recommendation, StudentProfile } from "../../types/admissions.ts";

const pendingRequests = new Map<string, Promise<unknown>>();

export function DiagnosisEnhancement({ profile, diagnosis }: { profile: StudentProfile; diagnosis: Diagnosis }) {
  const aiProfile = toAIProfile(profile);
  const [result, setResult] = useState<AIResult<DiagnosisAIOutput> | null>(null);
  const requestBody = JSON.stringify({ profile: aiProfile });
  const cacheKey = createAIResultCacheKey("diagnosis", requestBody);

  useEffect(() => {
    let active = true;
    const currentInput = {
      profile: toAIProfile(profile),
      deterministicDiagnosis: diagnosis,
    };
    const fallback: AIResult<DiagnosisAIOutput> = {
      content: diagnosisFallback(currentInput),
      source: "fallback",
    };
    requestEnhancement(cacheKey, "/api/ai/diagnosis", requestBody)
      .then((value: unknown) => {
        if (active) setResult(parseDiagnosisResult(value, currentInput) ?? fallback);
      })
      .catch(() => { if (active) setResult(fallback); });
    return () => {
      active = false;
    };
  }, [cacheKey, diagnosis, profile, requestBody]);

  const copy = diagnosisExplanationCopy(result?.source ?? null);

  return (
    <section className="rounded-3xl border border-sand-300 bg-sand-100/70 p-5 shadow-[0_16px_45px_rgba(23,52,41,.05)] sm:p-7" aria-labelledby="diagnosis-explanation-title">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm" aria-hidden="true">✦</span>
        <div>
          <h2 id="diagnosis-explanation-title" className="text-lg font-semibold text-forest-900">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{copy.disclosure}</p>
        </div>
      </div>

      <div className="mt-5 min-h-28" aria-live="polite" aria-atomic="true">
        {result === null ? (
          <p className="flex items-center gap-2 text-sm font-medium text-forest-700" role="status">
            <span aria-hidden="true">✦</span>
            Creating an AI-assisted explanation…
          </p>
        ) : (
          <>
            <p className="max-w-3xl leading-7 text-ink">{result.content.summary}</p>
            {result.source === "ai" && result.content.focus.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">AI focus</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-ink">
                  {result.content.focus.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">→</span><span>{item}</span></li>)}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>

      <p className="border-t border-sand-300 pt-4 text-xs leading-5 text-muted">
        AI explains this analysis. It does not calculate Fit Score or eligibility and cannot change deterministic results.
      </p>
    </section>
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
