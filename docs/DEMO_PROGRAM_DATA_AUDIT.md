# Demo program data audit — 2026-09-18

Scope: the 5 programs most likely to appear in the hackathon demo walkthrough.
Objective: replace avoidable `Unknown`/`null` values with verified official
facts, and correct one factual/policy violation found along the way. No
programs were added or removed; `StudentProfile`, scoring, eligibility,
roadmap logic, diagnosis logic, and the Matches UI were not touched.

All research used only official university domains, located via search but
never taken from search snippets, aggregators, or third-party sources
(Studyportals, Reddit, Wikipedia, rankings sites, blogs, consultants). Every
fetched page was opened directly; several findings were independently
spot-checked a second time before being written into `data/programs.ts`.

---

## Astana IT University — Computer Science (Bachelor)

### Verified
- **English proficiency (IELTS/TOEFL/etc.) is optional, not required.** The
  international-applicant document checklist requests proof of B2-level
  English "if any" — explicitly framed as elective.
- **Language of instruction: English**, stated directly on the international
  admissions page for bachelor programs.
- **Tuition confirmed unchanged**: USD 5,000/year for international bachelor
  applicants, matching the previous record exactly.

### Still unknown
- **SAT policy** — not mentioned anywhere on the international admissions
  page. Left `null`.
- **Motivation letter / recommendation letters** — the required-documents
  checklist (passport, diploma, transcript, English proof "if any", photos)
  does not include either, but the page does not explicitly state they are
  *not* required. Per the task's own rule ("do not treat 'not mentioned on
  one page' as false"), both fields stay unknown rather than `false`.
- **Deadline year** — "August 24" appears on two official pages as a
  recurring annual date, never tied to a specific admission cycle (2026,
  2027, or otherwise). Left as-is: `"August 24 (year not specified)"`.

### Corrections made in `data/programs.ts`
- `languageOfInstruction`: `null` → `"English"`
- `ieltsRequirement`: `null` → `{ label: "English proficiency certificate", minimumScore: null, isRequired: false, notes: "..." }`
- `applicationDocuments`: added explicitly as `null` (documents that this was checked and remains unknown, distinct from never having been audited)
- `verificationDate`: `2026-09-17` → `2026-09-18`
- Added one source entry (same URL, more precise title) for the
  international-admissions page covering both the language finding and the
  English-proficiency finding.

### Official sources
- https://astanait.edu.kz/en/Computer-Science-bachelor
- https://astanait.edu.kz/how-to-apply
- https://astanait.edu.kz/inc-academ

### Notes
- A separate `/academic-mobility-foreign-citizens` page was found and
  deliberately excluded: it describes a short-term exchange/mobility program
  with its own IELTS 6.0/TOEFL 72 requirement, which does not apply to
  degree-seeking bachelor applicants and would have been a wrong-context
  inference if used.

---

## University of Twente — Technical Computer Science (Bachelor of Science)

### Verified
- No change to previously-verified fields (academic requirement, IELTS,
  language of instruction, tuition) — all reconfirmed against current
  official pages, no drift found.

### Still unknown
- **SAT/ACT policy** — not mentioned on the general diploma-equivalence page
  or the USA-specific diploma-equivalence page (which lists AP exams as the
  US equivalency route, with no mention of SAT/ACT at all, positive or
  negative). Left `null` rather than inferred from the absence of a US-route
  mention.
- **Motivation letter / recommendation letters** — the official "Required
  application documents" page enumerates 13 closed document categories; a
  letter of motivation or recommendation appears in none of them. As with
  AITU, this is treated as unknown, not `false`, per the explicit
  not-mentioned-is-not-false rule.
- **Deadline** — the only published date found (30 April 2026) is for the
  **2026** intake, while the recorded tuition already reflects the
  **2027–2028** cycle. Reusing a different cycle's date would have been a
  fabricated precision, so this stays unknown. Flagged below as a caveat.

### Corrections made in `data/programs.ts`
- `applicationDocuments`: added explicitly as `null`
- `verificationDate`: `2026-09-17` → `2026-09-18`
- Added one source (the official required-documents page)

### Official sources
- https://www.utwente.nl/en/education/bachelor/programmes/technical-computer-science/
- https://www.utwente.nl/en/education/bachelor/programmes/technical-computer-science/enrolment/
- https://www.utwente.nl/en/education/bachelor/application-admission/admission/language-requirements/
- https://www.utwente.nl/en/education/bachelor/how-to-apply/required-application-documents/
- https://www.utwente.nl/en/education/bachelor/programmes/technical-computer-science/enrolment/tuition-fees/

### Notes
- **Cycle mismatch caveat for the reviewer**: the recorded tuition (€16,869)
  is explicitly labeled 2027–2028, but the only deadline UT currently
  publishes is for the 2026 intake. This is plausibly normal (EU
  universities often publish next year's fees before that year's admission
  cycle opens), but it means the record currently mixes two different
  intake years across two different fields. Worth a follow-up check closer
  to when UT opens the 2027 cycle rather than assuming today.

