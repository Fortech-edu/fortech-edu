# FORTECH_MASTER_TZ.md

## 0. Purpose

This document is the product and implementation source of truth for the next Fortech hackathon release.

It consolidates:
- external product feedback;
- current production behavior;
- required case fields;
- backend/data gaps;
- AI architecture constraints;
- visual/product differentiation work;
- submission/README requirements;
- the proposed RIASEC/Holland interest-profiler feature.

This is **not** permission to implement everything at once. Execution order is defined in `docs/IMPLEMENTATION_PLAN.md`.

---

# 1. Current baseline

The project already has a working foundation, including:

- core UI and product screens;
- onboarding/profile flow;
- deterministic admissions logic;
- matches/recommendations;
- program details;
- roadmap;
- compare;
- change-impact logic;
- real Gemini-backed AI endpoints;
- structured AI responses;
- validation/safety layer;
- fallback behavior;
- session caching;
- production deployment;
- automated tests.

The AI infrastructure has already been proven end-to-end. Known past issues included provider quota/rate errors and validator false positives. Those were infrastructure issues, not a reason to redesign the AI layer.

## Constraint

Do **not** refactor the provider/fallback/validator architecture unless a future task finds a concrete defect or the user explicitly requests a provider change.

The next work is primarily about:
- product clarity;
- data completeness;
- honest matching;
- a memorable user flow;
- better roadmap value;
- visible but disciplined AI;
- hackathon-readiness.

---

# 2. Product North Star

The core Fortech experience must be:

**Dream → Requirements → Current State → Gap → Plan → Progress → Recalculation**

A new user should quickly understand:

1. What university/program do I want?
2. What does that target actually require?
3. What do we know about my current profile?
4. Which requirements are satisfied?
5. Which gaps are confirmed?
6. Which facts are still unknown?
7. What should I do next?
8. Why is that action important?
9. What changes when my profile improves?

This is more important than adding additional dashboards or generic AI features.

---

# 3. Product principles

## 3.1 Show, don't tell

Landing and onboarding must demonstrate Fortech through an actual admissions flow, not generic SaaS feature copy.

Bad:
- "AI recommendations"
- "Smart roadmap"
- "Personalized guidance"

Better:
- choose a target;
- see requirements;
- enter current state;
- see a gap;
- get a next action;
- watch the plan update after a profile change.

## 3.2 Goal-first, not form-first

Do not start the main experience with an abstract questionnaire such as "Enter your GPA".

Start with a concrete goal:

> I want to get into ...

Then:
- university;
- major/program;
- target intake/timeline where known.

The user should understand why each later question matters.

## 3.3 Facts first, AI second

Admissions facts come from verified/deterministic sources.

AI explains facts. It does not create them.

## 3.4 Honest uncertainty

Unknown data remains unknown.

Approved status language:
- Satisfied / Ready
- Needs work
- Unknown
- Needs verification

Unknown must not silently become a mismatch.

## 3.5 No fake precision

Do not invent:
- admission probabilities;
- arbitrary fit percentages;
- unsupported scoring coefficients;
- thresholds;
- deadlines;
- scholarship data;
- guarantees.

---

# 4. P0 — Required before hackathon-ready release

## P0.1 Stable production checkpoint

Before major product rework:

- resolve the exact cause of any current `Compare limit reached` state;
- if a compare maximum is intentional, show the exact limit and recovery action;
- if it is an unnecessary/demo restriction, remove it safely;
- test compare from a clean session;
- run full relevant QA;
- keep a known-good production checkpoint.

Acceptance:
- a clean user does not hit an unexplained compare error;
- legitimate limits are clearly explained;
- production remains deployable.

---

## P0.2 Strong-profile roadmap

### Problem

When a profile already satisfies all known requirements, the current roadmap can collapse into generic application steps. That makes a strong user feel the product has nothing useful left to offer.

### Required behavior

Update roadmap generation so a strong profile explicitly communicates success and still provides program-specific preparation.

