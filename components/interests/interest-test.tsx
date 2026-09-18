"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  answerOptions,
  hollandCode,
  interestItems,
  riasecTypes,
  scoreInterests,
  suggestDirection,
  type Answer,
  type Answers,
} from "../../lib/interests/riasec.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import {
  clearStoredInterests,
  loadStoredInterests,
  saveStoredInterests,
} from "../../lib/storage/interests.ts";

const total = interestItems.length;

export function InterestTest() {
  const ready = useClientReady();
  const [answers, setAnswers] = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);
  const [unanswered, setUnanswered] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = loadStoredInterests();
    if (!stored) return;
    setAnswers(stored.answers);
    if (Object.keys(stored.answers).length === total) setShowResult(true);
  }, []);

  if (!ready) {
    return (
      <div className="editorial-section p-8 text-center text-muted">Loading the interest check…</div>
    );
  }

  const answeredCount = interestItems.filter(({ id }) => answers[id] !== undefined).length;
  const complete = answeredCount === total;

  function select(id: string, value: Answer) {
    setAnswers((previous) => {
      const next = { ...previous, [id]: value };
      saveStoredInterests(next);
      return next;
    });
    setUnanswered((previous) => previous.filter((itemId) => itemId !== id));
  }

  function submit() {
    const missing = interestItems.filter(({ id }) => answers[id] === undefined).map(({ id }) => id);
    setUnanswered(missing);

    if (missing.length > 0) {
      document.getElementById(`item-${missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setShowResult(true);
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function restart() {
    setAnswers({});
    setUnanswered([]);
    setShowResult(false);
    clearStoredInterests();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="interest-test space-y-8">
      <section className="product-hero" aria-labelledby="interest-title">
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,.9fr)]">
          <div className="p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-100">Interest check</p>
            <h1 id="interest-title" className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.92] sm:text-6xl lg:text-7xl">
              Which direction fits how you like to work?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-forest-100 sm:text-lg">
              Thirty short statements based on Holland&rsquo;s RIASEC model. It takes about four minutes and it is a
              starting point for the conversation, not a verdict.
            </p>
          </div>

          <div className="border-t border-white/15 bg-white/7 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-100">What this is and is not</p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-white">
              <li>It groups your answers into six interest types and shows which score highest.</li>
              <li>It is not a validated psychological assessment and it does not predict admission.</li>
              <li>It never changes your Fit Score or eligibility &mdash; matching stays deterministic.</li>
            </ul>
          </div>
        </div>
      </section>

      {!showResult ? (
        <>
          <div
            className="sticky top-[72px] z-40 -mx-5 border-y border-black/15 bg-[color:var(--page)]/95 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-ink">
              <span>
                {answeredCount} of {total} answered
              </span>
              <span className="text-muted">{Math.round((answeredCount / total) * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[var(--accent-deep)] transition-[width] duration-300"
                style={{ width: `${(answeredCount / total) * 100}%` }}
              />
            </div>
          </div>

          <section className="editorial-section p-6 sm:p-8" aria-labelledby="statements-title">
            <h2 id="statements-title" className="text-2xl font-semibold tracking-tight text-forest-900">
              How much does each statement sound like you?
            </h2>
            <p className="mt-2 max-w-2xl leading-7 text-muted">
              Answer for what you enjoy, not for what you are already good at. Every statement needs an answer.
            </p>

            <ol className="mt-7 space-y-0">
              {interestItems.map((item, index) => {
                const value = answers[item.id];
                const missing = unanswered.includes(item.id);

                return (
                  <li
                    key={item.id}
                    id={`item-${item.id}`}
                    className={`border-t border-black/10 py-5 first:border-t-0 first:pt-0 ${
                      missing ? "-mx-3 rounded-2xl border-t-transparent bg-red-50/70 px-3" : ""
                    }`}
                  >
                    <fieldset>
                      <legend className="flex gap-3 text-base leading-7 text-ink">
                        <span className="shrink-0 font-semibold text-muted" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{item.text}</span>
                      </legend>
                      <div className="mt-3 flex flex-wrap gap-2 sm:ml-9">
                        {answerOptions.map((option) => {
                          const selected = value === option.value;
                          return (
                            <label
                              key={option.value}
                              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-sm font-semibold transition ${
                                selected
                                  ? "border-transparent bg-[var(--dark)] text-white"
                                  : "border-forest-200 bg-white text-ink hover:border-[var(--accent-deep)]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={item.id}
                                value={option.value}
                                checked={selected}
                                onChange={() => select(item.id, option.value)}
                                className="sr-only"
                              />
                              {option.label}
                            </label>
                          );
                        })}
                      </div>
                      {missing ? (
                        <p className="mt-2 text-sm font-medium text-red-700 sm:ml-9">Needs an answer.</p>
                      ) : null}
                    </fieldset>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="product-cta flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-xl font-semibold text-forest-900">
                {complete ? "All statements answered" : `${total - answeredCount} statements left`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Your answers stay in this browser. Nothing is sent anywhere and nothing in your admission profile changes.
              </p>
              {unanswered.length > 0 ? (
                <p id="interest-submit-error" className="mt-3 text-sm font-medium text-red-700" role="alert">
                  {unanswered.length} {unanswered.length === 1 ? "statement still needs" : "statements still need"} an
                  answer. They are highlighted above.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={submit}
              aria-describedby={unanswered.length > 0 ? "interest-submit-error" : undefined}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              See my result
            </button>
          </section>
        </>
      ) : (
        <div ref={resultRef}>
          <InterestResult answers={answers} onRestart={restart} />
        </div>
      )}
    </div>
  );
}

function InterestResult({ answers, onRestart }: { answers: Answers; onRestart: () => void }) {
  const scores = scoreInterests(answers);
  const code = hollandCode(scores);
  const suggestion = suggestDirection(scores);
  const top = scores.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="editorial-section p-6 sm:p-8" aria-labelledby="result-title">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Your result</p>
        <h2 id="result-title" className="mt-2 text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          Your Holland code is {code}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          The code is simply your three highest-scoring interest types, in order:{" "}
          {top.map(({ type }) => riasecTypes[type].label).join(", ")}.
        </p>

        <ul className="mt-7 space-y-4">
          {scores.map(({ type, score, max }) => (
            <li key={type}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-semibold text-ink">
                  <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">
                    {type}
                  </span>
                  {riasecTypes[type].label}
                </p>
                <p className="shrink-0 text-sm font-semibold text-muted">
                  {score} / {max}
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[var(--accent-deep)]"
                  style={{ width: `${max === 0 ? 0 : (score / max) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{riasecTypes[type].blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="accent-section p-6 sm:p-8" aria-labelledby="direction-title">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Suggested starting point</p>
        <h2 id="direction-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">
          {suggestion.headline}
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-ink/80">{suggestion.explanation}</p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          This is a suggestion about where to start looking. Program matching still runs only on the verified data in your
          admission profile, and you can choose any direction you want in onboarding.
        </p>
      </section>

      <section className="product-cta flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-semibold text-forest-900">
            {suggestion.direction ? `Continue with ${suggestion.direction} in mind` : "Continue to your admission profile"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Onboarding asks for your direction, academics and preferences. You select the field yourself &mdash; this result
            does not fill it in for you.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-forest-200 bg-white px-6 font-semibold text-ink hover:border-[var(--accent-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
          >
            Take it again
          </button>
          <Link
            href="/onboarding"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
          >
            Build my profile
          </Link>
        </div>
      </section>

      <section className="editorial-section p-6 sm:p-8" aria-labelledby="method-title">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Method</p>
        <h2 id="method-title" className="mt-2 text-2xl font-semibold tracking-tight text-forest-900">
          How this result was calculated
        </h2>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-ink">
          <li className="flex gap-3 border-t border-black/10 pt-4 first:border-t-0 first:pt-0">
            <span aria-hidden="true">1.</span>
            <span>
              Each of the {interestItems.length} statements belongs to one of the six RIASEC types, five statements per
              type.
            </span>
          </li>
          <li className="flex gap-3 border-t border-black/10 pt-4">
            <span aria-hidden="true">2.</span>
            <span>Answers score 0, 1 or 2 points and are summed per type &mdash; no weighting, no hidden model.</span>
          </li>
          <li className="flex gap-3 border-t border-black/10 pt-4">
            <span aria-hidden="true">3.</span>
            <span>
              The three highest types form your code. Ties keep the fixed R-I-A-S-E-C order, so the same answers always give
              the same result.
            </span>
          </li>
          <li className="flex gap-3 border-t border-black/10 pt-4">
            <span aria-hidden="true">4.</span>
            <span>
              The model comes from John Holland&rsquo;s theory of career choice. A free public instrument built on it is the
              O*NET Interest Profiler; our version is shorter and is not a substitute for it.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

