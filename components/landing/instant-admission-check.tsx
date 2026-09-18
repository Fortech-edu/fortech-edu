"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProgramById, programs } from "../../data/programs.ts";
import { buildInstantDiagnosis } from "../../lib/admissions/instant-diagnosis.ts";
import {
  buildTargetRequirementFacts,
  formatTuition,
  sourceTypeLabels,
  type ComparisonStatus,
} from "../../lib/admissions/presentation.ts";
import {
  createLandingInstantProfile,
  emptyProfile,
  numberOrNull,
  stepErrors,
} from "../../lib/onboarding.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import {
  loadStoredProfile,
  saveStoredProfile,
  type StoredProfile,
} from "../../lib/storage/profile.ts";
import {
  loadSelectedProgram,
  saveSelectedProgram,
} from "../../lib/storage/selection.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";

const universities = [...new Set(programs.map((p) => p.universityName))].sort();

const inputClass =
  "product-input mt-1.5 min-h-11 w-full border border-forest-200 bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-forest-600";

const statusStyles: Record<ComparisonStatus, string> = {
  Match: "bg-forest-100 text-forest-700",
  "Action needed": "bg-sand-100 text-amber-900 border border-sand-300",
  "Needs verification": "bg-slate-100 text-slate-700",
  "Not required": "bg-forest-50 text-forest-700",
  "Not comparable": "bg-slate-100 text-slate-700",
};

const requirementStateStyles = {
  known: "bg-forest-100 text-forest-700",
  unknown: "bg-slate-100 text-slate-700",
  not_required: "bg-forest-50 text-forest-700",
} as const;

const requirementStateLabels = {
  known: "Published",
  unknown: "Needs verification",
  not_required: "Not required",
} as const;

export function InstantAdmissionCheck() {
  const ready = useClientReady();

  if (!ready) {
    return (
      <div className="rounded-2xl border border-black/15 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-center text-sm text-muted">Loading admission checker…</p>
      </div>
    );
  }

  const initialProfile = loadStoredProfile();
  const initialTargetId = loadSelectedProgram();
  const initialProgram = getProgramById(initialTargetId);

  return (
    <InstantAdmissionCheckContent
      initialProfile={initialProfile}
      initialProgram={initialProgram}
    />
  );
}