Required additions:

1. explicit opening state:
   - communicate that the profile currently satisfies the program's published/known requirements;
   - do not imply guaranteed admission.

2. motivation/recommendation step:
   - include a motivation-letter / recommendation-letter preparation step when the program requires it;
   - if document requirement is unknown, prefer a verification step rather than inventing a requirement.

3. official-document verification:
   - add a step to confirm the official document list on the program/university source;
   - use the existing `program.sources`/provenance mechanism;
   - the UI should point to the relevant official source where the product already supports source links.

### Acceptance criteria

For a strong-profile scenario:
- roadmap has at least 6 meaningful steps;
- at least 1 step is specific to the selected program;
- the user sees an explicit "known requirements currently satisfied" state;
- there is at least one source-backed verification/application-preparation step;
- no guaranteed-admission language appears.

Likely implementation area:
- `lib/admissions/roadmap.ts` or the repository's current roadmap generator.

---

## P0.3 Language of instruction

### Problem

The case expects language information, but the product currently lacks a proper representation of:
- program language of instruction;
- student's preferred study language.

### Data model

Add to `UniversityProgram`:

```ts
languageOfInstruction: string | null
```

Semantics:
- `null` = not verified/unknown;
- unknown language is not a mismatch.

Add to `StudentProfile`:

```ts
preferredLanguage: string | null
```

Semantics:
- optional;
- `null` may mean unanswered/no preference depending on the existing domain conventions;
- if the product needs to distinguish "no preference" from "not answered", use the smallest backwards-compatible representation consistent with current types.

### Program data research

There are currently 18 supported programs in scope.

For each:
- research language of instruction using an official university/program source;
- populate the value only when verified;
- preserve evidence in the existing source/provenance model;
- leave `null` when not confidently verified;
- never infer language only from country or university.

### Onboarding

Add a simple question in Preferences:

> What language would you prefer to study in?

Use only options relevant to the current supported dataset.

Allow:
- a preferred language;
- no preference / equivalent;
- unanswered where the existing flow permits it.

Do not add AI here.

### Scoring

Rules:

1. `preferredLanguage` absent/no preference:
   - no scoring effect.

2. `program.languageOfInstruction === null`:
   - no mismatch;
   - retain `Unknown`.

3. both known and equal:
   - expose positive alignment using the current transparent scoring/evidence model.

4. both known and different:
   - expose a transparent mismatch.

Do not introduce a large arbitrary weight.

### UI evidence examples

- `✓ Taught in your preferred language`
- `? Language of instruction needs verification`
- `⚠ Program is taught in X; your preference is Y`

Only show when relevant.

### Tests

Cover:
- both missing;
- student preference missing;
- program language missing;
- known match;
- known mismatch;
- unknown program language does not penalize;
- persistence/backwards compatibility;
- onboarding mapping.

---

## P0.4 Activities and achievements as context, not a score

### Problem

The case expects "academic steps and activities", but the current profile has no meaningful activity context.

### StudentProfile

Add an optional free-text field for:
- olympiads;
- projects;
- volunteering;
- other relevant activities/achievements.

Use the smallest domain name consistent with the existing codebase, for example:

```ts
activitiesAndAchievements?: string | null
```

Do not add a points system.

### Onboarding copy

Add an optional field, e.g.:

> Olympiads, projects, volunteering, or other achievements

Add a helper note equivalent to:

> This provides context for your plan and does not affect deterministic matching.

Exact wording may follow the current design language.

### Roadmap

If the field is non-empty:
- add or enrich a step suggesting the user surface relevant achievements in their motivation/application materials where appropriate;
- do not claim the activity improves admission odds unless a program source explicitly supports that relationship.

### Diagnosis

If non-empty:
- surface activities in `Strengths`/profile context;
- do not turn them into a numeric strength score.

### Explicit non-goal

Do not add climate/environment preference questions in this phase. There is no verified dataset/logic for them, and unused questions reduce trust.

---

