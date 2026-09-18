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
  toDiagnosisAIInput,
  validateRecommendationOutput,
} from "../../lib/ai/schemas.ts";
import type { DiagnosisAIOutput, RecommendationAIOutput } from "../../lib/ai/schemas.ts";
import type { AIResult } from "../../lib/ai/service.ts";
import type { Recommendation, StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import type { TargetDiagnosis } from "../../lib/admissions/diagnosis.ts";

const pendingRequests = new Map<string, Promise<unknown>>();

export function DiagnosisEnhancement({
  profile,
  program,
  diagnosis,
}: {
  profile: StudentProfile;
  program: UniversityProgram;
  diagnosis: TargetDiagnosis;
}) {
  const aiProfile = toAIProfile(profile);
  const [result, setResult] = useState<AIResult<DiagnosisAIOutput> | null>(null);
  const requestBody = JSON.stringify({ profile: aiProfile, programId: program.id });
  const cacheKey = createAIResultCacheKey("diagnosis", requestBody);

  useEffect(() => {
    let active = true;
    const currentInput = toDiagnosisAIInput(profile, program, diagnosis);
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
  }, [cacheKey, diagnosis, profile, program, requestBody]);

  const copy = diagnosisExplanationCopy(result?.source ?? null);

  return (
    <section className="accent-section p-5 sm:p-7" aria-labelledby="diagnosis-explanation-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm" aria-hidden="true">✦</span>
          <div>
            <h2 id="diagnosis-explanation-title" className="text-lg font-semibold text-forest-900">{copy.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.disclosure}</p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-forest-700">
          {result === null ? "Preparing insight…" : result.source === "ai" ? "AI-assisted" : "Deterministic summary"}
        </span>
      </div>

      <div className="mt-5" aria-live="polite" aria-atomic="true">
        {result === null ? (
          <p className="flex items-center gap-2 text-sm font-medium text-forest-700" role="status">
            <span aria-hidden="true">✦</span>
            Reading your deterministic results…
          </p>
        ) : (
          <>
            <p className="max-w-3xl leading-7 text-ink">{result.content.summary}</p>

            {result.content.priority ? (
              <div className="mt-4 rounded-xl border border-forest-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">Top priority</p>
                <p className="mt-1.5 text-sm font-semibold leading-6 text-ink">{result.content.priority}</p>
              </div>
            ) : null}

            {result.content.nextSteps.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">Recommended next steps</p>
                <ol className="mt-2 space-y-2 text-sm leading-6 text-ink">
                  {result.content.nextSteps.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span aria-hidden="true" className="font-semibold text-forest-700">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <details className="group mt-4 rounded-xl border border-forest-100 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 [&::-webkit-details-marker]:hidden">
                View full analysis
                <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-4 border-t border-forest-100 px-4 py-4">
                {result.content.strengths.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">Confirmed strengths</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-ink">
                      {result.content.strengths.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="font-semibold text-forest-700">✓</span><span>{item}</span></li>)}
                    </ul>
                  </div>
                ) : null}
                {result.content.uncertainties.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">Still uncertain</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-ink">
                      {result.content.uncertainties.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="font-semibold text-muted">?</span><span>{item}</span></li>)}
                    </ul>
                  </div>
                ) : null}
                {result.content.advisorNote ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">Advisor note</p>
                    <p className="mt-2 text-sm leading-6 text-ink">{result.content.advisorNote}</p>
                  </div>
                ) : null}
              </div>
            </details>
          </>
        )}
      </div>

      <p className="border-t border-sand-300 pt-4 text-xs leading-5 text-muted">
        The advisor interprets your results. It cannot change requirements, eligibility, Fit Score, or the roadmap.
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
  const [result, setResult] = useState<AIResult<RecommendationAIOutput>>(() => ({
    content: recommendationFallback(fallbackInput),
    source: "fallback",
  }));
  const [loading, setLoading] = useState(true);
  const requestBody = JSON.stringify({ profile: aiProfile, programId: recommendation.program.id });
  const cacheKey = createAIResultCacheKey("recommendation", requestBody);

  useEffect(() => {
    let active = true;
    requestEnhancement(cacheKey, "/api/ai/explanation", requestBody)
      .then((result: unknown) => {
        if (typeof result !== "object" || result === null || !("content" in result)) return;
        const validated = validateRecommendationOutput((result as { content: unknown }).content);
        const source = (result as { source?: unknown }).source;
        if (active && validated && (source === "ai" || source === "fallback")) setResult({ content: validated, source });
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [cacheKey, requestBody]);

  return (
    <section className="accent-section mt-8 p-5 sm:p-7" aria-labelledby="ai-fit-title" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-fit-title" className="text-xl font-semibold text-forest-900">Personalized explanation</h2>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-forest-700">{loading ? "Preparing explanation…" : result.source === "ai" ? "AI-assisted" : "Based on match facts"}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{result.source === "ai" ? "AI explains the deterministic match below; it cannot change Fit Score, eligibility, or requirements." : "This explanation uses only the deterministic match facts shown on this page."}</p>
      <p className="mt-3 text-sm leading-6 text-ink">{result.content.summary}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ExplanationList title="What aligns" items={result.content.whyItFits} />
        <ExplanationList title="What to check" items={result.content.watchOutFor} />
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