function InstantAdmissionCheckContent({
  initialProfile,
  initialProgram,
}: {
  initialProfile: StoredProfile | null;
  initialProgram: UniversityProgram | null | undefined;
}) {
  const router = useRouter();
  const formId = useId();

  const [stored] = useState<StoredProfile | null>(initialProfile);
  const [university, setUniversity] = useState(initialProgram?.universityName ?? "");
  const [programId, setProgramId] = useState(initialProgram?.id ?? "");
  const [currentStudyStage, setCurrentStudyStage] = useState<string | null>(initialProfile?.profile.currentStudyStage ?? null);
  const [gpa, setGpa] = useState<number | null>(initialProfile?.profile.gpa ?? null);
  const [ieltsScore, setIeltsScore] = useState<number | null>(initialProfile?.profile.ieltsScore ?? null);
  const [satScore, setSatScore] = useState<number | null>(initialProfile?.profile.satScore ?? null);
  const [errors, setErrors] = useState<Partial<Record<"gpa" | "ieltsScore" | "satScore", string>>>({});
  const [completedDismissed, setCompletedDismissed] = useState(false);

  const availablePrograms = programs.filter((p) => p.universityName === university);
  const selectedProgram = getProgramById(programId || null);

  // Synchronize target selection: only clean or partial profiles persist on change
  function handleUniversityChange(name: string) {
    setUniversity(name);
    setProgramId("");
    if (!stored?.completed) {
      saveSelectedProgram(null);
    }
  }

  function handleProgramChange(id: string) {
    setProgramId(id);
    if (!stored?.completed) {
      saveSelectedProgram(id || null);
    }
  }

  function selectDemoProgram(id: string) {
    const prog = getProgramById(id);
    if (!prog) return;
    setUniversity(prog.universityName);
    setProgramId(prog.id);
    if (!stored?.completed) {
      saveSelectedProgram(prog.id);
    }
  }

  // Candidate profile for live deterministic comparison
  const candidateProfile: StudentProfile = {
    ...(stored?.profile ?? emptyProfile),
    currentStudyStage,
    gpa,
    ieltsScore,
    satScore,
  };

  // Deterministic Instant Diagnosis (zero AI calls)
  const diagnosis = selectedProgram ? buildInstantDiagnosis(candidateProfile, selectedProgram) : null;
  const requirementFacts = selectedProgram ? buildTargetRequirementFacts(selectedProgram) : [];
  const unresolvedCount = diagnosis
    ? diagnosis.comparisons.filter(({ status }) => status === "Needs verification" || status === "Not comparable").length
    : 0;

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProgram) return;

    // Validate score ranges
    const validationErrors = stepErrors(2, candidateProfile);
    const relevantErrors: Partial<Record<"gpa" | "ieltsScore" | "satScore", string>> = {};
    if (validationErrors.gpa) relevantErrors.gpa = validationErrors.gpa;
    if (validationErrors.ieltsScore) relevantErrors.ieltsScore = validationErrors.ieltsScore;
    if (validationErrors.satScore) relevantErrors.satScore = validationErrors.satScore;

    if (Object.keys(relevantErrors).length > 0) {
      setErrors(relevantErrors);
      return;
    }

    setErrors({});

    // Persist selected target and transfer scores into profile
    const profileWithDefaults = createLandingInstantProfile(
      selectedProgram,
      {
        currentStudyStage,
        gpa,
        ieltsScore,
        satScore,
      },
      stored?.profile,
    );

    saveSelectedProgram(selectedProgram.id);
    saveStoredProfile(profileWithDefaults, 3, false, { flowStage: "onboarding" });
    router.push("/onboarding");
  }

  // Completed user return banner
  if (stored?.completed && !completedDismissed) {
    const completedTarget = getProgramById(loadSelectedProgram());
    return (
      <div className="rounded-2xl border border-black/15 bg-white p-5 shadow-lg sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-4">
          <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-bold text-forest-900">Active Admission Plan</span>
          <span className="text-xs text-muted">Completed profile saved</span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Target program</p>
          <h2 className="mt-1 text-xl font-semibold text-forest-900 sm:text-2xl">
            {completedTarget ? `${completedTarget.programName} @ ${completedTarget.universityName}` : "Your Selected Target"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            You already have a completed profile and deterministic analysis ready.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/diagnosis"
            className="landing-button inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
          >
            View full diagnosis <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest-200 px-5 text-sm font-semibold text-forest-900 hover:border-forest-700"
          >
            View action roadmap
          </Link>
        </div>

        <div className="mt-6 border-t border-black/10 pt-4">
          <button
            type="button"
            onClick={() => setCompletedDismissed(true)}
            className="text-xs font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:text-forest-900"
          >
            Check a different program without changing your saved plan →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleContinue}
      noValidate
      className="landing-check-card rounded-2xl border border-black/15 bg-white p-5 shadow-xl transition sm:p-7"
      aria-label="Instant Admission Check"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-sand-300" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-forest-900">Instant Admission Check</span>
        </div>
        <span className="text-[11px] font-medium text-muted">100% deterministic · No signup</span>
      </div>

      {/* Target selection */}
      <div className="mt-5 space-y-3.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-forest-900" htmlFor={`${formId}-university`}>
            1. Select University
          </label>
          <select
            id={`${formId}-university`}
            className={inputClass}
            value={university}
            onChange={(e) => handleUniversityChange(e.target.value)}
          >
            <option value="">Choose a university ({universities.length} available)</option>
            {universities.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-forest-900" htmlFor={`${formId}-program`}>
            2. Select Program
          </label>
          <select
            id={`${formId}-program`}
            className={inputClass}
            value={programId}
            disabled={!university}
            onChange={(e) => handleProgramChange(e.target.value)}
          >
            <option value="">
              {university ? "Choose a program" : "First select a university above"}
            </option>
            {availablePrograms.map((prog) => (
              <option key={prog.id} value={prog.id}>{prog.programName}</option>
            ))}
          </select>
        </div>

        {!selectedProgram && (
          <div className="rounded-xl border border-forest-100 bg-forest-50/60 p-3.5 text-xs text-muted">
            <span className="font-semibold text-forest-900">Quick explore: </span>
            <button
              type="button"
              onClick={() => selectDemoProgram("lut-software-systems-engineering")}
              className="font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 hover:text-forest-900"
            >
              LUT University · Software & Systems Engineering
            </button>
            {" · "}
            <button
              type="button"
              onClick={() => selectDemoProgram("utwente-technical-computer-science")}
              className="font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 hover:text-forest-900"
            >
              Univ. of Twente · Technical CS
            </button>
          </div>
        )}
      </div>

      {/* When a program is selected: Requirements, Current State, and Live Result */}
      {selectedProgram && diagnosis && (
        <div className="mt-6 space-y-6">
          {/* Requirements Preview */}
          <div className="rounded-xl border border-forest-100 bg-forest-50/70 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-forest-700">Verified Target Facts</span>
              <span className="text-xs text-muted">
                {selectedProgram.country ?? "Unknown country"} · {selectedProgram.degreeLevel ?? "Bachelor"}
              </span>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-forest-900">
              {selectedProgram.programName}
            </h3>

            {/* High-value requirements grid */}
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {requirementFacts
                .filter(({ key }) => key === "academic" || key === "ielts" || key === "sat")
                .map((fact) => (
                  <div key={fact.key} className="rounded-lg border border-forest-100 bg-white p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <dt className="font-semibold text-forest-900">{fact.label}</dt>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${requirementStateStyles[fact.state]}`}>
                        {requirementStateLabels[fact.state]}
                      </span>
                    </div>
                    <dd className="mt-1 font-medium text-ink truncate">{fact.value}</dd>
                  </div>
                ))}
              <div className="rounded-lg border border-forest-100 bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <dt className="font-semibold text-forest-900">Tuition</dt>
                  <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-bold text-forest-700">
                    {selectedProgram.tuition !== null ? "Published" : "Unknown"}
                  </span>
                </div>
                <dd className="mt-1 font-medium text-ink truncate">{formatTuition(selectedProgram)}</dd>
              </div>
            </dl>

            {selectedProgram.sources.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                <span>Official source:</span>
                <a
                  href={selectedProgram.sources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 hover:text-forest-900"
                >
                  <span className="uppercase text-[9px] text-muted mr-1">{sourceTypeLabels[selectedProgram.sources[0].type]}</span>
                  {selectedProgram.sources[0].title} ↗
                </a>
              </div>
            )}
          </div>

          {/* Current State Inputs */}
          <div className="border-t border-black/10 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest-900">
                3. Tell us where you stand today
              </label>
              <span className="text-[11px] text-muted">Blank = Unknown (never penalised)</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted" htmlFor={`${formId}-stage`}>
                  Current study stage
                </label>
                <select
                  id={`${formId}-stage`}
                  className={inputClass}
                  value={currentStudyStage ?? ""}
                  onChange={(e) => setCurrentStudyStage(e.target.value || null)}
                >
                  <option value="">Not provided</option>
                  <option>Grade 10</option>
                  <option>Grade 11</option>
                  <option>Grade 12</option>
                  <option>Undergraduate student</option>
                  <option>Graduate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted" htmlFor={`${formId}-gpa`}>
                  GPA (0–4 scale)
                </label>
                <input
                  id={`${formId}-gpa`}
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  placeholder="e.g. 3.5"
                  className={inputClass}
                  value={gpa ?? ""}
                  onChange={(e) => {
                    setGpa(numberOrNull(e.target.value));
                    setErrors((prev) => ({ ...prev, gpa: undefined }));
                  }}
                />
                {errors.gpa && <p className="mt-1 text-xs text-red-600">{errors.gpa}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted" htmlFor={`${formId}-ielts`}>
                  IELTS score (0–9)
                </label>
                <input
                  id={`${formId}-ielts`}
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  placeholder="e.g. 6.0"
                  className={inputClass}
                  value={ieltsScore ?? ""}
                  onChange={(e) => {
                    setIeltsScore(numberOrNull(e.target.value));
                    setErrors((prev) => ({ ...prev, ieltsScore: undefined }));
                  }}
                />
                {errors.ieltsScore && <p className="mt-1 text-xs text-red-600">{errors.ieltsScore}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted" htmlFor={`${formId}-sat`}>
                  SAT score (400–1600)
                </label>
                <input
                  id={`${formId}-sat`}
                  type="number"
                  min="400"
                  max="1600"
                  step="10"
                  placeholder="e.g. 1200"
                  className={inputClass}
                  value={satScore ?? ""}
                  onChange={(e) => {
                    setSatScore(numberOrNull(e.target.value));
                    setErrors((prev) => ({ ...prev, satScore: undefined }));
                  }}
                />
                {errors.satScore && <p className="mt-1 text-xs text-red-600">{errors.satScore}</p>}
              </div>
            </div>
          </div>

          {/* Instant Diagnosis Preview */}
          <div className="border-t border-black/10 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forest-900">
                Deterministic Gap Diagnosis
              </h4>
              <span className="text-[11px] text-muted">Immediate result</span>
            </div>

            {/* Criteria comparison rows */}
            <div className="space-y-2">
              {diagnosis.comparisons.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-forest-100 bg-white p-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-forest-900">{row.label}</span>
                    <p className="mt-0.5 text-muted">
                      Your value: <strong className="text-ink">{row.profileValue}</strong> · Required: <strong className="text-ink">{row.programValue}</strong>
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[row.status]}`}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Biggest Gap */}
            {diagnosis.biggestGaps.length > 0 ? (
              <div className="rounded-xl border border-amber-300 bg-sand-100 p-3.5 text-xs text-amber-950">
                <p className="font-bold text-amber-900">Highest-value gap detected:</p>
                {diagnosis.biggestGaps.map((gap) => (
                  <p key={gap.key} className="mt-1 leading-5">
                    <strong>{gap.label}:</strong> {gap.detail}
                  </p>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-3 text-xs text-muted leading-5">
                No confirmed gap appears in the values provided.
                {unresolvedCount > 0 ? ` ${unresolvedCount} criteria remain unknown or need verification.` : " This is not an admission guarantee."}
              </div>
            )}

            {/* Next Action */}
            {diagnosis.nextActions.length > 0 && (
              <div className="rounded-xl border border-forest-200 bg-forest-900 p-3.5 text-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest-100">Recommended Next Move</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    {diagnosis.nextActions[0].basis}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">{diagnosis.nextActions[0].title}</p>
                <p className="mt-1 text-xs text-forest-100/90 leading-5">
                  {diagnosis.nextActions[0].description}
                </p>
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <div className="border-t border-black/10 pt-5">
            <button
              type="submit"
              className="landing-button flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest-700"
            >
              Build my full plan <span aria-hidden="true" className="landing-button-arrow ml-2 font-bold">↗</span>
            </button>
            <p className="mt-2 text-center text-[11px] text-muted leading-4">
              Your target, GPA, and test scores will be saved. You will continue directly into Missing Details without repeating questions.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
