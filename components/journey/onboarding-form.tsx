"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { programs } from "../../data/programs.ts";
import { buildChangeImpact } from "../../lib/admissions/change-impact.ts";
import { getPrimaryMatches } from "../../lib/admissions/matches.ts";
import {
  emptyProfile,
  numberOrNull,
  stepErrors,
  toggleCountry,
  validStep,
} from "../../lib/onboarding.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile, saveStoredProfile } from "../../lib/storage/profile.ts";
import type { StoredProfile } from "../../lib/storage/profile.ts";
import {
  clearEditBaseline,
  clearRecentChangeImpact,
  loadEditBaseline,
  saveEditBaseline,
  saveRecentChangeImpact,
} from "../../lib/storage/change-impact.ts";
import type { StudentProfile } from "../../types/admissions.ts";

const stepDetails = [
  ["Your direction", "Define the Bachelor journey you want to build."],
  ["Your academics", "Add what you know today. Blank scores remain unknown."],
  ["Your preferences", "Choose where, when, and what tuition budget works for you."],
  ["Your admission profile", "Review what we know before your profile is analyzed."],
] as const;

const countries = [...new Set(programs.flatMap(({ country }) => country ? [country] : []))].sort();
const currencies = [...new Set(programs.flatMap(({ tuitionCurrency }) => tuitionCurrency ? [tuitionCurrency] : []))].sort();
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

