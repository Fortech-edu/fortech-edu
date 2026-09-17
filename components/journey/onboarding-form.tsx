"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentProfile } from "../../types/admissions.ts";
import type { StoredProfile } from "../../lib/storage/profile.ts";
import { useClientReady } from "../../lib/storage/client-ready.ts";
import { loadStoredProfile, saveStoredProfile } from "../../lib/storage/profile.ts";

const stepDetails = [
  ["Education & interest", "Start with where you are now and what you want to study."],
  ["Academics", "Scores help us check requirements. Leave them blank if not taken yet."],
  ["Preferences", "Budget and location help us find practical options."],
  ["Timeline & review", "Confirm your profile before we build your diagnosis."],
] as const;

const countries = [
  "Australia",
  "Austria",
  "Canada",
  "Estonia",
  "Germany",
  "Malaysia",
  "United States",
] as const;

const emptyProfile: StudentProfile = {
  fullName: null,
  nationality: null,
  countryOfResidence: null,
  currentStudyStage: null,
  targetDegree: null,
  intendedField: null,
  preferredCountries: [],
  targetIntake: null,
  gpa: null,
  ieltsScore: null,
  satScore: null,
  annualBudget: null,
  budgetCurrency: "USD",
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-forest-200 bg-white px-3.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-forest-600 focus:ring-3 focus:ring-forest-100";
const labelClass = "block text-sm font-semibold text-forest-900";

function numberOrNull(value: string) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validStep(step: number, profile: StudentProfile) {
  if (step === 1) {
    return Boolean(
      profile.currentStudyStage && profile.targetDegree && profile.intendedField,
    );
  }
  if (step === 2) {
    return (
      (profile.gpa === null || (profile.gpa >= 0 && profile.gpa <= 4)) &&
      (profile.ieltsScore === null ||
        (profile.ieltsScore >= 0 && profile.ieltsScore <= 9)) &&
      (profile.satScore === null ||
        (profile.satScore >= 400 && profile.satScore <= 1600))
    );
  }
  if (step === 3) return profile.annualBudget === null || profile.annualBudget > 0;
  return profile.targetIntake !== null;
}

function display(value: string | number | null, fallback = "Not provided") {
  return value === null || value === "" ? fallback : String(value);
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
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveStoredProfile(profile, step, completed);
  }, [completed, profile, step]);

  function update<K extends keyof StudentProfile>(
    key: K,
    value: StudentProfile[K],
  ) {
    setCompleted(false);
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function toggleCountry(country: string) {
    setCompleted(false);
    setProfile((current) => ({
      ...current,
      preferredCountries: current.preferredCountries.includes(country)
        ? current.preferredCountries.filter((item) => item !== country)
        : [...current.preferredCountries, country],
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validStep(step, profile)) return;

    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    setCompleted(true);
    saveStoredProfile(profile, 4, true);
    router.push("/diagnosis");
  }

  const [title, description] = stepDetails[step - 1];
  const stepIsValid = validStep(step, profile);

  return (
    <form onSubmit={submit} className="rounded-3xl border border-forest-100 bg-white p-5 shadow-[0_18px_60px_rgba(23,52,41,.08)] sm:p-8">
      <div className="border-b border-forest-100 pb-6">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-forest-700">Step {step} of 4</span>
          <span className="text-muted">
            {step === 4 ? "Final review" : `${4 - step} steps remaining`}
          </span>
        </div>
        <div
          className="mt-3 grid grid-cols-4 gap-2"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step}
        >
          {[1, 2, 3, 4].map((item) => (
            <span
              key={item}
              className={`h-2 rounded-full ${item <= step ? "bg-forest-600" : "bg-forest-100"}`}
            />
          ))}
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-forest-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 leading-7 text-muted">{description}</p>
      </div>

      <div className="py-7">
        {step === 1 ? (
          <fieldset className="space-y-6">
            <legend className="sr-only">Education and interest</legend>
            <label className={labelClass} htmlFor="study-stage">
              Current study stage
              <select
                id="study-stage"
                className={inputClass}
                value={profile.currentStudyStage ?? ""}
                onChange={(event) => update("currentStudyStage", event.target.value || null)}
                required
              >
                <option value="">Select your current stage</option>
                <option>Grade 10</option>
                <option>Grade 11</option>
                <option>Grade 12</option>
                <option>Undergraduate student</option>
                <option>Graduate</option>
              </select>
            </label>

            <label className={labelClass} htmlFor="target-degree">
              Target degree
              <select
                id="target-degree"
                className={inputClass}
                value={profile.targetDegree ?? ""}
                onChange={(event) => update("targetDegree", event.target.value || null)}
                required
              >
                <option value="">Choose a degree</option>
                <option>Bachelor</option>
                <option>Master</option>
              </select>
            </label>

            <label className={labelClass} htmlFor="intended-field">
              Intended field
              <select
                id="intended-field"
                className={inputClass}
                value={profile.intendedField ?? ""}
                onChange={(event) => update("intendedField", event.target.value || null)}
                aria-describedby="field-help"
                required
              >
                <option value="">Choose a study field</option>
                <option>Computer Science</option>
                <option>Business</option>
              </select>
              <span id="field-help" className="mt-2 block text-sm font-normal leading-5 text-muted">
                Your primary recommendations will stay within this field and its explicitly related subjects.
              </span>
            </label>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="space-y-6">
            <legend className="sr-only">Academic information</legend>
            <label className={labelClass} htmlFor="gpa">
              Academic score / GPA <span className="font-normal text-muted">(optional)</span>
              <input
                id="gpa"
                className={inputClass}
                type="number"
                min="0"
                max="4"
                step="0.01"
                inputMode="decimal"
                placeholder="For example, 3.4 on a 4.0 scale"
                value={profile.gpa ?? ""}
                onChange={(event) => update("gpa", numberOrNull(event.target.value))}
              />
              <span className="mt-2 block text-sm font-normal text-muted">Leave blank if your GPA is unknown.</span>
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className={labelClass} htmlFor="ielts">
                IELTS score <span className="font-normal text-muted">(optional)</span>
                <input
                  id="ielts"
                  className={inputClass}
                  type="number"
                  min="0"
                  max="9"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="Not taken"
                  value={profile.ieltsScore ?? ""}
                  onChange={(event) => update("ieltsScore", numberOrNull(event.target.value))}
                />
              </label>
              <label className={labelClass} htmlFor="sat">
                SAT score <span className="font-normal text-muted">(optional)</span>
                <input
                  id="sat"
                  className={inputClass}
                  type="number"
                  min="400"
                  max="1600"
                  step="10"
                  inputMode="numeric"
                  placeholder="Not taken"
                  value={profile.satScore ?? ""}
                  onChange={(event) => update("satScore", numberOrNull(event.target.value))}
                />
              </label>
            </div>
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset className="space-y-7">
            <legend className="sr-only">Study preferences</legend>
            <div>
              <p className={labelClass}>Preferred countries <span className="font-normal text-muted">(optional)</span></p>
              <p className="mt-1 text-sm text-muted">Choose any countries you would seriously consider.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {countries.map((country) => (
                  <label
                    key={country}
                    className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-forest-200 px-3 text-sm font-medium text-ink has-checked:border-forest-600 has-checked:bg-forest-50"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-forest-700"
                      checked={profile.preferredCountries.includes(country)}
                      onChange={() => toggleCountry(country)}
                    />
                    {country}
                  </label>
                ))}
              </div>
            </div>

            <label className={labelClass} htmlFor="budget">
              Annual tuition budget in USD <span className="font-normal text-muted">(optional)</span>
              <input
                id="budget"
                className={inputClass}
                type="number"
                min="0"
                step="500"
                inputMode="numeric"
                placeholder="For example, 20000"
                value={profile.annualBudget ?? ""}
                onChange={(event) => update("annualBudget", numberOrNull(event.target.value))}
              />
              <span className="mt-2 block text-sm font-normal leading-5 text-muted">
                Tuition only. Living costs are not included in this MVP estimate.
              </span>
            </label>
          </fieldset>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <label className={labelClass} htmlFor="target-intake">
              Target intake
              <select
                id="target-intake"
                className={inputClass}
                value={profile.targetIntake ?? ""}
                onChange={(event) => update("targetIntake", event.target.value || null)}
                required
              >
                <option value="">Choose an intake</option>
                <option>Fall 2027</option>
                <option>Spring 2028</option>
                <option>Fall 2028</option>
              </select>
            </label>

            <div className="rounded-2xl bg-forest-50 p-5">
              <h2 className="font-semibold text-forest-900">Profile review</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Current stage", display(profile.currentStudyStage)],
                  ["Target degree", display(profile.targetDegree)],
                  ["Study field", display(profile.intendedField)],
                  ["GPA", display(profile.gpa, "Unknown")],
                  ["IELTS", display(profile.ieltsScore, "Not taken / unknown")],
                  ["SAT", display(profile.satScore, "Not taken / unknown")],
                  ["Countries", profile.preferredCountries.join(", ") || "Open to any"],
                  ["Annual budget", profile.annualBudget === null ? "Unknown" : `USD ${profile.annualBudget.toLocaleString()}`],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt className="text-muted">{term}</dt>
                    <dd className="mt-1 font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : null}
      </div>

      {!stepIsValid ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {step === 1 || step === 4
            ? "Complete the required fields to continue."
            : "Check that entered scores are within the shown ranges."}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-forest-100 pt-6 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setCompleted(false);
            setStep((current) => Math.max(1, current - 1));
          }}
          disabled={step === 1}
          className="min-h-12 rounded-full border border-forest-200 px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stepIsValid}
          className="min-h-12 rounded-full bg-forest-700 px-7 font-semibold text-white hover:bg-forest-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {step === 4 ? "Complete profile" : "Continue"}
        </button>
      </div>
    </form>
  );
}
