import { buildInstantDiagnosis } from "../../lib/admissions/instant-diagnosis.ts";
import { numberOrNull, type OnboardingErrorKey } from "../../lib/onboarding.ts";
import type {
  ComparisonStatus,
} from "../../lib/admissions/presentation.ts";
import type { StudentProfile, UniversityProgram } from "../../types/admissions.ts";

type CurrentStateKey = "currentStudyStage" | "gpa" | "ieltsScore" | "satScore";

const inputClass = "product-input mt-2 min-h-12 w-full border border-forest-200 bg-white px-3.5 text-base text-ink outline-none transition placeholder:text-slate-400";
const statusStyles: Record<ComparisonStatus, string> = {
  Match: "bg-forest-100 text-forest-700",
  "Action needed": "bg-amber-100 text-amber-900",
  "Needs verification": "bg-slate-100 text-slate-700",
  "Not required": "bg-forest-50 text-forest-700",
  "Not comparable": "bg-slate-100 text-slate-700",
};

function show(value: string | number | null) {
  return value === null || value === "" ? "Unknown" : String(value);
}

function ErrorText({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} className="mt-2 text-sm font-medium text-red-700" role="alert">{children}</p> : null;
}

export function InstantCurrentState({
  profile,
  errors,
  onUpdate,
}: {
  profile: StudentProfile;
  errors: Partial<Record<OnboardingErrorKey, string>>;
  onUpdate: (key: CurrentStateKey, value: string | number | null) => void;
}) {
  return (
    <div className="space-y-0">
      <div className="rounded-2xl border border-sand-300 bg-sand-100 px-4 py-3 text-sm leading-6 text-forest-900">
        <strong>Blank means unknown.</strong> Add only what you know today; missing values are never treated as confirmed failures.
      </div>

      <div className="field-group p-5 sm:p-6">
        <label className="block text-sm font-semibold text-forest-900" htmlFor="instant-study-stage">Current study stage <span className="font-normal text-muted">Optional</span></label>
        <p id="instant-study-stage-help" className="mt-1 text-sm leading-5 text-muted">This adds timeline context and does not affect deterministic matching.</p>
        <select id="instant-study-stage" className={inputClass} value={profile.currentStudyStage ?? ""} onChange={(event) => onUpdate("currentStudyStage", event.target.value || null)} aria-describedby="instant-study-stage-help">
          <option value="">Not provided</option>
          <option>Grade 10</option>
          <option>Grade 11</option>
          <option>Grade 12</option>
          <option>Undergraduate student</option>
          <option>Graduate</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-3">
        <div className="field-group p-5 sm:p-6">
          <label className="block text-sm font-semibold text-forest-900" htmlFor="instant-gpa">GPA <span className="font-normal text-muted">Optional</span></label>
          <p id="instant-gpa-help" className="mt-1 text-sm leading-5 text-muted">Supported 0–4 scale.</p>
          <input id="instant-gpa" className={inputClass} type="number" min="0" max="4" step="0.01" inputMode="decimal" placeholder="3.5" value={profile.gpa ?? ""} onChange={(event) => onUpdate("gpa", numberOrNull(event.target.value))} aria-describedby={`instant-gpa-help${errors.gpa ? " instant-gpa-error" : ""}`} aria-invalid={Boolean(errors.gpa)} />
          <ErrorText id="instant-gpa-error">{errors.gpa}</ErrorText>
        </div>
        <div className="field-group p-5 sm:p-6">
          <label className="block text-sm font-semibold text-forest-900" htmlFor="instant-ielts">IELTS <span className="font-normal text-muted">Optional</span></label>
          <p id="instant-ielts-help" className="mt-1 text-sm leading-5 text-muted">Leave blank if not taken.</p>
          <input id="instant-ielts" className={inputClass} type="number" min="0" max="9" step="0.5" inputMode="decimal" placeholder="6.0" value={profile.ieltsScore ?? ""} onChange={(event) => onUpdate("ieltsScore", numberOrNull(event.target.value))} aria-describedby={`instant-ielts-help${errors.ieltsScore ? " instant-ielts-error" : ""}`} aria-invalid={Boolean(errors.ieltsScore)} />
          <ErrorText id="instant-ielts-error">{errors.ieltsScore}</ErrorText>
        </div>
        <div className="field-group p-5 sm:p-6">
          <label className="block text-sm font-semibold text-forest-900" htmlFor="instant-sat">SAT <span className="font-normal text-muted">Optional</span></label>
          <p id="instant-sat-help" className="mt-1 text-sm leading-5 text-muted">Leave blank if not taken.</p>
          <input id="instant-sat" className={inputClass} type="number" min="400" max="1600" step="10" inputMode="numeric" placeholder="1200" value={profile.satScore ?? ""} onChange={(event) => onUpdate("satScore", numberOrNull(event.target.value))} aria-describedby={`instant-sat-help${errors.satScore ? " instant-sat-error" : ""}`} aria-invalid={Boolean(errors.satScore)} />
          <ErrorText id="instant-sat-error">{errors.satScore}</ErrorText>
        </div>
      </div>
    </div>
  );
}