## P0.5 Goal-first Target flow

### Entry interaction

The main value flow should start with:

> Where do you want to get in?

or an equivalent concise goal-first interaction.

Collect:
1. country if required by search architecture;
2. university;
3. major/program;
4. current grade/year.

Optional later inputs:
- academic performance;
- English/test information;
- curriculum;
- graduation year;
- budget where existing logic supports it.

Do not require every optional field before showing value.

### Target entity

Represent the selected university + program as a real product target, not a landing-only object.

Example:

`Computer Science @ University X`

The target must map into the same domain used by:
- program detail;
- diagnosis;
- matches;
- roadmap.

Avoid duplicate/parallel target models.

---

## P0.6 Requirements before current-state questions

After selecting a target, show known program requirements first.

Possible categories, only when data exists:
- academics;
- English/language;
- standardized tests;
- prerequisite subjects;
- documents;
- deadlines;
- program-specific requirements.

Every displayed fact must preserve the distinction between:
- verified/known;
- typical/contextual if the repo explicitly models this;
- unknown;
- needs verification.

Then ask:

> Where are you today?

This gives profile inputs an immediate purpose.

---

## P0.7 Target vs Current gap view

The core comparison should make requirements understandable.

Conceptual structure:

| Metric | Requirement | Current | Status |
|---|---|---|---|
| Academic | known target | student value | Ready / gap / unknown |
| English | known target | student value | Ready / gap / unknown |
| Test | known target | student value | Ready / gap / unknown |

Rules:
- do not display a numeric gap when scales are not directly comparable;
- do not infer missing values;
- preserve unknown states;
- warning color represents a factual gap, not fear-based persuasion.

---

## P0.8 Instant Diagnosis before signup

A visitor should receive real value before being forced to create an account.

After a small number of inputs, show a mini diagnosis containing:

### Target
- university;
- program;
- country.

### Timeline
- current grade/year;
- expected application cycle if determinable;
- known deadline/time remaining if verified.

### Requirement status
- Ready;
- Needs work;
- Unknown;
- Needs verification.

### Biggest gaps
Only evidence-backed gaps.

### Next actions
3–5 concrete next steps based on current deterministic logic.

### CTA
After value is visible:
- `Build my full plan`
- `Save this plan`
- equivalent.

No signup wall before the first meaningful result.

---

## P0.9 State transfer into onboarding

The instant check must be the beginning of the actual product.

Persist/prefill:
- target country;
- university;
- program;
- grade/year;
- academic values already provided;
- English/test data already provided;
- other supported inputs.

Do not ask the same questions again.

Onboarding should collect only missing information.

AI is not needed on every onboarding step.

---

## P0.10 Full Diagnosis as the post-onboarding centerpiece

After onboarding, the primary result should be a strong diagnosis rather than a generic dashboard.

It must answer:

- Where am I now?
- What is required?
- What is already satisfied?
- What is missing?
- What is unknown?
- What should I do next?
- Why?

Recommended sections:

1. Target summary
2. Requirement coverage
3. Strengths
4. Biggest gaps
5. Unknown/needs-verification items
6. Recommended priorities
7. Roadmap preview
8. AI explanation

Do not show fake admission probability.

---

## P0.11 Visible AI layer

### Goal

AI must feel useful because it explains real context, not because the interface has an `AI-assisted` badge.

### Diagnosis
Explain:
- what the deterministic result means;
- what deserves attention first;
- why.

### Matches
One page/context summary:

> What do these matches say about my profile?

Do not generate a separate expensive call for every card unless later evidence shows it is needed.

### Program detail
Explain:
- why this program appeared;
- what known gaps remain;
- what the user should verify.

### Roadmap
Use AI to explain:
- why a deterministic task matters now;
- not to replace the deterministic task generator.

Reuse existing `rewriteRoadmapTask()` or equivalent if appropriate.

### Compare
Optional short neutral summary of factual differences.

Do not output:
- "University A is better for you" as an unsupported verdict;
- unsupported acceptance chances.

