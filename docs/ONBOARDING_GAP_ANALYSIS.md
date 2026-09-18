# ONBOARDING_GAP_ANALYSIS.md

Audit of the current onboarding implementation against `docs/FORTECH_MASTER_TZ.md` ("Master TZ") and `docs/IMPLEMENTATION_PLAN.md`.

- **Baseline audited:** `origin/main` at `bf78c6d` (Merge PR #4 `feature/language-of-instruction`). This includes the language-of-instruction work (P0.3), which was merged into main **during** this audit; the audit therefore reflects it as shipped behavior.
- **Branch:** `docs/onboarding-gap-analysis` (docs-only; no application code changed).
- **Method:** static inspection of source and tests at the baseline commit + running the repository test suite. **No browser/device/manual QA was performed** in this audit; all mobile/accessibility findings below are code-level observations, and runtime behavior is marked as unknown where it applies.
- **Parallel work noticed:** while auditing, another workstream (`feature/activities-context`, Task 3 of the Implementation Plan) began editing `onboarding-form.tsx`, `onboarding.ts`, `storage/profile.ts`, `supabase/sync.ts`, and `types/admissions.ts` in a shared worktree. Its uncommitted contents are **unknown** to this audit and are treated as an in-flight change to the P0.4 activities gap (§G7).

Line references are to the baseline commit `bf78c6d`.

---

## 1. What exists on origin/main today (observed)

### Routes

| Route | Role |
|---|---|
| `/` | Static landing/marketing page; every CTA links to `/onboarding` ("Start profile", "Build my profile") |
| `/onboarding` | 4-step client-side wizard (`OnboardingForm`): 1 Direction → 2 Academics → 3 Preferences → 4 Review; submit routes to `/diagnosis` |
| `/diagnosis` | Profile-level diagnosis (strengths / gaps / missing information) + AI explanation enhancement |
| `/matches` | Ranked recommendation list from `getPrimaryMatches(profile)`; compare selection (max 2) |
| `/matches/[programId]` | Program detail: profile-vs-program criteria, score breakdown, sources, "Build my roadmap" (sets selected program) |
| `/compare` | Side-by-side factual comparison of the 2 selected programs |
| `/roadmap` | Deterministic roadmap for the selected program with task completion progress |
| `/api/ai/diagnosis`, `/api/ai/explanation` | AI explanation endpoints (provider/fallback/validator/cache layer) |

### Current product loop

`Landing → /onboarding (form-first questionnaire) → /diagnosis (profile-level) → /matches → program detail (choose target) → /roadmap`, with change-impact computed inside the onboarding submit and surfaced on `/matches`.

### Persistence model

- **Local draft:** `StoredProfile` v1 in localStorage (`admission-journey:v1:profile`) — profile + `step` (1–4) + `completed` + `updatedAt` (`lib/storage/profile.ts`). Validated on load; restored by `OnboardingForm` via `useClientReady`.
- **Journey state:** selected program id, compare ids (max 2), per-program completed roadmap task ids (`lib/storage/selection.ts`, `lib/storage/progress.ts`, aggregated by `lib/storage/journey.ts`).
- **Edit baseline / recent change impact:** sessionStorage; recent impact has a 30-minute TTL (`lib/storage/change-impact.ts`).
- **Cloud sync:** Supabase anonymous sign-in; last-write-wins by `updatedAt` for profile and journey rows (`lib/supabase/sync.ts`); schema in `supabase/schema.sql` (`profiles.profile` jsonb, `step smallint check between 1 and 4`, `journey_state`). Sync is background-only ("Cloud sync runs in the background when configured", `/onboarding` page) — there is **no signup wall anywhere in the flow**.
- **Remote payload hygiene:** `serializeProfile` persists only active profile fields; identifying fields (`fullName`, `nationality`, `countryOfResidence`) are intentionally excluded (tested in `lib/supabase/sync.test.ts` "profile payload excludes unused identifying fields").

### Data model (`types/admissions.ts`)

- `StudentProfile`: `fullName`, `nationality`, `countryOfResidence`, `currentStudyStage`, `targetDegree`, `intendedField`, `preferredCountries[]`, `preferredLanguage`, `targetIntake`, `gpa`, `ieltsScore`, `satScore`, `annualBudget`, `budgetCurrency`.
- `UniversityProgram`: 18 verified Bachelor records in `data/programs.ts` (AITU ×3, Twente ×3, LUT ×3, HKUST ×4, ASU ×5) with `academicRequirement`/`ieltsRequirement`/`satRequirement` (nullable, `isRequired: boolean | null`), `languageOfInstruction: string | null`, `applicationDocuments?` (typed but **null/absent in all 18 records**), `deadline`, `sources[]` with provenance, `verificationDate`.
- Latent/uncollected fields: `fullName`, `nationality`, `countryOfResidence` are typed and validated but **never collected by any UI**; they are always `null` in real flows and excluded from cloud sync.

### Deterministic core (owned by deterministic logic, per AGENTS.md §5)

`lib/admissions/`: `scoring.ts` (weighted Fit Score with `null` = unknown components; known-weight normalization), `eligibility.ts` (`eligible_now | with_actions | requires_verification | not_eligible`; unknown requirement ⇒ `requires_verification`), `recommend.ts` (field filter + eligibility filter + reasons/gaps), `presentation.ts` (requirement formatting + profile-vs-program criteria with `Match | Action needed | Needs verification | Not required | Not comparable`), `diagnosis.ts` (profile-level strengths/gaps/missing), `change-impact.ts` (input diff + per-program recommendation diff), `roadmap.ts` (NOW/PREPARE/APLY phases, verification-first, strong-profile state `hasStrongProfileState`).

### AI layer (stable infrastructure — do not refactor)

`lib/ai/` provider/fallback/validator/cache + 2 endpoints; client components `DiagnosisEnhancement` (diagnosis page) and `RecommendationEnhancement` (program detail) with sessionStorage cache, fallback copy, and explicit "AI cannot change deterministic results" disclosure. `service.rewriteRoadmapTask` exists but **no UI calls it**. Onboarding itself makes **no AI calls** (consistent with Master TZ P0.9 "AI is not needed on every onboarding step").

### Validation state at baseline (this audit's runs)

- `npm test`: **144/144 pass**.
- `npm run lint`: pass.
- `npx tsc --noEmit`: 1 **pre-existing** error — `app/layout.tsx(16,50): TS2304: Cannot find name 'LayoutProps'` (Next.js generated route type; produced only after `next build`/`next dev` typegen). Not introduced by this branch; docs-only change either way.

---

## 2. Gap analysis by current onboarding behavior

Legend — Risk: 🔴 high / 🟠 medium / 🟡 low. Disposition: **Reuse** (keep as-is), **Modify** (extend in place), **Remove** (drop).

---

### G1. Landing entry into onboarding (form-first entry)

- **Current implementation:** All landing CTAs (`app/page.tsx` lines 61, 85, 261, 274) link to `/onboarding`. The landing demonstrates the product via a static illustrative preview built from **real** program facts (`previewProgram = lut-software-systems-engineering`, real comparison rows, roadmap preview) — honest, but not interactive. The hero message is "Know where you stand. Know what to do next."
- **Target behavior (Master TZ 3.1, 3.2, P0.5, P0.17):** The main value flow should start with a concrete goal — "Where do you want to get in?" — collecting country/university/program/grade, and the landing should *demonstrate* the flow (target → requirements → gap) rather than lead with a profile questionnaire.
- **Exact gap:** No goal-first entry point exists anywhere; the first user input is the abstract Direction questionnaire. The landing is also missing the "profile change → recalculation" demonstration and has no interactive target input.
- **Affected files:** `app/page.tsx`; (new goal-first entry route/component, e.g. an admission-check entry, to be added per Task 4); `components/ui/product-shell.tsx` (nav "Profile" action wording).
- **Risk:** 🟠 — product-defining change (P0), but contained at entry points; downstream screens are not yet touched (Implementation Plan Task 4 explicitly defers that).
- **Dependencies:** G2 (target entity) — goal-first entry without a real target model would recreate the landing-only object the TZ forbids.
- **Disposition:** **Modify** landing CTAs to lead to a goal-first entry; **Reuse** the landing's real-facts preview discipline (it already follows "no fake screenshots"). Keep the existing `/onboarding` reachable as the full-profile path.

---

### G2. Target University + Program entry (no target entity in onboarding)

- **Current implementation:** Onboarding step 1 collects `targetDegree` (Bachelor-only, validated) and `intendedField` (`Computer Science` | `Business` — the only two fields in the program set). The only persisted "target" is `journey_state.selected_program_id` (localStorage + Supabase `journey_state.selected_program_id`), settable only from a program-detail page *after* matches exist (`program-detail-view.tsx` `choose()` → `saveSelectedProgram` → `/roadmap`).
- **Target behavior (P0.5 "Target entity"):** The selected university + program (e.g. "Computer Science @ University X") should be a first-class product target collected at the start, mapping into the same domain used by program detail, diagnosis, matches, and roadmap; no duplicate/parallel target model.
- **Exact gap:** The user never names a university or program during onboarding. `intendedField` is a proxy for a target, not a target. Consequently: (a) requirements of any specific program are never shown before/during onboarding (see G3); (b) `recommendPrograms` returns `[]` unless `intendedField` is set and `targetDegree === "Bachelor"` (`lib/admissions/recommend.ts:115`); (c) a program that is `not_eligible` is **filtered out** of matches entirely (`recommend.ts:120`), and program detail for it renders "This program is not in your current matches" — so a user whose target is currently unattainable cannot even view that target's requirements or gap (TZ P0.7 requires the gap view; §7 forbids converting weakness into invisibility).
- **Affected files:** `components/journey/onboarding-form.tsx` (step 1), `lib/onboarding.ts` (validation), `types/admissions.ts` (if a target concept is added to `StudentProfile` or if `journey_state.selected_program_id` is promoted — the latter already exists and is the natural carrier), `lib/admissions/recommend.ts` (eligibility-filter semantics for a chosen target), `lib/storage/selection.ts` / `lib/supabase/sync.ts` (target lifecycle), `components/matches/program-detail-view.tsx` (reachable detail for chosen target).
- **Risk:** 🔴 — this is the structural P0.5 gap everything else (requirements-first, instant diagnosis, state transfer) hangs on.
- **Dependencies:** Reuse `UniversityProgram` ids; no new domain type should be invented (TZ: "Do not introduce duplicate target/profile models"). Program search/selection UI needs the 18-program catalog (`data/programs.ts`) grouped by university.
- **Disposition:** **Modify** — extend the existing `selected_program_id` journey state into the target carrier; **Reuse** `fieldsMatch`, eligibility, and presentation criteria unchanged; **Modify** `recommendPrograms` so a user-chosen target program is never silently dropped from its own detail/roadmap views (show its real status instead).

---

### G3. Requirements-before-profile flow

- **Current implementation:** Requirements are only visible *after* the full questionnaire, on `/matches/[programId]` (`ProfileProgramComparison`, `ProgramFacts`) and in roadmap verification steps. Onboarding steps show purpose copy per field ("This choice materially shapes which verified programs enter your recommendation set") but never show any program's actual requirements.
- **Target behavior (P0.6):** After selecting a target, show known program requirements first (academics, language, tests, prerequisites, documents, deadlines — only categories with data, each labeled verified/unknown/needs-verification), then ask "Where are you today?".
- **Exact gap:** The sequence is inverted: questions first, requirements (if any) later. There is no requirements surface between target selection and profile questions.
- **Affected files:** new requirements step/screen in the goal-first flow (Task 4); rendering can **reuse** `buildProfileProgramCriteria` (`lib/admissions/presentation.ts`) and `formatRequirement` — both already preserve verified/unknown/needs-verification distinctions; `data/programs.ts` is the fact source.
- **Risk:** 🟠 — UI/flow work; low logic risk because the deterministic criteria renderer already exists and is tested (`presentation.test.ts`).
- **Dependencies:** G2 (target must exist first). Note `applicationDocuments` is null in all 18 records — documents must render as "needs verification", never as a requirement (the roadmap already does this correctly at `lib/admissions/roadmap.ts:157-165`).
- **Disposition:** **Reuse** the criteria/presentation layer; **Modify** onboarding to interpose a requirements view after target selection.

---

### G4. Duplicated questions

- **Current implementation:** Each profile field is asked exactly once inside the wizard. Two minor internal repetitions exist: `targetIntake` is validated at step 3 and re-checked at step 4 (`lib/onboarding.ts:65-74`) with a "Use the Preferences edit action above" alert — an intentional guard, not a duplicate question; and the profile summary is rendered in four places (desktop sidebar `ProfilePreview`, mobile collapsible summary, step-4 review, diagnosis hero) — presentation duplication only.
- **Target behavior (P0.9):** "Do not ask the same questions again" — once the instant check (P0.8) exists, onboarding must collect **only missing** information.
- **Exact gap:** No duplication exists *today* because there is no earlier input surface. The risk is prospective: when the instant check and goal-first entry are added (P0.8), GPA/IELTS/SAT/grade/country answers would be collected twice unless prefill (G5) lands with it. Additionally, in a goal-first flow `intendedField` becomes redundant with the chosen program's `field` and should be derived, not asked.
- **Affected files:** future `feature/instant-diagnosis` and `feature/onboarding-prefill` branches; `components/journey/onboarding-form.tsx`; `lib/onboarding.ts`.
- **Risk:** 🟡 today; 🟠 if P0.8 ships without G5.
- **Dependencies:** G5 (state transfer) is the mechanism that prevents duplication.
- **Disposition:** **Reuse** the single-source wizard fields; make the instant-check → onboarding hand-off the only place dedupe logic is added.

---

### G5. Prefill / state transfer into onboarding

- **Current implementation:** The only prefill mechanism is the local draft restore: `OnboardingForm` reads `StoredProfile` and remounts the editor at the saved step (`key={initial?.updatedAt ?? "new"}`), with a "Restoring your saved progress…" guard against hydration mismatch. There is no entry-state hand-off (no query params, no separate entry storage, no instant-check state).
- **Target behavior (P0.9):** Persist/prefill target country, university, program, grade/year, and any academic/English/test values provided in the pre-onboarding instant check; onboarding collects only what is missing; refresh/navigation behavior defined and tested; existing onboarding works without pre-entry data.
- **Exact gap:** No state-transfer channel exists. `StoredProfile` has no concept of "came from instant check", and the supabase `profiles` row likewise carries only wizard state. Note the sync layer's remote-profile validation is **key-count sensitive** (see G8) — a naive new field would be rejected on old remote payloads; follow the legacy-keys pattern used for `preferredLanguage`.
- **Affected files:** `components/journey/onboarding-form.tsx` (merge entry state into `initial`), `lib/storage/profile.ts` (if a new field/version), `lib/supabase/sync.ts` (only if the transfer state must survive devices), `lib/onboarding.ts` (step-skipping logic).
- **Risk:** 🟠 — must preserve backwards compatibility (existing users without entry state) and keep the draft-restore behavior intact.
- **Dependencies:** G2/G4; should land immediately after the instant diagnosis (Implementation Plan Task 6 after Task 5).
- **Disposition:** **Modify** the existing `StoredProfile`/restore path rather than adding a parallel transfer model. Reuse `useClientReady` restore timing.

---

### G6. Preferred language (P0.3) — implemented; residual gaps

Shipped at baseline (PR #4): `StudentProfile.preferredLanguage: string | null` and `UniversityProgram.languageOfInstruction: string | null` (`types/admissions.ts`); onboarding Preferences select "What language would you prefer to study in?" with "No preference" and languages derived from verified program data (`onboarding-form.tsx:421-429`); review shows it (`onboarding-form.tsx:481`); storage validation accepts legacy profiles without the field and normalizes to `null` (`lib/storage/profile.ts`); remote sync accepts both 11-key (new) and 10-key (legacy) payloads (`lib/supabase/sync.ts:85-100`); match evidence in `explain()` ("Taught in your preferred language" / "Language of instruction needs verification" / "Program is taught in X; your preference is Y", `lib/admissions/recommend.ts:83-92`); a `languageOfInstruction` criterion in the profile-vs-program view and compare table (`lib/admissions/presentation.ts:154-162, 217`); data verified for 11/18 programs (all Twente/LUT/HKUST = "English"), 7 remain `null` (AITU ×3, ASU ×5) — unknowns honestly preserved. Scoring was **not** changed: language alignment is evidence-only, which satisfies TZ P0.3's "no large arbitrary weight" constraint (note: the pre-existing `languageFit` score component is IELTS-based; the TZ-scoring item "positive alignment exposure" is arguably satisfied via evidence rows — if it is ever moved into `calculateFit`, that decision must be explicit and tested).

Residual gaps:

1. **ProfilePreview omits language** — the desktop sidebar and mobile "Your profile so far" summary (`onboarding-form.tsx:134-168`) do not show `preferredLanguage`, while step-4 review and diagnosis hero don't either — inconsistent summary surfaces.
2. **Diagnosis ignores language** — `diagnoseProfile` (`lib/admissions/diagnosis.ts`) has no language strength/unknown entry (e.g. "Preferred language set" as context), and the diagnosis profile panel doesn't display it.
3. **Change impact ignores language** — `buildChangeImpact` tracks `intendedField`, `targetDegree`, `annualBudget(+currency)`, `preferredCountries`, `ieltsScore`, `satScore` (`lib/admissions/change-impact.ts:142-197`) but not `preferredLanguage` (nor `gpa`, nor `targetIntake` — see G12). Changing language preference produces no `changedInputs` entry.
4. **Roadmap ignores language** — no "verify language of instruction" roadmap task for the 7 programs where `languageOfInstruction` is unknown, while IELTS/SAT/academic unknowns do generate verification tasks (`roadmap.ts scoreTasks`, `isUnknown` block). This is the same "unknown ⇒ verification step" pattern the TZ expects elsewhere.
5. **Research residue (unknown, per TZ §9):** AITU and ASU language values remain unverified `null`; a research pass on official sources is still owed before the hackathon ("all 18 records reviewed" is the Task 2 acceptance bar; 11/18 currently carry values).
6. **"No preference" vs "not answered"** are both `null` (allowed by TZ P0.3: "use the smallest backwards-compatible representation"). Accepted as-is; only revisit if the product needs to distinguish them.

- **Affected files:** `components/journey/onboarding-form.tsx`, `lib/admissions/diagnosis.ts`, `lib/admissions/change-impact.ts` (+ presentation), `lib/admissions/roadmap.ts`, `data/programs.ts` (research).
- **Risk:** 🟡 each item; low logic risk, all follow existing patterns.
- **Dependencies:** none blocking; item 3 interacts with the in-flight activities branch (same change-impact files) — serialize, don't parallelize.
- **Disposition:** **Modify** in place (small extensions); **Reuse** everything shipped in PR #4; do not rework the storage/sync migration pattern that landed.

---

### G7. Activities and achievements (P0.4) — missing on main; work in flight

- **Current implementation:** No field, no UI, no storage, no test. Nothing in `StudentProfile` for olympiads/projects/volunteering.
- **Target behavior (P0.4):** Optional free-text `activitiesAndAchievements` on `StudentProfile`; optional onboarding input with the "context only, does not affect deterministic matching" note; diagnosis Strengths context; roadmap application-material guidance; no scoring weight; no climate/environment questions.
- **Exact gap:** Entire P0.4 scope. **In-flight:** branch `feature/activities-context` exists with uncommitted edits to exactly the files this feature touches (`onboarding-form.tsx`, `onboarding.ts`, `storage/profile.ts`, `supabase/sync.ts`, `types/admissions.ts`); its contents are **unknown** to this audit. Per the Implementation Plan's conflict matrix, language and activities must not be developed in parallel from stale mains — language has now merged, so the in-flight branch is correctly sequenced.
- **Affected files (expected):** `types/admissions.ts`, `lib/onboarding.ts` (`emptyProfile`), `components/journey/onboarding-form.tsx` (input + review + previews), `lib/storage/profile.ts` (`isStudentProfile` + normalization), `lib/supabase/sync.ts` (`serializeProfile`, `profileKeys`, legacy-keys acceptance), `lib/supabase/types.ts` (`PersistedStudentProfile`), `lib/admissions/diagnosis.ts`, `lib/admissions/roadmap.ts`, tests (`onboarding.test.ts`, `sync.test.ts`, `diagnosis.test.ts`, `roadmap.test.ts`).
- **Risk:** 🟠 — straightforward pattern, but it is the highest merge-conflict surface on main right now (see §5).
- **Dependencies:** Merge before goal-first/state-transfer work starts on the same files (Implementation Plan Merge Gate ordering: Language → Activities → Goal-first).
- **Disposition:** **Modify** (extend) — the checklist in §4 must be followed for the new field. Do not start overlapping edits until it lands.

---

### G8. Profile persistence & backward compatibility

- **Current implementation (strong — reuse as the migration template):**
  - `isStudentProfile` accepts legacy objects missing `preferredLanguage`; `parseStoredProfileValue` normalizes it to `null` (`lib/storage/profile.ts`).
  - Remote parsing accepts both the new 11-key payload and the legacy 10-key payload; unknown/malformed payloads are rejected without breaking local state; last-write-wins by `updatedAt`; remote payloads carry source state only (never derived recommendations/roadmaps) — all tested in `lib/supabase/sync.test.ts`.
  - Local draft restore is validated and falls back to a fresh profile on corruption.
  - Cloud schema: `profiles.step smallint check (between 1 and 4)` (`supabase/schema.sql:7`) — **a hard constraint tied to the 4-step wizard**.
- **Target behavior (P0.9 acceptance + AGENTS.md §6):** Onboarding changes must not destroy existing user data; refresh/navigation behavior defined and tested.
- **Exact gap / risk points for the planned work:**
  1. Any new `StudentProfile` field must touch **six** synchronization points (see checklist §4) or old clients will silently reject new remote payloads (and vice versa).
  2. If the wizard gains steps (goal-first restructure), `StoredProfile.step` bounds (1–4) in `parseStoredProfileValue`, `parseRemoteProfile`, **and the DB CHECK constraint** must be migrated together; a remote row with `step: 5` currently fails validation and would be ignored (local wins), and the DB would reject the upsert outright.
  3. `StoredProfile.version` is 1 with no documented bump policy — decide bump-vs-tolerant-parse before restructuring the wizard.
  4. Journey state (`selected_program_id`, compare ids, task ids) is target-ready and needs no migration for G2 — reuse it.
- **Affected files:** `lib/storage/profile.ts`, `lib/supabase/sync.ts`, `lib/supabase/types.ts`, `supabase/schema.sql`, `lib/storage/journey.ts`.
- **Risk:** 🔴 if wizard structure changes without the migration checklist; 🟡 for additive optional fields following the `preferredLanguage` pattern.
- **Dependencies:** every profile-field and step-structure change (G5, G7, G2).
- **Disposition:** **Reuse** the whole validation/sync layer and its patterns; **Modify** only via the documented checklist.

---

### G9. Review screen (step 4) completeness

- **Current implementation:** "Your admission profile is ready" — Goal / Academics / Preferences review sections with per-section Edit (returns to the step and un-completes the draft), an intake-missing alert, and a "How we'll use this" trust panel (unknown stays unknown; Fit Score ≠ admission probability; AI cannot change facts). Preferred language was added to the review by PR #4.
- **Target behavior:** Master TZ P0.8's mini-diagnosis is the "review that shows value"; the TZ's North Star (§2) expects the user to know *what the target requires* before analysis. The review screen itself is not separately specified, so the bar is: complete, honest, consistent with other summary surfaces.
- **Exact gap:** (a) `preferredLanguage` missing from the desktop/mobile `ProfilePreview` summary (inconsistent with step 4); (b) review shows only profile facts — with no target concept (G2) there is nothing requirement-shaped to review; (c) latent fields `fullName`/`nationality`/`countryOfResidence` are typed, validated, synced-as-excluded, but never collected or displayed — a product decision (collect or remove from the type) is pending and currently creates dead code in `emptyProfile`, `isStudentProfile`, `toStudentProfile` (`lib/ai/schemas.ts:122-129`), and sync tests.
- **Affected files:** `components/journey/onboarding-form.tsx` (ProfilePreview, ReviewSection), `types/admissions.ts` + validators (if latent fields are resolved), `lib/onboarding.test.ts`.
- **Risk:** 🟡.
- **Dependencies:** (b) depends on G2; (a) can land anytime.
- **Disposition:** **Modify** (add language to `ProfilePreview`); **Reuse** the review-section/Edit pattern; decide and document the fate of the three latent fields before goal-first work (removing them touches sync tests that explicitly assert their exclusion).

---

### G10. Transition to Diagnosis (and the missing instant diagnosis)

- **Current implementation:** Onboarding submit computes change-impact against the edit baseline (returning users), clears the baseline, persists `completed: true`, and routes to `/diagnosis` (`onboarding-form.tsx:234-264`). Diagnosis is profile-level: strengths ("IELTS score is available"…), profile-level gaps, missing-information list, unknown count, AI explanation, CTA to matches. Empty state routes users back to onboarding when no completed profile exists. Diagnosis requires a completed profile — there is **no pre-signup instant diagnosis** route or flow.
- **Target behavior (P0.8, P0.10):** After a *small number of inputs* (before any account/wall), an instant mini-diagnosis with Target / Timeline / Requirement status / Biggest gaps / 3–5 next actions, then CTA into the full product. The post-onboarding **full diagnosis** should be target-centric: target summary, requirement coverage, strengths, biggest gaps, unknowns, priorities, roadmap preview, AI explanation.
- **Exact gap:** (a) No instant diagnosis exists (P0.8 wholly missing — expected, Task 5); (b) the full diagnosis answers "where do I stand on my profile" but not "where do I stand for **my target**": no requirement-coverage section, no target summary, no timeline/deadline section, no roadmap preview; (c) next actions are capped at 3 profile-gap strings (`diagnosis-view.tsx:96`), not the TZ's 3–5 *concrete deterministic* next actions; (d) no signup wall exists — this TZ requirement is already satisfied and must be preserved.
- **Affected files:** `components/journey/diagnosis-view.tsx`, `lib/admissions/diagnosis.ts` (extend toward requirement coverage — **reuse** `buildProfileProgramCriteria` and `evaluateEligibility`; do not duplicate), new instant-check route (Task 5), `components/ai/enhancements.tsx` (DiagnosisEnhancement is reusable for both surfaces with cache).
- **Risk:** 🔴 (P0 centerpiece), but built from existing tested parts.
- **Dependencies:** G2 (target needed for target-centric diagnosis); G5 (state transfer into onboarding afterwards); AI cost controls (P0.15) already implemented for diagnosis (fingerprint cache + fallback).
- **Disposition:** **Reuse** the deterministic diagnosis/criteria engine, the enhancement component, and the no-signup-wall property; **Modify**/extend diagnosis content; **Add** the instant-check entry as a new surface that reuses the same engine.

---

### G11. Mobile behavior (code-level observations only)

- **Current implementation:** Wizard: mobile gets a compact "Step X of 4" header, a `role="progressbar"` segmented bar, and a collapsible profile summary; the sticky sidebar is desktop-only (`hidden lg:block`); footer buttons stack via `flex-col-reverse`; inputs use `inputMode` (`decimal`/`numeric`) and 12–14 min-height tap targets; program comparison collapses to stacked cards with sr-only column labels; landing uses fluid `clamp()` typography and `100svh` hero.
- **Target behavior (P0.20):** Required mobile passes over landing, target/check, result, onboarding, diagnosis, matches, program detail, roadmap, compare — no horizontal overflow, readable cards, input/keyboard behavior, tap targets, loading/error/empty states, console/network checks.
- **Exact gap:** None *provable* from code; the required **manual mobile QA has not been performed** in this audit (unknown runtime state: keyboard behavior, overflow at small widths, iOS number-input UX for GPA/IELTS/SAT/budget fields).
- **Affected files:** none to change yet; QA targets `onboarding-form.tsx`, `matches-view.tsx`, `program-presentation.tsx` (criteria table), landing.
- **Risk:** 🟡 (verification debt, not known defect).
- **Dependencies:** should be re-run after goal-first and diagnosis changes (Task 14 final QA).
- **Disposition:** **Reuse** current responsive patterns; schedule the P0.20 pass after Tasks 4–6.

---

### G12. Accessibility (code-level observations only)

- **Current implementation:** Fieldsets/legends per question group; `aria-describedby` help + error wiring; `role="alert"` errors; `aria-invalid` on inputs; `aria-current="step"`; `role="progressbar"` with value attributes; `sr-only` labels; visible `focus-visible` outlines throughout; ≥44px tap targets; `prefers-reduced-motion: reduce` handled globally (`app/globals.css:892`); AI sections use `aria-live="polite"`; landing's split-text hero keeps an accessible `aria-label` with decorative spans hidden.
- **Target behavior:** AGENTS.md §11 — keyboard/focus behavior where relevant; TZ P0.20 focus states.
- **Exact gap:** None identified statically. Unknowns: real screen-reader/keyboard-only passes were **not** performed. Minor watch items only: the `ChoiceCard` visible "Selected" text duplicates radio state (redundant but harmless); the mobile progress `<details>` summary is keyboard-accessible but its open/close state is not conveyed as a disclosure button role.
- **Affected files:** none required now.
- **Risk:** 🟡.
- **Dependencies:** fold into Task 14 QA.
- **Disposition:** **Reuse**; verify manually later.

---

### G13. Existing functionality that must NOT be rewritten (protect list)

These are working, tested, and TZ-aligned; new onboarding work should compose with them, not replace them:

1. **AI provider/fallback/validator/cache layer** (`lib/ai/*`, both `/api/ai/*` routes) — TZ §1 constraint: no refactor without a proven defect. Onboarding must stay AI-free (it already is).
2. **Deterministic scoring/eligibility/matching** (`scoring.ts`, `eligibility.ts`, `recommend.ts`) — weights are defensible and documented; unknown = `null` component excluded from both score and coverage. Any target-flow change must not smuggle new weights in (AGENTS.md §8).
3. **Profile-vs-program criteria renderer** (`presentation.ts` `buildProfileProgramCriteria`, `formatRequirement`) — the exact verified/unknown/not-comparable vocabulary P0.6/P0.7 need; language criterion already added.
4. **Change-impact engine + presentation** (`change-impact.ts`, `change-impact-presentation.ts`) — deterministic diff + TTL session storage; extend input list, don't redesign.
5. **Roadmap generator** (`roadmap.ts`) — verification-first tasks, strong-profile state (`hasStrongProfileState` + the "meets the published comparable requirements" panel), provenance-linked sources, `applicationDocuments` honest-unknown handling (null ⇒ generic verify-documents step, never invented letter requirements).
6. **Storage/sync architecture** — validated local draft, sessionStorage edit baseline, Supabase anonymous LWW sync with payload hygiene tests (§G8).
7. **Honest-unknown UX language** ("Blank means unknown", "Needs verification", "Not comparable", "We don't guess exchange rates") and the no-guarantee copy discipline — reused verbatim in any new flow.
8. **Compare semantics** — max 2 with explicit, explained limit ("Select 1 more to compare" + "Compare limit reached" on the disabled control, `program-presentation.tsx:274`; capped in `toggleCompareSelection`, `selection.ts:39-42`). P0.1's requirement (explicit limit + recovery action) appears satisfied by design; runtime clean-session confirmation remains part of final QA (unknown here).
9. **The test suite** (144 tests across onboarding, matches, diagnosis, change-impact, presentation, roadmap, AI service, storage, sync) — the safety net for all of the above.

---

### G14. Likely merge-conflict hotspots

Observed hotspots for the upcoming P0 sequence (verified against current branch activity, not speculation):

| Area | Files | Competing tasks |
|---|---|---|
| **Onboarding form & profile type** *(live right now)* | `components/journey/onboarding-form.tsx`, `lib/onboarding.ts`, `lib/onboarding.test.ts`, `types/admissions.ts`, `lib/storage/profile.ts`, `lib/supabase/sync.ts` (+ tests), `lib/supabase/types.ts` | Activities (in flight, Task 3) vs goal-first/state-transfer (Task 4/6) vs any language residue (G6) |
| Diagnosis | `lib/admissions/diagnosis.ts`, `components/journey/diagnosis-view.tsx`, `diagnosis.test.ts` | Full Diagnosis (Task 7) vs activities Strengths context (Task 3) vs language context (G6) |
| Change impact | `lib/admissions/change-impact.ts` + presentation + storage tests | Activities (must NOT appear as scored input) vs language-input tracking (G6.3) vs signature-flow work (Task 11) |
| Roadmap | `lib/admissions/roadmap.ts`, `roadmap.test.ts`, `components/journey/roadmap-view.tsx` | Activities material step (Task 3) vs action-layer regrouping (Task 9) vs language verify task (G6.4) |
| Presentation/criteria | `lib/admissions/presentation.ts` (+ test) | Matches evidence (Task 8) vs language residue vs program-detail polish (P1) |
| Landing | `app/page.tsx` | Goal-first entry (Task 4) vs landing integration (Task 12) vs visual identity (P1) — serialize per plan §5 |

Sequencing rule that falls out of the plan's conflict matrix, updated for what has merged: **Language ✅ merged → Activities (in flight) → merge gate → Goal-first target → Instant diagnosis → State transfer → Full diagnosis**.

---

## 3. Attention-item index (requested focus points → findings)

| # | Requested attention item | Finding |
|---|---|---|
| 1 | Form-first vs goal-first | G1 — fully form-first today; no goal-first entry exists |
| 2 | Missing target University + Program entry | G2 — no target in onboarding; `selected_program_id` is the only target carrier and is set post-matches |
| 3 | Requirements-before-profile | G3 — inverted; requirements visible only post-matching; renderer exists to reuse |
| 4 | Duplicated questions | G4 — none today; becomes a risk the moment the instant check lands without G5; `intendedField` should be derived from target in goal-first flow |
| 5 | Prefill/state transfer | G5 — only local-draft restore exists; no entry-state channel |
| 6 | preferredLanguage | G6 — P0.3 shipped (onboarding, storage, sync, evidence, criteria); residue: previews, diagnosis, change-impact, roadmap verify task, 7 unverified programs |
| 7 | Activities/achievements | G7 — absent on main; `feature/activities-context` in flight (contents unknown) |
| 8 | Persistence/backward compat | G8 — strong patterns; watch the six-point checklist and the DB `step between 1 and 4` constraint on any wizard restructure |
| 9 | Review screen completeness | G9 — solid; language missing from sidebar/mobile preview; latent uncollected fields need a decision |
| 10 | Transition to Diagnosis | G10 — direct route exists, no signup wall (good); diagnosis is profile-level, not target-level; instant diagnosis missing (Task 5) |
| 11 | Mobile behavior | G11 — patterns look right statically; manual P0.20 pass not performed (unknown) |
| 12 | Accessibility | G12 — strong static posture incl. reduced-motion; manual verification unknown |
| 13 | Functionality NOT to rewrite | G13 protect list (AI layer, scoring core, criteria renderer, change-impact, roadmap, sync, honest-unknown copy, compare semantics, tests) |
| 14 | Merge-conflict hotspots | G14 table; onboarding/profile-type area is *currently* contested |

---

## 4. Checklist: adding a `StudentProfile` field without breaking persistence

Derived from the `preferredLanguage` migration (repeat for every new field, e.g. activities):

1. `types/admissions.ts` — add the field (nullable/optional per TZ).
2. `lib/onboarding.ts` — `emptyProfile` default; validation in `stepErrors` if applicable.
3. `components/journey/onboarding-form.tsx` — input, **ProfilePreview**, ReviewSection.
4. `lib/storage/profile.ts` — `isStudentProfile` must accept *legacy objects missing the field*; normalize in `parseStoredProfileValue`.
5. `lib/supabase/sync.ts` — `serializeProfile`; add key to `profileKeys` **and** to the legacy-keys acceptance branch in `parseRemoteProfile`.
6. `lib/supabase/types.ts` — `PersistedStudentProfile` (omit only if intentionally device-local).
7. `lib/ai/schemas.ts` — add to `AIProfile`/`toStudentProfile` **only** if AI should see it (activities: TZ says context for diagnosis/roadmap, not an AI-profile requirement — decide explicitly).
8. Tests: `lib/onboarding.test.ts`, `lib/supabase/sync.test.ts` (payload shape + legacy restore), plus feature tests.

If the wizard **step count** changes, additionally: `parseStoredProfileValue` + `parseRemoteProfile` step bounds, `StoredProfile.version` policy, and the `supabase/schema.sql` CHECK constraint (DB migration) — see G8.

---

## 5. Recommended implementation sequence (not implemented)

Aligned with `docs/IMPLEMENTATION_PLAN.md`, adjusted for what has already merged (Tasks 1–2 done; Task 3 in flight):

1. **Land activities (Task 3, in flight)** — completes the StudentProfile field pattern on current main; update the §4 checklist items; no parallel edits to onboarding/profile-type files until merged (Merge Gate equivalent of plan's Gate A).
2. **Language residue batch (small, from G6)** — `ProfilePreview` + diagnosis context + change-impact input tracking + roadmap "verify language of instruction" task for the 7 unknown programs; start the AITU/ASU language research (TZ §9). Can pair with (1)'s merge window but not with (1)'s branch.
3. **Goal-first target foundation (Task 4 / G1+G2+G3)** — target selection (university → program → grade) as the entry; promote `journey_state.selected_program_id` into the target carrier; requirements view after target selection reusing `buildProfileProgramCriteria`; make a chosen `not_eligible` target reachable in detail/roadmap (show status, don't hide); derive `intendedField` from the target program instead of asking it.
4. **Instant diagnosis (Task 5 / G10a)** — minimal current-state inputs → deterministic mini-diagnosis (reuse eligibility/criteria engine); no signup wall; no new AI calls per step.
5. **State transfer / prefill (Task 6 / G5+G4)** — persist instant-check inputs; prefill wizard; skip answered questions; follow the §4 checklist if profile fields are added; define refresh/navigation behavior + tests.
6. **Full Diagnosis (Task 7 / G10b)** — target-centric sections (target summary, requirement coverage, strengths incl. activities context, gaps, unknowns, priorities, roadmap preview) with existing `DiagnosisEnhancement` AI explanation and P0.15 cache discipline.
7. **Then** per plan: matches evidence (Task 8 — reasons/gaps already carry language evidence), roadmap action layer (Task 9), visible AI layer incl. finally wiring the existing-but-unused `rewriteRoadmapTask` (Task 10), change-impact signature flow extended to GPA/intake/language (Task 11 + G6.3), landing integration (Task 12), README (Task 13), final mobile/accessibility/clean-session QA incl. first-ever manual passes for G11/G12 and runtime confirmation of compare-limit behavior (Task 14 / P0.20).

Sequencing constraint worth repeating: **everything in steps 3–5 touches the same files as (1)**; serialize.

---

## 6. Explicit unknowns

- **No manual/browser QA was performed** in this audit; all runtime, mobile, and screen-reader statements are static-code observations or unknowns.
- **`feature/activities-context` uncommitted changes** (another workstream, shared worktree) — contents unknown; presumed Task 3 scope from modified file set only.
- **`docs/onboarding-spec` worktree/branch** (`C:/Users/53/fortech-gemini`) — not inspected; relationship to this audit unknown.
- **Supabase project state** — whether `schema.sql` was applied, whether anonymous sign-ins are enabled, and current env configuration are unknown (no runtime check performed).
- **AI provider availability/keys** in this environment — unknown; AI success/fallback behavior not exercised.
- **AITU and ASU `languageOfInstruction`** — unverified (`null`); official-source research outstanding.
- **`applicationDocuments`** for all 18 programs — unverified (typed, all null); document-requirement research outstanding (TZ §9.2).
- **`npx tsc --noEmit` failure on `app/layout.tsx` (`LayoutProps`)** — pre-existing at baseline; presumably resolves with Next generated types after `next build`/`next dev`; a full build was not run in this docs-only audit.

---

## 7. Status addendum (added after publication)

This audit analyzes `origin/main` at **`bf78c6d`** as stated in the header. In a fast-moving repository, the following PRs merged during and shortly after the audit window (verified via merge commits / PR titles only — their contents were **not** re-audited unless noted):

| PR | Branch | Addresses |
|---|---|---|
| #4 | `feature/language-of-instruction` | G6 (P0.3 preferred language — contents were inspected in detail during this audit) |
| #6 | `feature/activities-context` | G7 (P0.4 activities — contents were inspected in detail from the merged diff: `StudentProfile.activitiesAndAchievements?`, onboarding textarea with the "does not affect deterministic matching" note, review row, diagnosis strength + profile panel, roadmap application-materials wording, legacy-tolerant storage/sync with required/allowed-key validation, and a test proving activities do not change Fit Score or eligibility) |
| #8 | `feature/goal-first-target` | G1/G2/G3 (Task 4 goal-first target flow) |
| #10 | `feature/instant-diagnosis` | G10a (Task 5 instant diagnosis before signup) |
| #11 | `feature/onboarding-prefill` | G5/G4 (Task 6 state transfer into onboarding) |
| #12 | `feature/full-diagnosis` | G10b (Task 7 target-centered full diagnosis) |
| #13 | `feature/match-evidence` | G14/matches evidence (Task 8) |

Consequently, the "current implementation" sections above describe the `bf78c6d` baseline, and the affected gaps (G1–G3, G5, G7, G10) should be considered **at least partially addressed on current main**. The remaining sequence at publication time is Task 9 (roadmap action layer) onward, per `docs/IMPLEMENTATION_PLAN.md`. The §4 field checklist and §G8 migration patterns were confirmed current as of PR #6.
