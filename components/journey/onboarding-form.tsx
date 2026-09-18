"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getProgramById, programs } from "../../data/programs.ts";
import {
  buildChangeImpact,
  buildTargetPlanImpact,
  hasMeaningfulImpact,
  type ChangeImpact,
} from "../../lib/admissions/change-impact.ts";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import {
  applyTargetProfileDefaults,
  emptyProfile,
  numberOrNull,
  stepErrors,
  toggleCountry,
  transferInstantProfile,
  validStep,
} from "../../lib/onboarding.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile, saveStoredProfile } from "../../lib/storage/profile.ts";
import type { OnboardingFlowStage, StoredProfile } from "../../lib/storage/profile.ts";
import { loadSelectedProgram, saveSelectedProgram } from "../../lib/storage/selection.ts";
import { loadProgress } from "../../lib/storage/progress.ts";
import {
  clearEditBaseline,
  clearRecentChangeImpact,
  loadEditBaseline,
  saveEditBaseline,
  saveRecentChangeImpact,
} from "../../lib/storage/change-impact.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";
import { InstantCurrentState, InstantDiagnosisResult, ThresholdHint } from "./instant-diagnosis.tsx";
import { TargetStep } from "./target-step.tsx";

const stepDetails = [
  ["Where are you today?", "Add your current stage and study direction after reviewing the target requirements."],
  ["Your academics", "Add what you know today. Blank scores remain unknown."],
  ["Your preferences", "Choose where, when, and what tuition budget works for you."],
  ["Your admission profile", "Review what we know before your profile is analyzed."],
] as const;

const countries = [...new Set(programs.flatMap(({ country }) => country ? [country] : []))].sort();
const currencies = [...new Set(programs.flatMap(({ tuitionCurrency }) => tuitionCurrency ? [tuitionCurrency] : []))].sort();
const languages = [...new Set(programs.flatMap(({ languageOfInstruction }) => languageOfInstruction ? [languageOfInstruction] : []))].sort();
const secondaryStages = ["Undergraduate student", "Graduate"];

const inputClass =
  "product-input mt-2 min-h-12 w-full border border-forest-200 bg-white px-3.5 text-base text-ink outline-none transition placeholder:text-slate-400";
const labelClass = "block text-sm font-semibold text-forest-900";

function display(value: string | number | null, fallback = "Not provided") {
  return value === null || value === "" ? fallback : String(value);
}

function budgetLabel(profile: StudentProfile) {
  if (profile.annualBudget === null) return "Not added";
  return `${profile.budgetCurrency ?? "Unknown currency"} ${profile.annualBudget.toLocaleString()} / year`;
}

function profileSummary(profile: StudentProfile) {
  return [profile.targetDegree, profile.intendedField].filter(Boolean).join(" · ") || "No direction selected yet";
}

function ErrorText({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} className="mt-2 text-sm font-medium text-red-700" role="alert">{children}</p> : null;
}

function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  badge,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <label className="choice-card group flex min-h-24 cursor-pointer gap-3 border border-forest-200 bg-white p-4 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest-600">
      <input
        className="sr-only"
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-forest-300 bg-white text-[11px] font-bold text-white group-has-checked:border-forest-700 group-has-checked:bg-forest-700">
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-forest-900">
          {title}
          {badge ? <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-forest-900">{badge}</span> : null}
        </span>
        {description ? <span className="mt-1 block text-sm leading-5 text-muted">{description}</span> : null}
        {checked ? <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-forest-700">Selected</span> : null}
      </span>
    </label>
  );
}

function FieldCard({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "emphasis" }) {
  return (
    <div className={`field-group p-5 sm:p-6 ${tone === "emphasis" ? "bg-forest-50/70" : ""}`}>
      {children}
    </div>
  );
}