export function InstantDiagnosisResult({ profile, program }: { profile: StudentProfile; program: UniversityProgram }) {
  const result = buildInstantDiagnosis(profile, program);
  const unresolved = result.comparisons.filter(({ status }) => status === "Needs verification" || status === "Not comparable").length;

  return (
    <div className="space-y-6 py-4">
      <section className="rounded-2xl bg-forest-900 p-5 text-white sm:p-6" aria-labelledby="instant-target-title">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-100">Target</p>
        <h2 id="instant-target-title" className="mt-2 text-2xl font-semibold">{program.programName}</h2>
        <p className="mt-2 text-forest-100">{program.universityName} · {program.country ?? "Country unknown"}</p>
      </section>

      <section className="field-group p-5 sm:p-6" aria-labelledby="instant-current-title">
        <h2 id="instant-current-title" className="text-lg font-semibold text-forest-900">Current state</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ["Study stage", show(profile.currentStudyStage)],
            ["GPA", show(profile.gpa)],
            ["IELTS", show(profile.ieltsScore)],
            ["SAT", show(profile.satScore)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-forest-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
              <dd className="mt-1 font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="instant-comparison-title">
        <h2 id="instant-comparison-title" className="text-xl font-semibold text-forest-900">Requirement comparison</h2>
        <div className="mt-3 space-y-3">
          {result.comparisons.map((row) => (
            <article key={row.key} className="rounded-2xl border border-forest-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-semibold text-forest-900">{row.label}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[row.status]}`}>{row.status}</span>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Requirement</dt><dd className="mt-1 font-semibold text-ink">{row.programValue}</dd></div>
                <div><dt className="text-muted">Your current value</dt><dd className="mt-1 font-semibold text-ink">{row.profileValue}</dd></div>
              </dl>
              <p className="mt-3 text-sm leading-6 text-muted">{row.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="field-group p-5 sm:p-6" aria-labelledby="instant-gaps-title">
        <h2 id="instant-gaps-title" className="text-xl font-semibold text-forest-900">Biggest gaps</h2>
        {result.biggestGaps.length ? (
          <ul className="mt-4 space-y-3">
            {result.biggestGaps.map((gap) => <li key={gap.key} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>{gap.label}:</strong> {gap.detail}</li>)}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">No confirmed gap appears in the comparable values you provided.{unresolved ? ` ${unresolved} item${unresolved === 1 ? "" : "s"} still need information or verification.` : " This is not an admission guarantee."}</p>
        )}
      </section>

      <section aria-labelledby="instant-actions-title">
        <h2 id="instant-actions-title" className="text-xl font-semibold text-forest-900">Next actions</h2>
        <ol className="mt-3 space-y-3">
          {result.nextActions.map((action, index) => (
            <li key={action.id} className="rounded-2xl border border-forest-100 bg-white p-4 sm:p-5">
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-forest-700 text-sm font-bold text-white">{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-forest-900">{action.title}</h3>
                    <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-bold text-forest-900">{action.basis}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{action.relatedRequirement}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{action.description}</p>
                  {action.officialSourceUrl ? <a href={action.officialSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4">Check official source</a> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="rounded-xl bg-sand-100 px-4 py-3 text-sm leading-6 text-forest-900">This diagnosis is available before signup. Build the full plan only when you are ready to continue.</p>
    </div>
  );
}