### Change impact
AI may convert deterministic diffs into concise natural-language explanations.

---

## P0.12 Matches must show evidence

A match/recommendation must answer **why** it exists.

Possible evidence:
- program available;
- academic baseline aligned;
- budget alignment when supported;
- language alignment;
- English/test requirement status;
- deadline status;
- unknown data.

Preferred qualitative states:
- Strong alignment
- Possible with improvements
- Requirements currently unmet
- Insufficient information

Do not manufacture precise fit percentages.

---

## P0.13 Roadmap as the action layer

Diagnosis answers:
> Where am I?

Roadmap answers:
> What do I do?

Recommended grouping:
- NOW
- NEXT 30 DAYS
- THIS SEMESTER
- BEFORE APPLICATION

Each task should support, where meaningful:
- title;
- short explanation;
- reason;
- priority;
- status;
- target date/timeframe;
- related requirement/program.

Deterministic logic determines factual tasks and dependencies.

AI may improve the explanation.

---

## P0.14 Change Impact as a signature interaction

When relevant profile data changes, Fortech should explain what changed.

Inputs may include:
- GPA/academic values;
- IELTS/TOEFL;
- test score;
- budget;
- country;
- major;
- target university;
- grade/year.

Example:

`IELTS 6.0 → 7.0`

Then show factual changes such as:
- 3 known English requirements now satisfied;
- a roadmap English-preparation task is deprioritized/removed;
- relevant match evidence changed.

Use deterministic change-impact logic for the diff.

AI may summarize the diff.

This interaction is a primary "wow" moment:
**the plan adapts when the profile changes, and the product explains why.**

---

## P0.15 AI cost/reliability controls

Do not call AI on every render.

Target behavior:
- Diagnosis: ~1 generation per relevant context;
- Matches: ~1 summary per context;
- Program Detail: ~1 explanation per program/context;
- Roadmap: 0–1 explanation generation as needed;
- Compare: 0–1 optional summary.

Cache using a fingerprint of relevant inputs.

Invalidate only when relevant context changes:
- profile;
- target/program;
- verified requirement set/version;
- roadmap state if required.

If provider fails/rate-limits:
- preserve deterministic results;
- show graceful fallback;
- do not pretend fallback text came from live AI.

---

## P0.16 Focused verified dataset

Do not prioritize catalog size over trust.

For hackathon quality:
- a smaller, well-researched program set is preferable to a large shallow catalog;
- unknown fields remain unknown;
- official source provenance matters.

Priority data:
1. admission requirements;
2. deadlines;
3. English/language requirements;
4. tests;
5. academic prerequisites;
6. documents;
7. tuition/budget where verified;
8. program metadata.

---

## P0.17 Landing page: product demonstration

The landing should show the product in action.

Hero direction:
- concrete outcome;
- target-first interaction;
- minimal generic AI marketing.

Possible message direction:
> From "Can I get in?" to a concrete admissions plan in minutes.

Exact copy may be refined, but must remain factual and avoid guarantees.

Feature sections should visually demonstrate:
- target → requirements → gaps;
- diagnosis → roadmap → tasks;
- profile change → recalculation.

Do not create fake dashboard screenshots/data solely for decoration.

---

## P0.18 Parent-aware acquisition, student-centered product

Top-of-funnel copy may acknowledge that a parent can be researching for a child.

However:
- the working product should remain natural for the student;
- do not convert every screen into a parent dashboard;
- avoid fear-based parent messaging.

---

## P0.19 Submission README requirements

Before final submission, `README.md` must contain these sections.

### Test scenario
A clear step-by-step flow that judges can reproduce.

It should include:
- how to run/access the project;
- a recommended demo profile/target;
- exact routes/actions;
- expected visible outcomes;
- AI/fallback behavior if relevant.

### Team
List:
- real team member names;
- roles;
- captain clearly marked.

Do not invent names. If team information is not present in the repository, request/provide it before final submission.