---

## LUT University — Software and Systems Engineering (Bachelor of Science, Technology)

### Verified
- **No drift on any previously-verified field.** IELTS (6.5 overall / 6.0
  writing+speaking), SAT (accepted alternative route, not mandatory),
  language of instruction (English), and deadline (2027-04-30) all matched
  the current official pages exactly, including a full-text search of LUT's
  official Admissions Guide 2026–2027 PDF.

### Still unknown
- **Motivation letter / recommendation letters** — neither appears in the
  admission-criteria page's enumerated document list, nor anywhere in a
  full-text search of the official Admissions Guide PDF (searched for
  "motivation," "recommendation," "reference letter," "personal statement,"
  "CV," "essay" — zero matches). This is a strong absence signal but not an
  explicit exclusion statement, so both fields stay unknown per the same
  rule applied to AITU and Twente.

### Corrections made in `data/programs.ts`
- `applicationDocuments`: added explicitly as `null`
- `verificationDate`: `2026-09-17` → `2026-09-18`
- Added one source (the official Admissions Guide PDF, used for the
  full-text negative check)

### Official sources
- https://www.lut.fi/en/studies/tekniikka/bachelors-programme-software-and-systems-engineering-hebut-double-degree
- https://www.lut.fi/en/studies/apply-lut/applying-bachelors-programmes/rolling-admission-bachelors-studies/admission-criteria-non-eu-eea-applicants
- https://www.lut.fi/en/studies/apply-lut/applying-bachelors-programmes/international-rolling-admission-bachelors-studies
- https://www.lut.fi/sites/default/files/media/documents/LUT-Admissions-guide-2026-2027-for-web.pdf

### Notes
- One official page (the technology-bachelor's rolling-admission
  admission-criteria page, which has its own "Required documents" heading)
  renders its content inside an accordion that could not be extracted by
  the available fetch tooling. A follow-up pass with a live browser session
  against that specific URL could resolve the two unknown fields
  definitively — flagged for the reviewer rather than guessed at.

---

## Hong Kong University of Science and Technology — Computer Science (Bachelor of Engineering)

### Verified
- **IELTS Academic, overall band 6.0**, university-wide minimum for
  applicants using the international-qualification English proficiency
  route. Confirmed on two independent official pages (the official English
  Language Admission Requirement PDF and the School of Engineering's
  international-admissions page).
- **SAT is not a universal requirement.** It is one route within HKUST's
  "American Pattern" international-qualification pathway: SAT ≥1,190
  combined with AP scores, or ACT ≥24 as an alternative. It does not apply
  to applicants presenting other qualification systems (A-Levels, IB,
  etc.), so it is recorded as `isRequired: false` with the route explained
  in `notes` rather than as a blocking numeric threshold.
- **A personal statement (motivation letter) is required.**
- **At least one academic referee (recommendation) is required** — the
  application form collects referee contact details and the system emails
  a reference form directly to that person.
- **Official tuition: HKD 260,000 for the 2027/28 academic year**, for
  non-local/international undergraduate students. HKUST's own fees page
  additionally states an official approximate USD equivalent (~USD
  33,000) — that is HKUST's own published conversion, not a conversion we
  performed.

### Still unknown
- Nothing new was left unknown for this record; every field in scope was
  confirmed from an official page.

### Corrections made in `data/programs.ts`
- **`tuition`: `33000` → `260000`; `tuitionCurrency`: `"USD"` → `"HKD"`.**
  This official-currency policy is applied consistently across all four HKUST undergraduate programs (`hkust-computer-science`, `hkust-data-science-technology`, `hkust-finance`, `hkust-global-business`):
  the previous records stored a USD conversion of the officially-published HKD figure,
  violating the product's core policy ("preserve the published currency, never perform our own
  exchange-rate conversion"). All four records now store the official published HKD 260,000 per year
  directly, leaving HKUST's own published USD approximation in secondary notes only.
- `ieltsRequirement`: `null` → `{ label: "IELTS Academic", minimumScore: 6, isRequired: true, notes: "..." }`
- `satRequirement`: `null` → `{ label: "SAT (American Pattern route)", minimumScore: null, isRequired: false, notes: "..." }`
- `applicationDocuments`: unset → `{ motivationLetter: true, recommendationLetters: true }`
- `verificationDate`: `2026-09-17` → `2026-09-18`
- Added two sources (the official English Language Admission Requirement
  PDF, and the School of Engineering's international-qualifications page
  covering the SAT route)

### Official sources
- https://prog-crs.hkust.edu.hk/ugprog/2026-27/COMP
- https://join.hkust.edu.hk/admissions/international-qualifications
- https://join.hkust.edu.hk/faq
- https://join.hkust.edu.hk/fees-and-scholarships
- https://join.hkust.edu.hk/admissions/international-qualifications/application-procedures
- https://join.hkust.edu.hk/oas/elar.pdf
- https://seng.hkust.edu.hk/academics/undergraduate/2026-admissions/international-qualifications

