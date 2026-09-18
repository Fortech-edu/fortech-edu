# AGENTS.md — Fortech Repository Rules

This file defines how coding agents and contributors must work in this repository.

## 1. Source of truth

Before any non-trivial implementation task, read:

1. `AGENTS.md`
2. `docs/FORTECH_MASTER_TZ.md`
3. `docs/IMPLEMENTATION_PLAN.md`

The Master TZ defines product behavior and constraints.  
The Implementation Plan defines execution order and priorities.

If a task conflicts with either document, do **not** guess. Stop and report:
- the conflicting requirement;
- the affected files/behavior;
- the safest resolution options.

Do not invent product requirements outside the TZ.

---

## 2. Git workflow

### Never implement feature work directly on `main`

Before starting a task:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b <type>/<short-task-name>
```

Allowed branch prefixes:

- `feature/`
- `fix/`
- `chore/`
- `docs/`
- `test/`

Examples:

- `fix/roadmap-strong-profile`
- `feature/language-of-instruction`
- `feature/activities-context`
- `feature/goal-first-flow`
- `feature/ria-sec-profiler`
- `docs/readme-submission`

### One logical task per branch

Do not combine unrelated product work in one branch.

### Never force-push `main`

Do not:
- commit feature work directly to `main`;
- force-push `main`;
- rewrite shared history;
- merge your own branch into `main` unless the user explicitly asks.

When work is complete:

1. update/rebase from latest `origin/main` if needed;
2. resolve conflicts carefully;
3. run required validation;
4. commit;
5. push the feature branch;
6. report branch name, commit SHA, validation results, and notable risks;
7. wait for review/merge.

---

## 3. Parallel-development rules

Assume another developer or agent may be working at the same time.

Before editing shared core files, inspect latest `origin/main`.

High-conflict areas include:

- `StudentProfile` and related profile types/defaults;
- `UniversityProgram` and admissions data types;
- onboarding/preferences;
- `scoring.ts`;
- roadmap generation;
- diagnosis/recommendation types;
- AI response types/validators;
- shared design tokens/layout.

Rules:

- keep diffs scoped;
- do not reformat unrelated files;
- do not rename/move shared files without task necessity;
- do not perform opportunistic refactors;
- avoid changing public types unless the task requires it;
- when a public type changes, update all consumers and tests in the same branch.

If `main` changed materially in a shared area during your task, rebase/merge latest `main` before final QA.

---

## 4. Product architecture guardrails

The intended core product loop is:

**Dream → Requirements → Current State → Gap → Plan → Progress → Recalculation**

The user should understand:
- what target they chose;
- what that target requires;
- what is known about their current state;
- what gaps are confirmed;
- what is unknown;
- what to do next;
- why the action matters;
- what changed after profile updates.

Prefer **show, don't tell** UX.

---

## 5. Deterministic logic vs AI

Preserve the existing working AI pipeline unless a task explicitly requires changes:

**UI → `/api/ai/...` → provider → structured response → validation → UI**

The current provider/fallback/validator layer is considered stable infrastructure.

### Deterministic/verified systems own

- admissions requirements;
- eligibility rules;
- deadlines;
- known language/test requirements;
- scoring;
- gap calculation;
- match evidence;
- change-impact calculation;
- task state.

### AI owns

- explanation;
- summarization;
- prioritization wording;
- contextual guidance;
- human-readable reasoning.

AI must **not** fabricate:
- requirements;
- deadlines;
- test thresholds;
- tuition;
- scholarships;
- acceptance probabilities;
- guarantees;
- official university facts.

When evidence is missing, preserve uncertainty:
- `Unknown`
- `Needs verification`
- equivalent existing repo status

Do not convert unknown data into a negative match.

---

## 6. Data integrity and research

For admissions facts, prefer official university/program sources.

When adding or changing factual program data:

- preserve source/provenance using the repo's existing mechanism;
- do not infer a requirement only from country, prestige, typical practice, or model knowledge;
- use `null`/unknown when the fact cannot be verified;
- keep exact source URLs only in the existing source/provenance model, not scattered through UI code;
- add/update tests for unknown handling.

Research tasks must clearly report:
- which records were verified;
- which remain unknown;
- which source types were used.

---

## 7. Student-safety and UX rules

Fortech serves school-age users. Product copy must not manipulate users through fear, shame, or body/social comparison.

Do not use claims such as:
- "you are not good enough";
- "you will not get in without Fortech";
- guaranteed admission;
- fake precision about admission chances.

Urgency must come from factual signals:
- verified gaps;
- verified deadlines;
- workload;
- incomplete requirements.

Use warning/red states only for real semantic gaps or deadlines, not as psychological pressure.

---

## 8. Scoring rules

Do not add arbitrary weights merely to make a feature affect ranking.

If a factor has no defensible admissions relationship, keep it:
- informational;
- contextual;
- or explicitly outside deterministic scoring.

Examples:
- extracurricular free text is context, not a score unless evidence exists;
- RIASEC interests are career/major exploration context, not admissions eligibility;
- unknown language of instruction must not be treated as mismatch.

Any scoring change must be:
- explainable;
- testable;
- visible in match evidence;
- consistent with the Master TZ.

---

## 9. RIASEC / O*NET rules

RIASEC is an exploration aid, not an admissions score and not a definitive statement of a student's "correct" career.

If implementing the O*NET Interest Profiler:

- use current official O*NET documentation/services or properly licensed content;
- preserve required attribution;
- verify the current license before shipping;
- do not silently modify official assessment content if the applicable license does not allow it;
- keep RIASEC results out of admissions scoring;
- phrase results as "areas/majors to explore", not a deterministic career verdict.

The MVP is specified in the Master TZ.

---

## 10. Design rules

Do not clone another product's composition or brand identity.

Visual references may inspire:
- contrast;
- typography quality;
- spacing;
- interaction polish.

Do not invent a QAIRU palette or font. If exact palette/font is not provided or verified, leave the design decision explicit and pending.

Design priorities:
1. clear hierarchy;
2. one memorable product screen;
3. meaningful accent color;
4. distinctive but readable typography;
5. restrained microinteractions;
6. excellent mobile behavior.

Animations must respect reduced-motion preferences.

---

## 11. Required QA

Before declaring a coding task complete, run the relevant checks available in the repo.

Minimum expected for product code:

- relevant unit/integration tests;
- full test suite when practical;
- typecheck;
- lint;
- production build for production-affecting changes.

For UI tasks also perform manual QA of affected routes on:
- desktop;
- mobile.

Check:
- browser console;
- failed network requests;
- loading/error/empty states;
- keyboard/focus behavior where relevant.

Never hide or waive a failing check without reporting it.

---

## 12. Completion report

Every implementation task must end with a concise report:

1. branch name;
2. commit SHA;
3. files changed;
4. behavior implemented;
5. tests/checks run and results;
6. research/data records verified, if applicable;
7. known limitations or unknown data;
8. migration/backward-compatibility concerns;
9. manual routes/states the reviewer should inspect.

Do not claim a task is complete if acceptance criteria are not met.
