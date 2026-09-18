"use client";

import { useState } from "react";
import { getProgramById, programs } from "../../data/programs.ts";
import { buildTargetRequirementFacts, sourceTypeLabels } from "../../lib/admissions/presentation.ts";
import type { UniversityProgram } from "../../types/admissions.ts";

const universities = [...new Set(programs.map(({ universityName }) => universityName))].sort();
const inputClass =
  "product-input mt-2 min-h-[44px] w-full rounded-[10px] border border-[#D7E7FA] bg-white px-3.5 text-base text-[#10233F] outline-none transition placeholder:text-slate-400 hover:border-[#B7D2F0] focus:border-[#1677FF]";

const stateLabels = { known: "Published", unknown: "Needs verification", not_required: "Not required" } as const;
const stateStyles = {
  known: "bg-[#E7F6EC] text-[#16A34A] border border-[#BFE5CC]",
  unknown: "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
  not_required: "bg-[#EEF3F9] text-[#5B6B81] border border-[#D7E7FA]",
} as const;

export function TargetStep({ selected, attempted, onSelect }: { selected: UniversityProgram | null; attempted: boolean; onSelect: (program: UniversityProgram | null) => void }) {
  const [university, setUniversity] = useState(selected?.universityName ?? "");
  const availablePrograms = programs.filter((program) => program.universityName === university);

  return (
    <div className="space-y-0">
      <div className="field-group p-5 sm:p-6">
        <label className="block text-sm font-semibold text-[#10233F]" htmlFor="target-university">University</label>
        <p id="target-university-help" className="mt-1 text-sm leading-5 text-[#64748B]">Choose from the current verified program dataset.</p>
        <select id="target-university" className={inputClass} value={university} onChange={(event) => { setUniversity(event.target.value); onSelect(null); }} aria-describedby="target-university-help">
          <option value="">Choose a university</option>
          {universities.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>

      <div className="field-group p-5 sm:p-6">
        <label className="block text-sm font-semibold text-[#10233F]" htmlFor="target-program">Program</label>
        <p id="target-program-help" className="mt-1 text-sm leading-5 text-[#64748B]">Select the real program target whose requirements you want to review.</p>
        <select id="target-program" className={inputClass} value={selected?.id ?? ""} disabled={!university} onChange={(event) => onSelect(getProgramById(event.target.value || null))} aria-describedby={`target-program-help${attempted && !selected ? " target-program-error" : ""}`} aria-invalid={attempted && !selected}>
          <option value="">Choose a program</option>
          {availablePrograms.map((program) => <option key={program.id} value={program.id}>{program.programName}</option>)}
        </select>
        {attempted && !selected ? <p id="target-program-error" className="mt-2 text-sm font-medium text-red-700" role="alert">Choose a target program to continue.</p> : null}
      </div>

      {selected ? <RequirementsPreview program={selected} /> : (
        <div className="field-group p-5 text-sm leading-6 text-[#64748B] sm:p-6">Select a program to see its known requirements before entering your current profile.</div>
      )}
    </div>
  );
}

function RequirementsPreview({ program }: { program: UniversityProgram }) {
  const facts = buildTargetRequirementFacts(program);

  return (
    <section className="field-group bg-[#EDF4FD]/60 p-5 sm:p-6" aria-labelledby="target-requirements-title">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1677FF]">Your target</p>
      <div className="mt-2">
        <h2 id="target-requirements-title" className="university-name text-2xl font-bold tracking-tight text-[#10233F]">
          {program.universityName}
        </h2>
        <p className="program-name-subordinate text-lg font-semibold text-[#1677FF] mt-0.5">
          {program.programName}
        </p>
      </div>
      <p className="mt-2 text-sm text-[#64748B]">{program.country ?? "Unknown country"} · {program.degreeLevel ?? "Degree level unknown"}</p>
      <p className="mt-5 text-sm leading-6 text-[#10233F]">These are the known program facts available before we ask where you are today. Unknown information is not treated as a failed requirement.</p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.key} className="rounded-xl border border-[#D7E7FA] bg-white p-4 shadow-subtle">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <dt className="text-sm font-semibold text-[#10233F]">{fact.label}</dt>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${stateStyles[fact.state]}`}>{stateLabels[fact.state]}</span>
            </div>
            <dd className="mt-2 text-sm font-semibold leading-6 text-[#10233F]">{fact.value}</dd>
            <p className="mt-1 text-xs leading-5 text-[#64748B]">{fact.detail}</p>
          </div>
        ))}
      </dl>

      <div className="mt-6 border-t border-[#D7E7FA] pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1677FF]">Official sources</p>
        {program.sources.length ? (
          <ul className="mt-2 grid gap-x-5 sm:grid-cols-2">
            {program.sources.map((source) => (
              <li key={`${source.type}:${source.url}`} className="border-t border-[#D7E7FA] first:border-t-0 sm:first:border-t">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="block py-3 text-sm font-semibold text-[#1677FF] underline decoration-[#B7D2F0] underline-offset-4 hover:text-[#0F5EDB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677FF]">
                  <span className="mr-2 text-xs uppercase tracking-wide text-[#64748B]">{sourceTypeLabels[source.type]}</span>{source.title}
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-[#64748B]">No official source link is available.</p>}
      </div>
    </section>
  );
}