### Notes
- This is the highest-impact correction in this audit: it fixes a real
  policy violation (an invented currency conversion) that the reviewer
  flagged as a risk before this task started, and it unlocks two roadmap
  steps (motivation letter, recommendation letters) that the deterministic
  roadmap generator (`lib/admissions/roadmap.ts`) already supports but
  could not surface for this program while both fields were unset.

---

## Arizona State University — Data Science (Bachelor of Science), Tempe

### Verified
- **A personal statement/essay is explicitly not required** for first-year
  admission: "ASU does not have a preference for which application you use
  to apply, and we do not require an essay or personal statement for
  either of these options." The international first-year page adds no
  essay requirement on top of this.
- **Academic requirements offer multiple alternative aptitude routes**:
  ASU first-year admission allows applicants to meet any one of several
  criteria: top 25% of high school graduating class, 3.00 unweighted GPA
  in competency courses, ACT 22 (24 nonresidents), or SAT 1120 (1180
  nonresidents). Modeling a rigid "GPA 3.0 minimum" would produce false
  deterministic failures ("Action needed") for applicants who qualify
  via SAT/ACT or class rank. Following the catalog's modeling for other
  ASU programs, this is modeled as `label: "Aptitude requirement"`,
  `minimumScore: null`, and `isRequired: true` with explanatory notes so it
  correctly resolves as `Needs verification`.
- **Application deadline**: ASU operates on rolling admission with
  published priority (Nov 1) and regular (Jan 15) filing dates rather than
  a single fixed future deadline. Storing `2026-01-15` represented an
  obsolete past date (Fall 2026 priority). In accordance with the rule to
  never invent an unverified future deadline or display a past deadline as
  current, `deadline` is kept `null` with clarifying notes.
- **No single generally-applicable tuition figure exists** for this major.
  ASU's own tuition estimator requires residency status, campus,
  college/program, and credit-hour load as inputs before it will show a
  number, confirming the previous `null` tuition fields were the correct
  representation, not a research gap.

### Still unknown
- **Language of instruction** — an English proficiency *admission*
  requirement was found (for applicants not from English-speaking
  countries), but no official page was found stating directly that
  instruction is delivered in English. Left `null` rather than inferred
  from the proficiency requirement or from the country.
- **Recommendation letters** — no official page addresses this one way or
  the other for first-year/international first-year admission (ASU's
  recommendation-letter language only appears for graduate admission).
  Left `null`.

### Corrections made in `data/programs.ts`
- `academicRequirement`: `{ label: "GPA", minimumScore: 3, ... }` →
  `{ label: "Aptitude requirement", minimumScore: null, isRequired: true, notes: "Meet one published route: GPA, SAT, ACT, or class rank. No single GPA threshold applies to every applicant." }`
- `applicationDocuments`: unset → `{ motivationLetter: false, recommendationLetters: null }`
- `deadline`: kept `null` (avoiding stale `2026-01-15` date; ASU uses rolling admissions)
- `verificationDate`: `2026-09-17` → `2026-09-18`
- Added sources for first-year admission requirements and dates

### Official sources
- https://degrees.asu.edu/bachelors/major/ASU00/LADATSCIBS/data-science
- https://admission.asu.edu/apply/international/first-year
- https://admission.asu.edu/apply/first-year/admission
- https://tuition.asu.edu/cost/tuition-estimator

### Notes
- The Data Science major page itself carries no admission-specific
  content — it routes entirely to ASU's university-wide international
  first-year process, which is why the deadline, aptitude, and document findings
  above apply university-wide rather than to this major specifically.

---

## Validation

- Focused tests (`lib/admissions/matches.test.ts`, `lib/admissions/presentation.test.ts`): pass, including two new/updated tests protecting the corrected facts (currency policy, unknown-vs-false handling) and one pre-existing test updated to reflect the new verification date and LUT source list — not to work around a real regression.
- Full `npm test`: 210/210 passing (208 pre-existing + 2 new assertions folded into one new test).
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- `npm run build`: clean production build, all 11 routes generated successfully.
- `git diff --check`: clean, no whitespace/conflict-marker issues.

## Important caveats for the reviewer

1. **Twente cycle mismatch**: tuition is labeled 2027–2028 but the only
   published deadline is for 2026. Not fixed (would require inventing a
   date), just flagged.
2. **LUT accordion content**: one official page's "Required documents"
   section could not be extracted by available tooling; a live-browser
   follow-up could resolve the two remaining unknown fields there.
3. **AITU/Twente/LUT application documents**: all three stay unknown by
   design, per the task's explicit rule that absence from an enumerated
   list is not the same as an explicit "not required" statement — even
   though in all three cases the evidence leans toward "probably not
   required."
