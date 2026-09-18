"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProgramById, programs } from "../../data/programs.ts";
import { resolveLiveInstantDiagnosis } from "../../lib/admissions/instant-diagnosis.ts";
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
  "product-input mt-1.5 min-h-[44px] w-full rounded-[10px] border border-[#D7E7FA] bg-white px-3.5 text-base text-[#10233F] outline-none transition placeholder:text-slate-400 hover:border-[#B7D2F0] focus:border-[#1677FF]";

const statusStyles: Record<ComparisonStatus, string> = {
  Match: "bg-[#E7F6EC] text-[#16A34A] border border-[#BFE5CC]",
  "Action needed": "bg-[#FFF3E0] text-[#C25E00] border border-[#F5D9A8]",
  "Needs verification": "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
  "Not required": "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
  "Not comparable": "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
};

const requirementStateStyles = {
  known: "bg-[#E7F6EC] text-[#16A34A] border border-[#BFE5CC]",
  unknown: "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
  not_required: "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
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
      <div className="landing-check-card rounded-2xl border border-[#D7E7FA] bg-white p-6 shadow-subtle sm:p-8">
        <p className="text-center text-sm text-[#64748B]">Loading admission checker…</p>
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
  const [completedDismissed, setCompletedDismissed] = useState(false);

  const availablePrograms = programs.filter((p) => p.universityName === university);
  const selectedProgram = getProgramById(programId || null);

  // Target selection remains local draft state until explicit commit via "Build my full plan"
  function handleUniversityChange(name: string) {
    setUniversity(name);
    setProgramId("");
  }

  function handleProgramChange(id: string) {
    setProgramId(id);
  }

  function selectDemoProgram(id: string) {
    const prog = getProgramById(id);
    if (!prog) return;
    setUniversity(prog.universityName);
    setProgramId(prog.id);
  }

  // Candidate profile for live comparison
  const candidateProfile: StudentProfile = {
    ...(stored?.profile ?? emptyProfile),
    currentStudyStage,
    gpa,
    ieltsScore,
    satScore,
  };

  // Live deterministic diagnosis with real-time score-range validation
  const liveResult = selectedProgram ? resolveLiveInstantDiagnosis(candidateProfile, selectedProgram) : null;
  const diagnosis = liveResult?.diagnosis ?? null;
  const fieldErrors = liveResult?.fieldErrors ?? {};
  const hasInvalidScores = liveResult?.hasInvalidScores ?? false;
  const requirementFacts = selectedProgram ? buildTargetRequirementFacts(selectedProgram) : [];
  const unresolvedCount = diagnosis
    ? diagnosis.comparisons.filter(({ status }) => status === "Needs verification" || status === "Not comparable").length
    : 0;

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProgram || hasInvalidScores) return;

    // Persist selected target and transfer scores into profile together
    const profileWithDefaults = createLandingInstantProfile(
      selectedProgram,
      {
        currentStudyStage,
        gpa,
        ieltsScore,
        satScore,
      },
      stored?.profile,
      initialProgram,
    );

    saveSelectedProgram(selectedProgram.id);
    saveStoredProfile(profileWithDefaults, 3, false, { flowStage: "onboarding" });
    router.push("/onboarding");
  }

  // Completed user return banner
  if (stored?.completed && !completedDismissed) {
    const completedTarget = getProgramById(loadSelectedProgram());
    return (
      <div className="landing-check-card rounded-2xl border border-[#D7E7FA] bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7E7FA] pb-4">
          <span className="rounded-full bg-[#E7F6EC] px-3 py-1 text-xs font-bold text-[#16A34A] border border-[#BFE5CC]">
            Active Admission Plan
          </span>
          <span className="text-xs text-[#64748B]">Completed profile saved</span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Target program</p>
          <div className="mt-1.5">
            <h2 className="text-lg font-bold text-[#10233F] tracking-tight sm:text-xl">
              {completedTarget?.universityName ?? "Your Selected Target"}
            </h2>
            <p className="text-sm font-semibold text-[#1677FF] mt-0.5">
              {completedTarget ? completedTarget.programName : "Admission Plan"}
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            You already have a completed profile and deterministic analysis ready.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/diagnosis"
            className="landing-button inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            View full diagnosis <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
          <Link
            href="/roadmap"
            className="landing-button-secondary inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            View action roadmap
          </Link>
        </div>

        <div className="mt-6 border-t border-[#D7E7FA] pt-4">
          <button
            type="button"
            onClick={() => setCompletedDismissed(true)}
            className="text-xs font-semibold text-[#1677FF] underline decoration-[#B7D2F0] underline-offset-4 hover:text-[#0F5EDB]"
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
      className="landing-check-card rounded-2xl border border-[#D7E7FA] bg-white p-5 shadow-card transition sm:p-7"
      aria-label="Instant Admission Check"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7E7FA] pb-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#1677FF]" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#10233F]">Instant Admission Check</span>
        </div>
        <span className="text-[11px] font-medium text-[#64748B]">100% deterministic · No signup</span>
      </div>

      {/* Target selection */}
      <div className="mt-5 space-y-3.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#10233F]" htmlFor={`${formId}-university`}>
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#10233F]" htmlFor={`${formId}-program`}>
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
          <div className="rounded-xl border border-[#D7E7FA] bg-[#F5F9FF] p-3.5 text-xs text-[#64748B]">
            <span className="font-semibold text-[#10233F]">Quick explore: </span>
            <button
              type="button"
              onClick={() => selectDemoProgram("lut-software-systems-engineering")}
              className="font-medium text-[#1677FF] underline decoration-[#B7D2F0] underline-offset-2 hover:text-[#0F5EDB]"
            >
              LUT University · Software & Systems Engineering
            </button>
            {" · "}
            <button
              type="button"
              onClick={() => selectDemoProgram("utwente-technical-computer-science")}
              className="font-medium text-[#1677FF] underline decoration-[#B7D2F0] underline-offset-2 hover:text-[#0F5EDB]"
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
          <div className="rounded-xl border border-[#D7E7FA] bg-[#F5F9FF] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1677FF]">Verified Target Facts</span>
              <span className="text-xs text-[#64748B]">
                {selectedProgram.country ?? "Unknown country"} · {selectedProgram.degreeLevel ?? "Bachelor"}
              </span>
            </div>

            {/* University First Hierarchy */}
            <div className="mt-2">
              <p className="text-base font-bold text-[#10233F] tracking-tight">
                {selectedProgram.universityName}
              </p>
              <h3 className="mt-0.5 text-lg font-semibold text-[#1677FF]">
                {selectedProgram.programName}
              </h3>
            </div>

            {/* High-value requirements grid */}
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {requirementFacts
                .filter(({ key }) => key === "academic" || key === "ielts" || key === "sat")
                .map((fact) => (
                  <div key={fact.key} className="rounded-lg border border-[#D7E7FA] bg-white p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <dt className="font-semibold text-forest-900">{fact.label}</dt>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${requirementStateStyles[fact.state]}`}>
                        {requirementStateLabels[fact.state]}
                      </span>
                    </div>
                    <dd className="mt-1 font-medium text-[#10233F] truncate">{fact.value}</dd>
                  </div>
                ))}
              <div className="rounded-lg border border-[#D7E7FA] bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <dt className="font-semibold text-forest-900">Tuition</dt>
                  <span className="rounded-full bg-[#E7F6EC] px-2 py-0.5 text-[10px] font-bold text-[#16A34A] border border-[#BFE5CC]">
                    {selectedProgram.tuition !== null ? "Published" : "Unknown"}
                  </span>
                </div>
                <dd className="mt-1 font-medium text-[#10233F] truncate">{formatTuition(selectedProgram)}</dd>
              </div>
              <div className="rounded-lg border border-[#D7E7FA] bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <dt className="font-semibold text-forest-900">Deadline</dt>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      diagnosis.timeline.deadline.status === "Published"
                        ? "bg-[#E7F6EC] text-[#16A34A] border border-[#BFE5CC]"
                        : "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]"
                    }`}
                  >
                    {diagnosis.timeline.deadline.status}
                  </span>
                </div>
                <dd className="mt-1 font-medium text-[#10233F] truncate">{diagnosis.timeline.deadline.value}</dd>
              </div>
            </dl>

            {selectedProgram.sources.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#64748B]">
                <span>Official source:</span>
                <a
                  href={selectedProgram.sources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#1677FF] underline decoration-[#B7D2F0] underline-offset-2 hover:text-[#0F5EDB]"
                >
                  <span className="uppercase text-[9px] text-[#64748B] mr-1">{sourceTypeLabels[selectedProgram.sources[0].type]}</span>
                  {selectedProgram.sources[0].title} ↗
                </a>
              </div>
            )}
          </div>

          {/* Current State Inputs */}
          <div className="border-t border-[#D7E7FA] pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#10233F]">
                3. Tell us where you stand today
              </label>
              <span className="text-[11px] text-[#64748B]">Blank = Unknown (never penalised)</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#64748B]" htmlFor={`${formId}-stage`}>
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
                <label className="block text-xs font-medium text-[#64748B]" htmlFor={`${formId}-gpa`}>
                  GPA (0–4 scale)
                </label>
                <input
                  id={`${formId}-gpa`}
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  placeholder="e.g. 3.5"
                  className={`${inputClass} ${fieldErrors.gpa ? "!border-red-500 focus:!border-red-600" : ""}`}
                  value={gpa ?? ""}
                  onChange={(e) => setGpa(numberOrNull(e.target.value))}
                  aria-invalid={Boolean(fieldErrors.gpa)}
                  aria-describedby={fieldErrors.gpa ? `${formId}-gpa-error` : undefined}
                />
                {fieldErrors.gpa && (
                  <p id={`${formId}-gpa-error`} className="mt-1 text-xs font-medium text-red-600" role="alert">
                    {fieldErrors.gpa}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B]" htmlFor={`${formId}-ielts`}>
                  IELTS score (0–9)
                </label>
                <input
                  id={`${formId}-ielts`}
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  placeholder="e.g. 6.0"
                  className={`${inputClass} ${fieldErrors.ieltsScore ? "!border-red-500 focus:!border-red-600" : ""}`}
                  value={ieltsScore ?? ""}
                  onChange={(e) => setIeltsScore(numberOrNull(e.target.value))}
                  aria-invalid={Boolean(fieldErrors.ieltsScore)}
                  aria-describedby={fieldErrors.ieltsScore ? `${formId}-ielts-error` : undefined}
                />
                {fieldErrors.ieltsScore && (
                  <p id={`${formId}-ielts-error`} className="mt-1 text-xs font-medium text-red-600" role="alert">
                    {fieldErrors.ieltsScore}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B]" htmlFor={`${formId}-sat`}>
                  SAT score (400–1600)
                </label>
                <input
                  id={`${formId}-sat`}
                  type="number"
                  min="400"
                  max="1600"
                  step="10"
                  placeholder="e.g. 1200"
                  className={`${inputClass} ${fieldErrors.satScore ? "!border-red-500 focus:!border-red-600" : ""}`}
                  value={satScore ?? ""}
                  onChange={(e) => setSatScore(numberOrNull(e.target.value))}
                  aria-invalid={Boolean(fieldErrors.satScore)}
                  aria-describedby={fieldErrors.satScore ? `${formId}-sat-error` : undefined}
                />
                {fieldErrors.satScore && (
                  <p id={`${formId}-sat-error`} className="mt-1 text-xs font-medium text-red-600" role="alert">
                    {fieldErrors.satScore}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Instant Diagnosis Preview */}
          <div className="border-t border-[#D7E7FA] pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#10233F]">
                Deterministic Gap Diagnosis
              </h4>
              <span className="text-[11px] text-[#64748B]">Immediate result</span>
            </div>

            {/* Criteria comparison rows */}
            <div className="space-y-2">
              {diagnosis.comparisons.map((row) => (
                "isInvalid" in row && row.isInvalid ? (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-red-900">{row.label}</span>
                      <p className="mt-0.5 text-red-700 font-medium">
                        {row.detail}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">
                      Invalid input
                    </span>
                  </div>
                ) : (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D7E7FA] bg-white p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#10233F]">{row.label}</span>
                      <p className="mt-0.5 text-[#64748B]">
                        Your value: <strong className="text-[#10233F]">{row.profileValue}</strong> · Required: <strong className="text-[#10233F]">{row.programValue}</strong>
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[row.status]}`}>
                      {row.status}
                    </span>
                  </div>
                )
              ))}
            </div>

            {/* Biggest Gap */}
            {diagnosis.biggestGaps.length > 0 ? (
              <div className="rounded-xl border border-[#F5D9A8] bg-[#FFF3E0] p-3.5 text-xs text-[#C25E00]">
                <p className="font-bold text-[#C25E00]">Highest-value gap detected:</p>
                {diagnosis.biggestGaps.map((gap) => (
                  <p key={gap.key} className="mt-1 leading-5 text-amber-900">
                    <strong className="text-[#C25E00]">{gap.label}:</strong> {gap.detail}
                  </p>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#D7E7FA] bg-[#EDF4FD]/50 p-3 text-xs text-[#64748B] leading-5">
                No confirmed gap appears in the values provided.
                {unresolvedCount > 0 ? ` ${unresolvedCount} criteria remain unknown or need verification.` : " This is not an admission guarantee."}
              </div>
            )}

            {/* Next Action - Dark Navy Action Card */}
            {diagnosis.nextActions.length > 0 && (
              <div className="rounded-xl border border-[#0E2647] bg-[#081A33] p-4 text-white shadow-subtle">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">Recommended Next Move</span>
                  <span className="rounded-full bg-[#1677FF] px-2.5 py-0.5 text-[10px] font-bold text-white">
                    {diagnosis.nextActions[0].basis}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-white">{diagnosis.nextActions[0].title}</p>
                <p className="mt-1 text-xs text-[#9FB6D9] leading-relaxed">
                  {diagnosis.nextActions[0].description}
                </p>
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <div className="border-t border-[#D7E7FA] pt-5">
            <button
              type="submit"
              disabled={hasInvalidScores}
              className={`landing-button flex min-h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold transition ${
                hasInvalidScores
                  ? "opacity-50 cursor-not-allowed"
                  : "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677FF]"
              }`}
            >
              Build my full plan <span aria-hidden="true" className="landing-button-arrow ml-2 font-bold">↗</span>
            </button>
            {hasInvalidScores ? (
              <p className="mt-2 text-center text-xs font-medium text-red-600">
                Correct the invalid score inputs above to continue.
              </p>
            ) : (
              <p className="mt-2 text-center text-[11px] text-[#64748B] leading-4">
                Your target, GPA, and test scores will be saved. You will continue directly into Missing Details without repeating questions.
              </p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