### Pre-existing components
Explicitly disclose:
- reused/pre-existing code/components/assets;
- third-party templates/libraries beyond normal dependencies where relevant;
- or state clearly that no pre-existing product components were transplanted.

This section is required even if the answer is "none".

---

## P0.20 Mobile and final QA

Required routes/flows:
- landing;
- target/admission check;
- result;
- onboarding;
- diagnosis;
- matches;
- program detail;
- roadmap;
- compare.

Check:
- no horizontal overflow;
- readable cards;
- input/select behavior;
- mobile keyboard;
- focus states;
- tap targets;
- loading/error/empty states;
- console errors;
- failed network requests;
- AI success and fallback;
- cache behavior;
- clean-session behavior.

---

# 5. P1 — High-value follow-up work

## P1.1 RIASEC / Holland interest profiler

### Product goal

Help a student who does not yet know what to study discover **areas and majors to explore**.

This is not:
- an admissions score;
- a mental-health/personality diagnosis;
- a definitive career verdict.

### Preferred MVP

Use the official O*NET Interest Profiler infrastructure/content under the applicable current license.

Current official O*NET services support:
- a 30-question Mini-IP;
- a 60-question version.

For the hackathon/MVP, prefer the shorter official format if implementation and licensing allow it, because completion time matters.

### Output

Show:
- six RIASEC dimensions:
  - Realistic
  - Investigative
  - Artistic
  - Social
  - Enterprising
  - Conventional
- strongest 2–3 interest areas;
- plain-language interpretation;
- majors/study areas to explore;
- relevant Fortech programs where an explicit mapping exists.

### Admissions separation

RIASEC:
- must not change admission eligibility;
- must not change deterministic admission score;
- must not turn into a fake "you have X% fit for Computer Science".

### Mapping to majors

Any RIASEC → major mapping must be:
- explicit;
- versioned/testable;
- presented as exploration guidance;
- separate from admissions matching.

If using O*NET occupation results to support exploration, preserve the distinction between occupation interests and university admission requirements.

### Licensing and attribution

Before implementation/shipping, verify the current official O*NET license and attribution requirements.

Current official documentation distinguishes:
- verbatim use of Career Exploration Tools under a no-derivatives Creative Commons option;
- modified/extended tool use under an O*NET developer license;
- separate licensing/attribution rules for Web Services and database content.

Do not modify official assessment questions/scoring in a way that conflicts with the applicable license.

Keep required attribution visible in the feature/about/source area.

### UX

Possible entry:
> Not sure what to study? Explore your interests.

Then:
- short assessment;
- RIASEC result;
- study areas;
- optional "Explore matching majors in Fortech".

Do not block the main admissions flow with the test.

---

## P1.2 Multiple Targets

Allow a user to save more than one target program.

Example cards:
- Computer Science @ University A
- Economics @ University B

Each target may show:
- requirements ready / total known;
- confirmed gaps;
- unknowns;
- next action.

This is a lightweight "collection" mechanic, not a competitive social system.

---

## P1.3 Program-detail polish

Strengthen:
- requirement evidence;
- source visibility;
- target-vs-current comparison;
- contextual AI explanation;
- next action.

No major new domain model unless required.

---

## P1.4 Visual identity and memorability

### Goal

Make Fortech feel intentional and recognizable without relying on unavailable imagery.

The three highest-value levers are:
1. color;
2. typography;
3. one memorable product screen.

### Color

Current feedback: the existing green-on-light-green direction can feel calm but generic.

Requirement:
- introduce one clear accent strategy;
- keep semantic colors separate from brand accent;
- do not invent/copy QAIRU colors.

If QAIRU is used as a reference:
- only use exact palette values if the user supplies them or they are independently verified;
- use them as inspiration, not as a clone.

### Typography

Current feedback identifies system/Geist-like typography as generic.

Requirement:
- choose a distinctive but readable pair or hierarchy;
- verify license/availability;
- do not guess the QAIRU font;
- maintain Cyrillic/Latin support if the product uses both.

