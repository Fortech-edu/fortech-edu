"use client";

import { useState } from "react";
import { getProgramById, programs } from "../../data/programs.ts";
import { buildTargetRequirementFacts, sourceTypeLabels } from "../../lib/admissions/presentation.ts";
import type { UniversityProgram } from "../../types/admissions.ts";

const universities = [...new Set(programs.map(({ universityName }) => universityName))].sort();
const inputClass = "product-input mt-2 min-h-12 w-full border border-forest-200 bg-white px-3.5 text-base text-ink outline-none transition";
const stateLabels = { known: "Published", unknown: "Needs verification", not_required: "Not required" } as const;
const stateStyles = {
  known: "bg-forest-100 text-forest-700",
  unknown: "bg-slate-100 text-slate-700",
  not_required: "bg-forest-50 text-forest-700",
} as const;

export function TargetStep({ selected, attempted, onSelect }: { selected: UniversityProgram | null; attempted: boolean; onSelect: (program: UniversityProgram | null) => void }) {
  const [university, setUniversity] = useState(selected?.universityName ?? "");
  const availablePrograms = programs.filter((program) => program.universityName === university);

  return (
    <div className="space-y-0">
      <div className="field-group p-5 sm:p-6">
        <label className="block text-sm font-semibold text-forest-900" htmlFor="target-university">University</label>
        <p id="target-university-help" className="mt-1 text-sm leading-5 text-muted">Choose from the current verified program dataset.</p>
        <select id="target-university" className={inputClass} value={university} onChange={(event) => { setUniversity(event.target.value); onSelect(null); }} aria-describedby="target-university-help">
          <option value="">Choose a university</option>
          {universities.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>

      <div className="field-group p-5 sm:p-6">
        <label className="block text-sm font-semibold text-forest-900" htmlFor="target-program">Program</label>
        <p id="target-program-help" className="mt-1 text-sm leading-5 text-muted">Select the real program target whose requirements you want to review.</p>
        <select id="target-program" className={inputClass} value={selected?.id ?? ""} disabled={!university} onChange={(event) => onSelect(getProgramById(event.target.value || null))} aria-describedby={`target-program-help${attempted && !selected ? " target-program-error" : ""}`} aria-invalid={attempted && !selected}>
          <option value="">Choose a program</option>
          {availablePrograms.map((program) => <option key={program.id} value={program.id}>{program.programName}</option>)}
        </select>
        {attempted && !selected ? <p id="target-program-error" className="mt-2 text-sm font-medium text-red-700" role="alert">Choose a target program to continue.</p> : null}
      </div>

      {selected ? <RequirementsPreview program={selected} /> : (
        <div className="field-group p-5 text-sm leading-6 text-muted sm:p-6">Select a program to see its known requirements before entering your current profile.</div>
      )}
    </div>
  );
}

function RequirementsPreview({ program }: { program: UniversityProgram }) {
  const facts = buildTargetRequirementFacts(program);

  return (
    <section className="field-group bg-forest-50/70 p-5 sm:p-6" aria-labelledby="target-requirements-title">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-forest-600">Your target</p>
      <h2 id="target-requirements-title" className="mt-2 text-2xl font-semibold text-forest-900">{program.programName} @ {program.universityName}</h2>
      <p className="mt-2 text-sm text-muted">{program.country ?? "Unknown country"} · {program.degreeLevel ?? "Degree level unknown"}</p>
      <p className="mt-5 text-sm leading-6 text-ink">These are the known program facts available before we ask where you are today. Unknown information is not treated as a failed requirement.</p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.key} className="rounded-xl border border-forest-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <dt className="text-sm font-semibold text-forest-900">{fact.label}</dt>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${stateStyles[fact.state]}`}>{stateLabels[fact.state]}</span>
            </div>
            <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{fact.value}</dd>
            <p className="mt-1 text-xs leading-5 text-muted">{fact.detail}</p>
          </div>
        ))}
      </dl>

      <div className="mt-6 border-t border-forest-200 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest-600">Official sources</p>
        {program.sources.length ? (
          <ul className="mt-2 grid gap-x-5 sm:grid-cols-2">
            {program.sources.map((source) => (
              <li key={`${source.type}:${source.url}`} className="border-t border-forest-100 first:border-t-0 sm:first:border-t">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="block py-3 text-sm font-semibold text-forest-700 underline decoration-forest-200 underline-offset-4 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600">
                  <span className="mr-2 text-xs uppercase tracking-wide text-muted">{sourceTypeLabels[source.type]}</span>{source.title}
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">No official source link is available.</p>}
      </div>
    </section>
  );
}