function StepProgress({ step }: { step: number }) {
  const labels = ["Direction", "Academics", "Preferences", "Review"];

  return (
    <nav aria-label="Onboarding progress">
      <ol className="space-y-1">
        {stepDetails.map(([title], index) => {
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

function ProfilePreview({ profile }: { profile: StudentProfile }) {
  const rows = [
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

function ReviewSection({ title, step, onEdit, children }: { title: string; step: number; onEdit: (step: number) => void; children: ReactNode }) {
  return (
    <section className="review-section p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-600">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="min-h-11 rounded-full px-3 text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:decoration-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
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
  return <OnboardingEditor key={initial?.updatedAt ?? "new"} initial={initial} />;
}

function OnboardingEditor({ initial }: { initial: StoredProfile | null }) {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile>(initial?.profile ?? emptyProfile);
  const [step, setStep] = useState(initial?.step ?? 1);
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
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
    saveStoredProfile(profile, step, completed);
  }, [completed, profile, step]);

  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setCompleted(false);
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function edit(stepNumber: number) {
    setCompleted(false);
    setAttemptedStep(null);
    setStep(stepNumber);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      if (impact.programChanges.length > 0) saveRecentChangeImpact(impact);
      else clearRecentChangeImpact();
    } else {
      clearRecentChangeImpact();
    }
    clearEditBaseline();
    saveStoredProfile(profile, 4, true);
    router.push("/diagnosis");
  }

  const [title, description] = stepDetails[step - 1];
  const errors = stepErrors(step, profile);
  const showRequiredErrors = attemptedStep === step;
  const unsupportedCountries = profile.preferredCountries.filter((country) => !countries.includes(country));
  const availableCurrencies = [...new Set([...currencies, ...(profile.budgetCurrency ? [profile.budgetCurrency] : [])])];

  return (
    <form onSubmit={submit} noValidate className="onboarding-layout grid items-start gap-8 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.6fr)] lg:gap-12">
      <aside className="sticky top-6 hidden space-y-6 lg:block">
        <div className="editorial-section p-4">
          <StepProgress step={step} />
        </div>
        <div className="accent-section p-6">
          <ProfilePreview profile={profile} />
          <p className="mt-5 border-t border-sand-300 pt-4 text-xs leading-5 text-muted">
            We use verified program facts for matching. Missing information stays unknown.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="editorial-section mb-5 p-4 lg:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-forest-700">Step {step} of 4</p>
              <p className="mt-0.5 font-semibold text-forest-900">{title}</p>
            </div>
            <span className="text-sm text-muted">{Math.round((step / 4) * 100)}%</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`Step ${step} of 4`} role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}>
            {[1, 2, 3, 4].map((item) => <span key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-forest-700" : "bg-forest-100"}`} />)}
          </div>
          <details className="mt-4 border-t border-forest-100 pt-3">
            <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
              Your profile so far <span className="mt-1 block font-normal text-muted">{profileSummary(profile)} · View summary</span>
            </summary>
            <div className="mt-3 rounded-xl bg-sand-100/70 p-4"><ProfilePreview profile={profile} /></div>
          </details>
        </div>

        <section className="onboarding-panel overflow-hidden">
          <header className="border-b border-forest-100 px-5 py-6 sm:px-8 sm:py-8">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-forest-600 lg:block">Step {String(step).padStart(2, "0")} of 04</p>
            <h1 id="onboarding-step-heading" className="mt-3 text-3xl font-semibold leading-[0.95] text-forest-900 sm:text-5xl">{title}</h1>
            <p className="mt-2 max-w-2xl leading-7 text-muted">{description}</p>
          </header>

          <div key={step} className="onboarding-step-content space-y-0 bg-[var(--surface)] px-5 py-2 sm:px-8 sm:py-4">
            {step === 1 ? (
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

            {step === 2 ? (
              <>
                <div className="rounded-2xl border border-sand-300 bg-sand-100 px-4 py-3 text-sm leading-6 text-forest-900">
                  <strong>Blank means unknown.</strong> We never turn a missing score into a pass or a fail.
                </div>
                <FieldCard>
                  <label className={labelClass} htmlFor="gpa">GPA <span className="font-normal text-muted">Optional</span></label>
                  <p id="gpa-help" className="mt-1 text-sm leading-5 text-muted">Add your GPA on the supported 0–4 scale, if you know it.</p>
                  <input id="gpa" className={inputClass} type="number" min="0" max="4" step="0.01" inputMode="decimal" placeholder="3.5" value={profile.gpa ?? ""} onChange={(event) => update("gpa", numberOrNull(event.target.value))} aria-describedby={`gpa-help${errors.gpa ? " gpa-error" : ""}`} aria-invalid={Boolean(errors.gpa)} />
                  <ErrorText id="gpa-error">{errors.gpa}</ErrorText>
                </FieldCard>
                <FieldCard>
                  <label className={labelClass} htmlFor="ielts">IELTS <span className="font-normal text-muted">Optional</span></label>
                  <p id="ielts-help" className="mt-1 text-sm leading-5 text-muted">Haven’t taken IELTS yet? Leave this blank; the requirement stays unknown until program facts are checked.</p>
                  <input id="ielts" className={inputClass} type="number" min="0" max="9" step="0.5" inputMode="decimal" placeholder="6.0" value={profile.ieltsScore ?? ""} onChange={(event) => update("ieltsScore", numberOrNull(event.target.value))} aria-describedby={`ielts-help${errors.ieltsScore ? " ielts-error" : ""}`} aria-invalid={Boolean(errors.ieltsScore)} />
                  <ErrorText id="ielts-error">{errors.ieltsScore}</ErrorText>
                </FieldCard>
                <FieldCard>
                  <label className={labelClass} htmlFor="sat">SAT <span className="font-normal text-muted">Optional</span></label>
                  <p id="sat-help" className="mt-1 text-sm leading-5 text-muted">Leave blank if not taken. Missing SAT is not treated as a failed score.</p>
                  <input id="sat" className={inputClass} type="number" min="400" max="1600" step="10" inputMode="numeric" placeholder="1200" value={profile.satScore ?? ""} onChange={(event) => update("satScore", numberOrNull(event.target.value))} aria-describedby={`sat-help${errors.satScore ? " sat-error" : ""}`} aria-invalid={Boolean(errors.satScore)} />
                  <ErrorText id="sat-error">{errors.satScore}</ErrorText>
                </FieldCard>
              </>
            ) : null}

            {step === 3 ? (
              <>
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
              </>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-forest-900 sm:text-2xl">Your admission profile is ready</h2>
                  <p className="mt-2 leading-6 text-muted">Review the information that will shape your deterministic analysis.</p>
                </div>

                <ReviewSection title="Goal" step={1} onEdit={edit}>
                  <p className="text-lg font-semibold text-ink">{display(profile.targetDegree, "Not selected")}</p>
                  <p className="mt-1 text-ink">{display(profile.intendedField, "Not selected")}</p>
                  <p className="mt-1 text-sm text-muted">Current stage: {display(profile.currentStudyStage)}</p>
                </ReviewSection>

                <ReviewSection title="Academics" step={2} onEdit={edit}>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-muted">GPA</dt><dd className="mt-1 font-semibold text-ink">{display(profile.gpa)}</dd></div>
                    <div><dt className="text-muted">IELTS</dt><dd className="mt-1 font-semibold text-ink">{display(profile.ieltsScore)}</dd></div>
                    <div><dt className="text-muted">SAT</dt><dd className="mt-1 font-semibold text-ink">{display(profile.satScore)}</dd></div>
                  </dl>
                </ReviewSection>

                <ReviewSection title="Preferences" step={3} onEdit={edit}>
                  <p className="font-semibold text-ink">{profile.preferredCountries.join(" · ") || "Countries not selected"}</p>
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
            <button type="button" onClick={() => { setCompleted(false); setAttemptedStep(null); setStep((current) => Math.max(1, current - 1)); }} disabled={step === 1} className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-40">
              Back
            </button>
            <button type="submit" className="min-h-12 rounded-full bg-forest-700 px-7 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
              {step === 4 ? "Analyze my profile" : "Continue"}
            </button>
          </footer>
        </section>
      </div>
    </form>
  );
}