### One memorable screen

Prioritize the Roadmap / Next Action experience as a signature screen.

The existing dark `NEXT ACTION` concept can be developed into the visual anchor of the product.

The screen should clearly communicate:
- priority;
- reason;
- timeframe;
- progress;
- related requirement/program.

### Microinteractions

Safe high-value examples:
- staggered/fade card entry;
- clear selected-option state;
- progress-fill animation;
- subtle state transition after recalculation;
- hover/focus feedback.

Requirements:
- CSS/low-complexity where practical;
- no animation for decoration only;
- support `prefers-reduced-motion`;
- no heavy motion that hurts mobile performance.

### Inspiration constraint

Do not copy the composition or proprietary design identity of another studio/site.

---

## P1.5 Expanded verified dataset

After the core flow is strong, expand program coverage while preserving:
- official sourcing;
- unknown handling;
- data-quality tests;
- provenance.

Do not sacrifice trust for count.

---

# 6. P2 / Post-hackathon experiments

These are explicitly **not** current core work:

- public student profiles;
- student search;
- follower/friend systems;
- social feed;
- peer comparison;
- FOMO/competition mechanics;
- complex gamification;
- generic standalone AI chatbot;
- very large global catalog expansion.

If social features are ever explored, they require a separate privacy/safety design appropriate for minors and must be opt-in.

---

# 7. Design and messaging constraints

Do not build the product around:
- fear;
- shame;
- "not good enough" messaging;
- guaranteed acceptance;
- unsupported urgency.

Good urgency:
- "2 requirements need attention"
- "Application deadline in X months" when verified
- "IELTS requirement not yet satisfied"
- "This requirement still needs verification"

The product should make gaps visible without making the student feel judged.

---

# 8. Data model summary

These additions are explicitly required by this TZ.

## UniversityProgram

```ts
languageOfInstruction: string | null
```

## StudentProfile

```ts
preferredLanguage: string | null
```

Add an optional activities/achievements context field using the naming/style consistent with the existing repository.

Do not introduce duplicate target/profile models if existing types can be cleanly extended.

---

# 9. Research backlog

Research that must use authoritative sources:

1. language of instruction for the current 18 supported programs;
2. any missing program-specific document/motivation/recommendation requirements used by roadmap;
3. deadlines/requirements displayed in the new target-first flow;
4. RIASEC/O*NET current licensing and attribution immediately before implementation/shipping;
5. visual reference palette/font only if the user explicitly wants QAIRU-inspired values and provides/authorizes a verifiable source.

Research outcomes must preserve unknowns rather than filling gaps with assumptions.

---

# 10. 60-second judge flow

Target demo:

### 0–10 s
Landing communicates the product and asks for a target.

### 10–25 s
Choose university + program and provide minimal profile info.

### 25–35 s
Instant diagnosis shows:
- requirements;
- current state;
- gaps;
- unknowns;
- next actions.

### 35–45 s
Open full diagnosis/matches:
- evidence is visible;
- AI explains real deterministic results.

### 45–55 s
Roadmap:
- clear Next Action;
- why now;
- timeframe;
- related requirement.

### 55–60 s
Update a profile value:
- deterministic results recalculate;
- Change Impact explains what changed.

That is the intended memorable moment.

---

# 11. Definition of Done — P0

The P0 release is ready when a new person, without a developer explaining the product, can answer:

- What is my target?
- What does it require?
- What do I already satisfy?
- What confirmed gaps remain?
- What is unknown?
- What should I do next?
- Why is it next?
- What changes when my profile improves?

Additionally:

- strong-profile roadmap remains useful;
- language support is represented honestly;
- activities are contextual, not falsely scored;
- AI failure does not break deterministic results;
- README contains required submission sections;
- desktop/mobile demo flow works;
- tests/typecheck/lint/build pass according to repository scripts.

After P0 is complete, stop feature expansion and run final QA before starting P1.
