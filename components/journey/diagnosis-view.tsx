"use client";

import Link from "next/link";
import { diagnoseProfile } from "../../lib/admissions/diagnosis.ts";
import { loadStoredProfile } from "../../lib/storage/profile.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { DiagnosisEnhancement } from "../ai/enhancements.tsx";

function show(value: string | null) {
  return value ?? "Unknown";
}

export function DiagnosisView() {
  const ready = useClientReady();

  if (!ready) {
    return (
      <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center text-muted shadow-sm">
        Loading your profile diagnosis…
      </div>
    );
  }

  const profile = loadStoredProfile()?.profile ?? null;

  if (!profile) {
    return (
      <div className="rounded-3xl border border-forest-100 bg-white p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sand-100 text-xl" aria-hidden="true">
          ↗
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-forest-900">Build your profile first</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
          We need your study goals and available academic information before creating a diagnosis.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
        >
          Start onboarding
        </Link>
      </div>
    );
  }

  const diagnosis = diagnoseProfile(profile);
  const budget =
    profile.annualBudget === null
      ? "Unknown"
      : `${profile.budgetCurrency ?? "USD"} ${profile.annualBudget.toLocaleString()}`;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-forest-100 bg-white p-6 shadow-[0_18px_60px_rgba(23,52,41,.07)] sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-forest-600">Profile diagnosis</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          You have a useful starting point.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          This diagnosis summarizes the information you provided. Unknown details stay unknown until you add them.
        </p>

        <div className="mt-7 rounded-2xl bg-forest-50 p-5">
          <h2 className="text-lg font-semibold text-forest-900">Profile summary</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Intended field", show(profile.intendedField)],
              ["Target degree", show(profile.targetDegree)],
              ["Preferred countries", profile.preferredCountries.join(", ") || "No preference added"],
              ["Annual budget", budget],
              ["Target intake", show(profile.targetIntake)],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-muted">{term}</dt>
                <dd className="mt-1 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <DiagnosisEnhancement profile={profile} diagnosis={diagnosis} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <DiagnosisCard
          title="Strengths"
          description="Information that already helps your admission planning."
          items={diagnosis.strengths}
          tone="positive"
        />
        <DiagnosisCard
          title="Gaps & actions"
          description="Practical details to add or check next."
          items={diagnosis.gaps}
          tone="action"
        />
        <DiagnosisCard
          title="Unknown"
          description="Not counted as failure or assumed to be satisfied."
          items={diagnosis.missingInformation}
          tone="unknown"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-3xl bg-forest-900 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h2 className="text-xl font-semibold text-white">Ready to explore relevant programs?</h2>
          <p className="mt-1 text-sm leading-6 text-forest-100">
            Your saved profile will be used for deterministic matching.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-5 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Edit profile
          </Link>
          <Link
            href="/matches"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 font-semibold text-forest-900 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            See my matches
          </Link>
        </div>
      </div>
    </div>
  );
}

function DiagnosisCard({
  title,
  description,
  items,
  tone,
}: {
  title: string;
  description: string;
  items: string[];
  tone: "positive" | "action" | "unknown";
}) {
  const marker = tone === "positive" ? "✓" : tone === "action" ? "→" : "?";
  const markerClass =
    tone === "positive"
      ? "bg-forest-100 text-forest-700"
      : tone === "action"
        ? "bg-sand-100 text-amber-900"
        : "bg-slate-100 text-slate-600";

  return (
    <section className="rounded-3xl border border-forest-100 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-forest-900">{title}</h2>
      <p className="mt-1 min-h-12 text-sm leading-6 text-muted">{description}</p>
      <ul className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-ink">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${markerClass}`} aria-hidden="true">
                {marker}
              </span>
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted">Nothing to show here yet.</li>
        )}
      </ul>
    </section>
  );
}