function StepProgress({ step, labels }: { step: number; labels: readonly string[] }) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="space-y-1">
        {labels.map((title, index) => {
          const number = index + 1;
          const isCurrent = number === step;
          const isComplete = number < step;
          return (
            <li key={title} aria-current={isCurrent ? "step" : undefined} className={`step-item flex min-h-14 items-center gap-3 px-2 py-3 text-sm ${isCurrent ? "font-semibold" : "text-muted"}`}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isCurrent ? "border-white/50" : isComplete ? "border-forest-600 bg-forest-600 text-white" : "border-forest-200"}`}>
                {isComplete ? "✓" : String(number).padStart(2, "0")}
              </span>
              <span className="font-semibold">{labels[index]}</span>
              {isCurrent ? <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-forest-100" aria-current="step">Current</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProfilePreview({ profile, target }: { profile: StudentProfile; target: UniversityProgram | null }) {
  const rows = [
    ["Target", [target ? `${target.programName} @ ${target.universityName}` : "Not selected"]],
    ["Goal", [
      display(profile.targetDegree, "Not selected"),
      display(profile.intendedField, "Not selected"),
      `Stage  ${display(profile.currentStudyStage, "Not selected")}`,
    ]],
    ["Academics", [
      `GPA  ${display(profile.gpa)}`,
      `IELTS  ${display(profile.ieltsScore)}`,
      `SAT  ${display(profile.satScore)}`,
    ]],
    ["Preferences", [
      profile.preferredCountries.join(" · ") || "Countries not selected",
      `Budget  ${budgetLabel(profile)}`,
      `Intake  ${display(profile.targetIntake, "Not selected")}`,
    ]],
  ] as const;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-600">Your admission profile</p>
      <div className="mt-4 divide-y divide-forest-100">
        {rows.map(([title, values]) => (
          <section key={title} className="py-4 first:pt-0 last:pb-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
            <div className="mt-2 space-y-1 text-sm font-medium leading-5 text-ink">
              {values.map((value, index) => <p key={`${title}-${index}`}>{value}</p>)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="review-section p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">{title}</h3>
        <button type="button" onClick={onEdit} className="min-h-11 rounded-full px-3 text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
          Edit
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function OnboardingForm() {
  const ready = useClientReady();

  if (!ready) {
    return (
      <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center text-muted shadow-sm">
        Restoring your saved progress…
      </div>
    );
  }

  const initial = loadStoredProfile();
  const initialTarget = getProgramById(loadSelectedProgram());
  return <OnboardingEditor key={`${initial?.updatedAt ?? "new"}:${initialTarget?.id ?? "no-target"}`} initial={initial} initialTarget={initialTarget} />;
}

function OnboardingEditor({ initial, initialTarget }: { initial: StoredProfile | null; initialTarget: UniversityProgram | null }) {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile>(() => {
    if (initial) return initial.profile;
    return initialTarget ? applyTargetProfileDefaults(emptyProfile, initialTarget) : emptyProfile;
  });
  const [instantProfile, setInstantProfile] = useState<StudentProfile>({
    ...emptyProfile,
    currentStudyStage: initial?.profile.currentStudyStage ?? null,
    gpa: initial?.profile.gpa ?? null,
    ieltsScore: initial?.profile.ieltsScore ?? null,
    satScore: initial?.profile.satScore ?? null,
  });
  const [target, setTarget] = useState<UniversityProgram | null>(initialTarget);
  const lastTargetRef = useRef<UniversityProgram | null>(initialTarget);
  const [entryStage, setEntryStage] = useState<OnboardingFlowStage>(initial?.flowStage ?? "target");
  const [step, setStep] = useState(initial?.step ?? 1);
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [attemptedTarget, setAttemptedTarget] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (initial?.completed) saveEditBaseline(initial.profile);
    else if (!initial) {
      clearEditBaseline();
      clearRecentChangeImpact();
    }
  }, [initial]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveStoredProfile(
      entryStage === "onboarding" ? profile : transferInstantProfile(profile, instantProfile),
      step,
      completed,
      { flowStage: entryStage },
    );
  }, [completed, entryStage, instantProfile, profile, step]);

  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setCompleted(false);
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function edit(stepNumber: number) {
    setCompleted(false);
    setAttemptedStep(null);
    setEditingFromReview(true);
    setEntryStage("onboarding");
    setStep(stepNumber);
  }

  const isTargetJourney = entryStage !== "onboarding" || Boolean(target);

  function handleBack() {
    setCompleted(false);
    setAttemptedStep(null);
    if (editingFromReview) {
      setEditingFromReview(false);
      setEntryStage("onboarding");
      setStep(4);
      return;
    }
    if (entryStage === "current") {
      setEntryStage("target");
    } else if (entryStage === "diagnosis") {
      setEntryStage("current");
    } else if (entryStage === "onboarding") {
      if (step === 4) {
        setStep(3);
      } else if (step === 3) {
        if (isTargetJourney) {
          setEntryStage("diagnosis");
        } else {
          setStep(2);
        }
      } else if (step === 2) {
        setStep(1);
      } else if (step === 1) {
        if (isTargetJourney) {
          setEntryStage("diagnosis");
        }
      }
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingFromReview) {
      if (entryStage === "target") {
        if (!target) {
          setAttemptedTarget(true);
          return;
        }
        setAttemptedTarget(false);
        setEntryStage("onboarding");
        setStep(4);
        setEditingFromReview(false);
        return;
      }
      if (entryStage === "current") {
        if (!validStep(2, instantProfile)) return;
        const transferred = transferInstantProfile(profile, instantProfile);
        setProfile(transferred);
        setEntryStage("onboarding");
        setStep(4);
        setEditingFromReview(false);
        return;
      }
      if (!validStep(step, profile)) {
        setAttemptedStep(step);
        return;
      }
      setAttemptedStep(null);
      setEditingFromReview(false);
      setStep(4);
      return;
    }

    if (entryStage === "target") {
      if (!target) {
        setAttemptedTarget(true);
        return;
      }
      setAttemptedTarget(false);
      setEntryStage("current");
      return;
    }
    if (entryStage === "current") {
      if (!validStep(2, instantProfile)) return;
      setEntryStage("diagnosis");
      return;
    }
    if (entryStage === "diagnosis") {
      const transferred = transferInstantProfile(profile, instantProfile);
      const withDefaults = applyTargetProfileDefaults(transferred, target, lastTargetRef.current);
      setProfile(withDefaults);
      setEntryStage("onboarding");
      setStep(3);
      return;
    }
    if (!validStep(step, profile)) {
      setAttemptedStep(step);
      return;
    }

    setAttemptedStep(null);
    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    setCompleted(true);
    const previousProfile = loadEditBaseline();
    if (previousProfile) {
      const impact = buildChangeImpact(
        previousProfile,
        profile,
        getPrimaryMatches(previousProfile),
        getPrimaryMatches(profile),
      );
      const target = getProgramById(loadSelectedProgram());
      const targetPlan = target
        ? buildTargetPlanImpact(previousProfile, profile, target, loadProgress().byProgram[target.id] ?? [])
        : undefined;
      const fullImpact: ChangeImpact = targetPlan ? { ...impact, targetPlan } : impact;
      if (hasMeaningfulImpact(fullImpact)) saveRecentChangeImpact(fullImpact);
      else clearRecentChangeImpact();
    } else {
      clearRecentChangeImpact();
    }
    clearEditBaseline();
    saveStoredProfile(profile, 4, true);
    router.push("/diagnosis");
  }

  const [title, description] = entryStage === "target"
    ? ["Where do you want to get in?", "Choose a real program target and review its known requirements before entering your current state."]
    : entryStage === "current"
      ? ["Where are you today?", "Add only the current values you know. You can see a useful comparison without completing the full profile."]
      : entryStage === "diagnosis"
        ? ["Instant Diagnosis", "See what is ready, what is confirmed, what remains unknown, and what to do next."]
        : isTargetJourney && step === 3
          ? ["Complete missing details", "Add your target intake, budget, and study preferences to finalize your admission profile."]
          : stepDetails[step - 1];

  const flowLabels = isTargetJourney
    ? ["Target", "Current state", "Instant diagnosis", "Missing details", "Review"]
    : ["Profile", "Academics", "Preferences", "Review"];

  const flowStep = !isTargetJourney
    ? step
    : entryStage === "target"
      ? 1
      : entryStage === "current"
        ? 2
        : entryStage === "diagnosis"
          ? 3
          : step === 4
            ? 5
            : step === 3
              ? 4
              : step;

  const submitLabel = editingFromReview
    ? "Save and return to review"
    : entryStage === "target"
      ? "Continue to current state"
      : entryStage === "current"
        ? "Show instant diagnosis"
        : entryStage === "diagnosis"
          ? "Build my full plan"
          : step === 3
            ? "Continue to review"
            : step === 4
              ? "Analyze my profile"
              : "Continue";

  const backLabel = editingFromReview ? "Back to review" : "Back";
  const backDisabled =
    !editingFromReview &&
    (entryStage === "target" || (!isTargetJourney && step === 1));

  const errors = stepErrors(step, profile);
  const instantErrors = stepErrors(2, instantProfile);
  const showRequiredErrors = attemptedStep === step;
  const unsupportedCountries = profile.preferredCountries.filter((country) => !countries.includes(country));
  const availableCurrencies = [...new Set([...currencies, ...(profile.budgetCurrency ? [profile.budgetCurrency] : [])])];
  const availableLanguages = [...new Set([...languages, ...(profile.preferredLanguage ? [profile.preferredLanguage] : [])])];
  const previewProfile = entryStage === "onboarding" ? profile : instantProfile;

  return (
    <form onSubmit={submit} noValidate className="onboarding-layout grid items-start gap-8 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.6fr)] lg:gap-12">
      <aside className="sticky top-6 hidden space-y-6 lg:block">
        <div className="editorial-section p-4">
          <StepProgress step={flowStep} labels={flowLabels} />
        </div>
        <div className="accent-section p-6">
          <ProfilePreview profile={previewProfile} target={target} />
          <p className="mt-5 border-t border-sand-300 pt-4 text-xs leading-5 text-muted">
            We use verified program facts for matching. Missing information stays unknown.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="editorial-section mb-5 p-4 lg:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-forest-700">Step {flowStep} of {flowLabels.length}</p>
              <p className="mt-0.5 font-semibold text-forest-900">{title}</p>
            </div>
            <span className="text-sm text-muted">{Math.round((flowStep / flowLabels.length) * 100)}%</span>
          </div>
          <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${flowLabels.length}, minmax(0, 1fr))` }} aria-label={`Step ${flowStep} of ${flowLabels.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={flowLabels.length} aria-valuenow={flowStep}>
            {flowLabels.map((label, index) => <span key={label} className={`h-1.5 rounded-full ${index < flowStep ? "bg-forest-700" : "bg-forest-100"}`} />)}
          </div>
          <details className="mt-4 border-t border-forest-100 pt-3">
            <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
              Your profile so far <span className="mt-1 block font-normal text-muted">{profileSummary(previewProfile)} · View summary</span>
            </summary>
            <div className="mt-3 rounded-xl bg-sand-100/70 p-4"><ProfilePreview profile={previewProfile} target={target} /></div>
          </details>
        </div>

        <section className="onboarding-panel overflow-hidden">
          <header className="border-b border-forest-100 px-5 py-6 sm:px-8 sm:py-8">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-forest-600 lg:block">Step {String(flowStep).padStart(2, "0")} of {String(flowLabels.length).padStart(2, "0")}</p>
            <h1 id="onboarding-step-heading" className="mt-3 text-3xl font-semibold leading-[0.95] text-forest-900 sm:text-5xl">{title}</h1>
            <p className="mt-2 max-w-2xl leading-7 text-muted">{description}</p>
          </header>

          <div key={entryStage === "onboarding" ? step : entryStage} className="onboarding-step-content space-y-0 bg-[var(--surface)] px-5 py-2 sm:px-8 sm:py-4">
            {editingFromReview ? (
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-forest-200 bg-forest-50/80 px-4 py-2.5 text-sm text-forest-900">
                <span className="font-medium">Editing section from review</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFromReview(false);
                    setEntryStage("onboarding");
                    setStep(4);
                  }}
                  className="font-semibold text-forest-700 underline decoration-forest-300 underline-offset-4 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
                >
                  Cancel & return to review
                </button>
              </div>
            ) : null}

            {entryStage === "target" ? (
              <TargetStep
                selected={target}
                attempted={attemptedTarget}
                onSelect={(program) => {
                  const previous = lastTargetRef.current;
                  setTarget(program);
                  setAttemptedTarget(false);
                  saveSelectedProgram(program?.id ?? null);
                  if (program) {
                    lastTargetRef.current = program;
                    setProfile((current) => applyTargetProfileDefaults(current, program, previous));
                  }
                }}
              />
            ) : null}

            {entryStage === "current" ? <InstantCurrentState profile={instantProfile} errors={instantErrors} onUpdate={(key, value) => setInstantProfile((current) => ({ ...current, [key]: value }))} program={target} /> : null}

            {entryStage === "diagnosis" && target ? <InstantDiagnosisResult profile={instantProfile} program={target} /> : null}

            {entryStage === "onboarding" && step === 1 ? (
              <>
                <FieldCard>
                  <fieldset aria-describedby={showRequiredErrors && errors.currentStudyStage ? "study-stage-help study-stage-error" : "study-stage-help"}>
                    <legend className="font-semibold text-forest-900">Current study stage</legend>
                    <p id="study-stage-help" className="mt-1 text-sm leading-5 text-muted">Helps tailor your guidance. It does not change deterministic matching.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {["Grade 10", "Grade 11", "Grade 12"].map((stage) => (
                        <ChoiceCard key={stage} name="current-study-stage" value={stage} title={stage} checked={profile.currentStudyStage === stage} onChange={() => update("currentStudyStage", stage)} />
                      ))}
                    </div>
                    <details className="mt-3 rounded-xl border border-forest-100 bg-[#fbfcfa] p-3" open={secondaryStages.includes(profile.currentStudyStage ?? "") || undefined}>
                      <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-sm font-semibold text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Not in grades 10–12?</summary>
                      <p className="mb-3 text-sm leading-5 text-muted">These stages remain available for saved profiles, while current recommendations stay Bachelor-only.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {secondaryStages.map((stage) => (
                          <ChoiceCard key={stage} name="current-study-stage" value={stage} title={stage} checked={profile.currentStudyStage === stage} onChange={() => update("currentStudyStage", stage)} />
                        ))}
                      </div>
                    </details>
                    <ErrorText id="study-stage-error">{showRequiredErrors ? errors.currentStudyStage : undefined}</ErrorText>
                  </fieldset>
                </FieldCard>

                <FieldCard>
                  <fieldset aria-describedby={showRequiredErrors && errors.targetDegree ? "target-degree-help target-degree-error" : "target-degree-help"}>
                    <legend className="font-semibold text-forest-900">Your target</legend>
                    <p id="target-degree-help" className="mt-1 text-sm leading-5 text-muted">This product currently recommends Bachelor programs only.</p>
                    <div className="mt-4 max-w-sm">
                      <ChoiceCard name="target-degree" value="Bachelor" title="Bachelor" badge="Supported in this version" checked={profile.targetDegree === "Bachelor"} onChange={() => update("targetDegree", "Bachelor")} />
                    </div>
                    <ErrorText id="target-degree-error">{showRequiredErrors ? errors.targetDegree : undefined}</ErrorText>
                  </fieldset>
                </FieldCard>

                <FieldCard tone="emphasis">
                  <fieldset aria-describedby={showRequiredErrors && errors.intendedField ? "intended-field-help intended-field-error" : "intended-field-help"}>
                    <legend className="text-lg font-semibold text-forest-900">Intended field</legend>
                    <p id="intended-field-help" className="mt-1 text-sm leading-5 text-muted">This choice materially shapes which verified programs enter your recommendation set.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ChoiceCard name="intended-field" value="Computer Science" title="Computer Science" description="Software, data, IT and digital systems" checked={profile.intendedField === "Computer Science"} onChange={() => update("intendedField", "Computer Science")} />
                      <ChoiceCard name="intended-field" value="Business" title="Business" description="Management, finance, analytics and business" checked={profile.intendedField === "Business"} onChange={() => update("intendedField", "Business")} />
                    </div>
                    <ErrorText id="intended-field-error">{showRequiredErrors ? errors.intendedField : undefined}</ErrorText>
                  </fieldset>
                </FieldCard>
              </>
            ) : null}

            {entryStage === "onboarding" && step === 2 ? (
              <>
                <div className="rounded-2xl border border-sand-300 bg-sand-100 px-4 py-3 text-sm leading-6 text-forest-900">
                  <strong>Blank means unknown.</strong> We never turn a missing score into a pass or a fail.
                </div>
                <FieldCard>
                  <label className={labelClass} htmlFor="gpa">GPA <span className="font-normal text-muted">Optional</span></label>
                  <p id="gpa-help" className="mt-1 text-sm leading-5 text-muted">Add your GPA on the supported 0–4 scale, if you know it.</p>
                  <input id="gpa" className={inputClass} type="number" min="0" max="4" step="0.01" inputMode="decimal" placeholder="3.5" value={profile.gpa ?? ""} onChange={(event) => update("gpa", numberOrNull(event.target.value))} aria-describedby={`gpa-help${errors.gpa ? " gpa-error" : ""}`} aria-invalid={Boolean(errors.gpa)} />
                  <ErrorText id="gpa-error">{errors.gpa}</ErrorText>
                  <ThresholdHint criterionKey="academic" label="Academic requirement" value={profile.gpa} requirement={target?.academicRequirement ?? null} error={errors.gpa} />
                </FieldCard>
                <FieldCard>
                  <label className={labelClass} htmlFor="ielts">IELTS <span className="font-normal text-muted">Optional</span></label>
                  <p id="ielts-help" className="mt-1 text-sm leading-5 text-muted">Haven’t taken IELTS yet? Leave this blank; the requirement stays unknown until program facts are checked.</p>
                  <input id="ielts" className={inputClass} type="number" min="0" max="9" step="0.5" inputMode="decimal" placeholder="6.0" value={profile.ieltsScore ?? ""} onChange={(event) => update("ieltsScore", numberOrNull(event.target.value))} aria-describedby={`ielts-help${errors.ieltsScore ? " ielts-error" : ""}`} aria-invalid={Boolean(errors.ieltsScore)} />
                  <ErrorText id="ielts-error">{errors.ieltsScore}</ErrorText>
                  <ThresholdHint criterionKey="ielts" label="IELTS" value={profile.ieltsScore} requirement={target?.ieltsRequirement ?? null} error={errors.ieltsScore} />
                </FieldCard>
                <FieldCard>
                  <label className={labelClass} htmlFor="sat">SAT <span className="font-normal text-muted">Optional</span></label>
                  <p id="sat-help" className="mt-1 text-sm leading-5 text-muted">Leave blank if not taken. Missing SAT is not treated as a failed score.</p>
                  <input id="sat" className={inputClass} type="number" min="400" max="1600" step="10" inputMode="numeric" placeholder="1200" value={profile.satScore ?? ""} onChange={(event) => update("satScore", numberOrNull(event.target.value))} aria-describedby={`sat-help${errors.satScore ? " sat-error" : ""}`} aria-invalid={Boolean(errors.satScore)} />
                  <ErrorText id="sat-error">{errors.satScore}</ErrorText>
                  <ThresholdHint criterionKey="sat" label="SAT" value={profile.satScore} requirement={target?.satRequirement ?? null} error={errors.satScore} />
                </FieldCard>
                {!isTargetJourney ? (
                  <FieldCard>
                    <label className={labelClass} htmlFor="activities-and-achievements">Olympiads, projects, volunteering, or other achievements <span className="font-normal text-muted">Optional</span></label>
                    <p id="activities-and-achievements-help" className="mt-1 text-sm leading-5 text-muted">This provides context for application planning and materials. It does not affect deterministic matching.</p>
                    <textarea id="activities-and-achievements" className={`${inputClass} min-h-32 py-3`} value={profile.activitiesAndAchievements ?? ""} onChange={(event) => update("activitiesAndAchievements", event.target.value || null)} aria-describedby="activities-and-achievements-help" />
                  </FieldCard>
                ) : null}
              </>
            ) : null}

            {entryStage === "onboarding" && step === 3 ? (
              <>
                {target ? (
                  <div className="rounded-2xl border border-forest-200 bg-forest-50/60 p-4 text-forest-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
                        Academic baseline & target recorded
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFromReview(true);
                          setEntryStage("onboarding");
                          setStep(2);
                        }}
                        className="text-xs font-semibold text-forest-700 underline decoration-forest-300 underline-offset-4 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
                      >
                        Edit academics
                      </button>
                    </div>
                    <p className="mt-1.5 font-semibold text-ink">
                      {target.programName} @ {target.universityName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>Stage: <strong className="font-semibold text-ink">{display(profile.currentStudyStage, "Not specified")}</strong></span>
                      <span>GPA: <strong className="font-semibold text-ink">{display(profile.gpa, "Unknown")}</strong></span>
                      <span>IELTS: <strong className="font-semibold text-ink">{display(profile.ieltsScore, "Unknown")}</strong></span>
                      <span>SAT: <strong className="font-semibold text-ink">{display(profile.satScore, "Unknown")}</strong></span>
                    </div>
                  </div>
                ) : null}

                <FieldCard>
                  <label className={labelClass} htmlFor="target-intake">Target intake</label>
                  <p id="intake-help" className="mt-1 text-sm leading-5 text-muted">Choose the existing intake that best matches your application timeline.</p>
                  <select id="target-intake" className={inputClass} value={profile.targetIntake ?? ""} onChange={(event) => update("targetIntake", event.target.value || null)} aria-describedby={`intake-help${showRequiredErrors && errors.targetIntake ? " intake-error" : ""}`} aria-invalid={showRequiredErrors && Boolean(errors.targetIntake)}>
                    <option value="">Choose an intake</option>
                    <option>Fall 2027</option>
                    <option>Spring 2028</option>
                    <option>Fall 2028</option>
                  </select>
                  <ErrorText id="intake-error">{showRequiredErrors ? errors.targetIntake : undefined}</ErrorText>
                </FieldCard>

                <FieldCard>
                  <fieldset>
                    <legend className="font-semibold text-forest-900">Preferred countries <span className="font-normal text-muted">Optional</span></legend>
                    <p className="mt-1 text-sm leading-5 text-muted">Countries currently covered by our verified program set. Select every location you would seriously consider.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {countries.map((country) => {
                        const checked = profile.preferredCountries.includes(country);
                        return (
                          <label key={country} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-forest-200 bg-white px-3.5 text-sm font-medium text-ink transition hover:border-forest-500 has-checked:border-forest-700 has-checked:bg-forest-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest-600">
                            <input type="checkbox" className="size-5 shrink-0 accent-forest-700" checked={checked} onChange={() => { setCompleted(false); setProfile((current) => toggleCountry(current, country)); }} />
                            <span>{country}</span>
                            {checked ? <span className="ml-auto text-xs font-semibold text-forest-700">Selected</span> : null}
                          </label>
                        );
                      })}
                    </div>
                    {unsupportedCountries.length ? (
                      <div className="mt-4 rounded-xl bg-sand-100 p-3 text-sm text-forest-900">
                        <p>Saved outside current catalog coverage: {unsupportedCountries.join(", ")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {unsupportedCountries.map((country) => <button key={country} type="button" onClick={() => { setCompleted(false); setProfile((current) => toggleCountry(current, country)); }} className="min-h-11 rounded-full px-3 font-semibold text-forest-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">Remove {country}</button>)}
                        </div>
                      </div>
                    ) : null}
                  </fieldset>
                </FieldCard>

                <FieldCard>
                  <label className={labelClass} htmlFor="preferred-language">What language would you prefer to study in? <span className="font-normal text-muted">Optional</span></label>
                  <p id="preferred-language-help" className="mt-1 text-sm leading-5 text-muted">Choose from languages verified in the current program set. Leave blank if you have no preference.</p>
                  <select id="preferred-language" className={inputClass} value={profile.preferredLanguage ?? ""} onChange={(event) => update("preferredLanguage", event.target.value || null)} aria-describedby="preferred-language-help">
                    <option value="">No preference</option>
                    {availableLanguages.map((language) => <option key={language}>{language}</option>)}
                  </select>
                </FieldCard>

                <FieldCard>
                  <label className={labelClass} htmlFor="budget">Annual tuition budget <span className="font-normal text-muted">Optional</span></label>
                  <p id="budget-help" className="mt-1 text-sm leading-5 text-muted">Tuition only · living costs are not included.</p>
                  <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                    <label className="sr-only" htmlFor="budget-currency">Budget currency</label>
                    <select id="budget-currency" className={inputClass} value={profile.budgetCurrency ?? ""} onChange={(event) => update("budgetCurrency", event.target.value || null)} aria-label="Budget currency">
                      <option value="">Currency</option>
                      {availableCurrencies.map((currency) => <option key={currency}>{currency}</option>)}
                    </select>
                    <input id="budget" className={inputClass} type="number" min="0" step="500" inputMode="numeric" placeholder="20,000" value={profile.annualBudget ?? ""} onChange={(event) => update("annualBudget", numberOrNull(event.target.value))} aria-describedby={`budget-help budget-rule${errors.annualBudget ? " budget-error" : ""}`} aria-invalid={Boolean(errors.annualBudget)} />
                  </div>
                  <p id="budget-rule" className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-sm leading-5 text-forest-900">We compare budget only when program tuition is published in the same currency. We do not guess exchange rates.</p>
                  <ErrorText id="budget-error">{errors.annualBudget}</ErrorText>
                </FieldCard>

                {isTargetJourney ? (
                  <FieldCard>
                    <label className={labelClass} htmlFor="activities-and-achievements">Olympiads, projects, volunteering, or other achievements <span className="font-normal text-muted">Optional</span></label>
                    <p id="activities-and-achievements-help" className="mt-1 text-sm leading-5 text-muted">This provides context for application planning and materials. It does not affect deterministic matching.</p>
                    <textarea id="activities-and-achievements" className={`${inputClass} min-h-32 py-3`} value={profile.activitiesAndAchievements ?? ""} onChange={(event) => update("activitiesAndAchievements", event.target.value || null)} aria-describedby="activities-and-achievements-help" />
                  </FieldCard>
                ) : null}
              </>
            ) : null}

            {entryStage === "onboarding" && step === 4 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-forest-900 sm:text-2xl">Your admission profile is ready</h2>
                  <p className="mt-2 leading-6 text-muted">Review the information that will shape your deterministic analysis.</p>
                </div>

                <ReviewSection title="Target" onEdit={() => { setEditingFromReview(true); setEntryStage("target"); }}>
                  <p className="text-lg font-semibold text-ink">{target ? `${target.programName} @ ${target.universityName}` : "Not selected"}</p>
                  <p className="mt-1 text-sm text-muted">{target?.country ?? "Country unknown"}</p>
                </ReviewSection>

                <ReviewSection title="Goal" onEdit={() => edit(1)}>
                  <p className="text-lg font-semibold text-ink">{display(profile.targetDegree, "Not selected")}</p>
                  <p className="mt-1 text-ink">{display(profile.intendedField, "Not selected")}</p>
                  <p className="mt-1 text-sm text-muted">Current stage: {display(profile.currentStudyStage)}</p>
                </ReviewSection>

                <ReviewSection title="Academics" onEdit={() => edit(2)}>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-muted">GPA</dt><dd className="mt-1 font-semibold text-ink">{display(profile.gpa)}</dd></div>
                    <div><dt className="text-muted">IELTS</dt><dd className="mt-1 font-semibold text-ink">{display(profile.ieltsScore)}</dd></div>
                    <div><dt className="text-muted">SAT</dt><dd className="mt-1 font-semibold text-ink">{display(profile.satScore)}</dd></div>
                  </dl>
                  <p className="mt-4 border-t border-forest-100 pt-4 text-sm text-muted">Activities and achievements</p>
                  <p className="mt-1 text-sm text-ink">{profile.activitiesAndAchievements?.trim() || "Not provided"}</p>
                </ReviewSection>

                <ReviewSection title="Preferences" onEdit={() => edit(3)}>
                  <p className="font-semibold text-ink">{profile.preferredCountries.join(" · ") || "Countries not selected"}</p>
                  <p className="mt-2 text-sm text-ink">Preferred language: {display(profile.preferredLanguage, "No language preference")}</p>
                  <p className="mt-2 text-sm text-ink">{budgetLabel(profile)}</p>
                  <p className="mt-1 text-sm text-ink">{display(profile.targetIntake, "Intake not selected")}</p>
                </ReviewSection>

                {errors.targetIntake ? (
                  <div className="rounded-xl border border-sand-300 bg-sand-100 px-4 py-3 text-sm font-medium text-forest-900" role="alert">
                    {errors.targetIntake} Use the Preferences edit action above.
                  </div>
                ) : null}

                <section className="rounded-2xl bg-forest-900 p-5 text-white sm:p-6">
                  <h2 className="text-lg font-semibold">How we’ll use this</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-forest-100">
                    <li className="flex gap-3"><span aria-hidden="true">✓</span><span>Match your profile against verified program data</span></li>
                    <li className="flex gap-3"><span aria-hidden="true">✓</span><span>Keep unknown information unknown</span></li>
                    <li className="flex gap-3"><span aria-hidden="true">✓</span><span>Separate profile fit from eligibility — Fit Score is not admission probability</span></li>
                    <li className="flex gap-3"><span aria-hidden="true">✦</span><span>AI may help explain results later, but it cannot change eligibility, Fit Score, or verified program facts</span></li>
                  </ul>
                </section>
              </div>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-forest-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={handleBack}
              disabled={backDisabled}
              className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {backLabel}
            </button>
            <button
              type="submit"
              className="min-h-12 rounded-full bg-forest-700 px-7 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              {submitLabel}
            </button>
          </footer>
        </section>
      </div>
    </form>
  );
}
