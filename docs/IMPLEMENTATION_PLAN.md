# IMPLEMENTATION_PLAN.md

## 0. Execution rule

Implement work in dependency order.

Do not treat this file as permission to batch all tasks into one branch.

**One task = one branch = one reviewable diff.**

Before every task:
1. read `AGENTS.md`;
2. read `docs/FORTECH_MASTER_TZ.md`;
3. sync latest `origin/main`;
4. create a dedicated branch.

---

# 1. Priority overview

## P0 — Hackathon-critical

1. Stable production / Compare investigation
2. Strong-profile roadmap
3. Language of instruction
4. Activities and achievements context
5. Goal-first Target flow
6. Requirements → Current State → Gap
7. Instant Diagnosis before signup
8. State transfer into onboarding
9. Full Diagnosis
10. Matches evidence
11. Roadmap action-layer integration
12. Visible AI explanations
13. Change Impact signature flow
14. Landing show-don't-tell integration
15. README submission sections
16. Mobile/demo/final QA

## P1 — High-value after P0

1. RIASEC / Holland interest profiler
2. Multiple Targets
3. Program Detail polish
4. Visual identity / typography / microinteractions
5. Expanded verified dataset

## P2 — Post-hackathon

- social/public student profiles;
- student search/friends/feed;
- FOMO/competitive mechanics;
- complex gamification;
- generic AI chatbot;
- large-scale catalog expansion.

---

# 2. Recommended branch/task sequence

## Task 0 — Production checkpoint / Compare

**Branch:** `fix/compare-limit`

### Scope
- locate exact producer of `Compare limit reached`;
- identify whether limit is intentional;
- clean-session test;
- replace vague message with exact rule if limit is legitimate;
- remove unnecessary/demo limit if not required;
- no unrelated Compare redesign.

### Gate
Must be merged before relying on Compare in final demo.

### Acceptance
- clean user can compare without unexplained failure;
- legitimate max is explicit;
- add/remove/reach-max scenarios tested.

---

## Task 1 — Strong-profile roadmap

**Branch:** `fix/roadmap-strong-profile`

### Scope
Implement P0.2 from Master TZ.

Likely primary area:
- roadmap generation;
- roadmap tests;
- source-backed step rendering only if required.

### Acceptance
Strong profile:
- at least 6 meaningful steps;
- explicit "known requirements satisfied" state;
- at least 1 program-specific step;
- official-source verification step;
- motivation/recommendation preparation only when required/unknown handling is honest;
- no guarantee language.

### Parallelization
Can run in parallel with Task 2 because expected file overlap is low.

---

## Task 2 — Language of instruction

**Branch:** `feature/language-of-instruction`

### Scope
Implement P0.3:
- `UniversityProgram.languageOfInstruction`;
- `StudentProfile.preferredLanguage`;
- official research for current 18 programs;
- onboarding preference;
- transparent scoring/evidence;
- tests/backwards compatibility.

### Acceptance
- no inferred languages;
- unknown does not penalize;
- known match/mismatch is explainable;
- all 18 records reviewed;
- verified/unknown research report produced.

### Parallelization
Can run in parallel with Task 1.

### Conflict warning
Do not run in parallel with Task 3 from stale `main`, because both touch StudentProfile/onboarding.

---

## Merge Gate A

After Tasks 1 and 2:

1. merge both reviewed branches;
2. update `main`;
3. run:
   - full tests;
   - typecheck;
   - lint;
   - production build;
4. smoke test roadmap + onboarding + matches.

Only then start Task 3.

---

## Task 3 — Activities and achievements context

**Branch:** `feature/activities-context`

### Scope
Implement P0.4:
- optional StudentProfile text field;
- onboarding input;
- helper copy that it does not affect deterministic matching;
- diagnosis Strengths context;
- roadmap use in application-material guidance;
- no scoring weight.

### Acceptance
- empty value has no effect;
- non-empty value appears as context;
- deterministic match score does not change solely because activities text is populated;
- roadmap uses it only as application context;
- tests cover both states.

---

## Task 4 — Goal-first Target flow foundation

**Branch:** `feature/goal-first-target`

### Scope
Implement P0.5–P0.6 foundation:
- target-first entry;
- university/program selection;
- reuse existing program domain;
- requirements visible before full profile questionnaire;
- no duplicate landing-only data model.

### Important
Do not yet redesign every downstream screen.

### Acceptance
- user can choose a real program target;
- verified requirements render with unknown handling;
- selection can be carried into subsequent flow;
- no fabricated requirement data;
- mobile basic flow works.

### Recommended model/reasoning
This is a broad cross-cutting product task: use a stronger coding model/reasoning setting than small schema tasks.

---

## Task 5 — Current State → Gap + Instant Diagnosis

**Branch:** `feature/instant-diagnosis`

### Dependencies
Task 4 merged.

### Scope
Implement P0.7–P0.8:
- minimal current-state inputs;
- deterministic requirement comparison;
- statuses;
- biggest gaps;
- unknowns;
- 3–5 next actions;
- result before signup.

### Acceptance
- result appears before registration;
- no fake probability;
- unknowns stay unknown;
- each gap is traceable to a known requirement;
- no signup wall before value.

---

## Task 6 — State transfer / onboarding continuity

**Branch:** `feature/onboarding-prefill`

### Dependencies
Task 5 merged.

### Scope
Implement P0.9:
- persist selected target and provided profile data;
- prefill existing onboarding;
- skip/reduce duplicate questions;
- preserve backwards compatibility for existing users.

### Acceptance
- user is not asked the same known data twice;
- refresh/navigation behavior is defined and tested;
- no AI call added per onboarding step;
- existing onboarding still works without pre-entry data.

---

## Task 7 — Full Diagnosis

**Branch:** `feature/full-diagnosis`

### Scope
Implement P0.10:
- target summary;
- requirement coverage;
- strengths;
- gaps;
- unknowns;
- priorities;
- roadmap preview;
- existing AI explanation integrated without replacing facts.

### Acceptance
Diagnosis answers:
- where am I;
- what is required;
- what is missing;
- what is unknown;
- what next;
- why.

No fake admission probability.

---

## Task 8 — Matches evidence

**Branch:** `feature/match-evidence`

### Scope
Implement P0.12:
- explicit reason/evidence rows;
- language evidence from Task 2;
- unknown evidence;
- qualitative states if compatible with existing UI.

### Acceptance
Every visible recommendation can explain why it appears without relying on AI.

---

## Task 9 — Roadmap action-layer integration

**Branch:** `feature/roadmap-action-layer`

### Dependencies
Tasks 1, 3, 7 merged.

### Scope
Implement P0.13:
- group tasks into meaningful time horizons;
- reason/priority/related requirement;
- integrate strong-profile behavior;
- use activity context appropriately.

### Acceptance
Roadmap is useful for:
- gap-heavy profiles;
- strong profiles;
- unknown-requirement profiles.

---

## Task 10 — Visible AI layer

**Branch:** `feature/visible-ai-layer`

### Dependencies
Full Diagnosis, Matches evidence, Roadmap action layer.

### Scope
Implement P0.11 and P0.15:
- Diagnosis summary;
- Matches page summary;
- Program Detail explanation;
- Roadmap "why this now";
- optional neutral Compare summary;
- reuse provider/fallback/validator/cache.

### Hard rules
- AI does not calculate facts;
- no provider refactor unless required by a proven bug;
- do not generate per-card calls by default;
- deterministic UI still works if AI fails.

### Acceptance
A judge can see why AI adds value, while the product remains useful without the provider.

---

## Task 11 — Change Impact signature flow

**Branch:** `feature/change-impact-experience`

### Scope
Implement P0.14:
- expose deterministic changes after relevant profile update;
- connect to requirements/matches/roadmap;
- optional AI natural-language summary.

### Acceptance
Demo case such as IELTS change visibly updates:
- requirement state;
- relevant match evidence;
- roadmap priority/task;
- change summary.

No invented causal claims.

---

## Task 12 — Landing integration

**Branch:** `feature/landing-product-demo`

### Dependencies
Tasks 4–11 substantially stable.

### Scope
Implement P0.17–P0.18:
- goal-first hero;
- actual mini product flow;
- real UI examples;
- parent-aware but student-centered copy;
- no fake screenshots/data;
- no broad visual redesign yet unless needed for clarity.

### Acceptance
A new user understands the product by interacting, not by reading a feature grid.

---

## Task 13 — README submission compliance

**Branch:** `docs/readme-submission`

### Scope
Add:
- Test scenario;
- Team;
- Pre-existing components.

### Required input
Use real team names/roles/captain only.

If they are not known, do not invent them. Report the missing information and leave the branch unfinalized until supplied, or use an explicit temporary placeholder only if the user requests it.

### Acceptance
A judge can reproduce the demo from README alone.

### Parallelization
Can be prepared in parallel with UI work, but final values should be updated after the demo flow stabilizes.

---

## Task 14 — Final P0 QA / release

**Branch:** `fix/final-hackathon-qa`

### No new features

Only:
- regressions;
- accessibility/UX defects;
- mobile issues;
- demo blockers;
- data errors;
- production errors.

### Required checks
- clean install/build if practical;
- full tests;
- typecheck;
- lint;
- production build;
- desktop manual pass;
- mobile manual pass;
- clean-session pass;
- AI success;
- AI provider failure/fallback;
- cache behavior;
- Compare;
- goal-first flow;
- strong profile;
- gap profile;
- Change Impact.

### Release gate
After this task, freeze P0 features.

---

# 3. P1 sequence

Do not start P1 because it is "interesting". Start it only after P0 is demo-ready.

## P1 Task A — RIASEC / O*NET interest profiler

**Branch:** `feature/ria-sec-profiler`

### First step: research/license gate
Before coding:
- verify current official O*NET license;
- verify attribution text/rules;
- decide API vs licensed local content;
- document the choice.

### MVP
- official short assessment if licensing/API permits;
- RIASEC scores;
- top 2–3 interest areas;
- plain-language explanation;
- majors/study areas to explore;
- optional links to existing Fortech programs through an explicit mapping.

### Non-goals
- no admission-score effect;
- no "perfect career" claim;
- no psychological diagnosis;
- no unsupported percent fit.

### Tests
- scoring/result mapping;
- incomplete answers;
- API failure if API-based;
- attribution/source visibility;
- admissions score unchanged.

---

## P1 Task B — Multiple Targets

**Branch:** `feature/multiple-targets`

Dependencies:
- single Target flow stable.

Acceptance:
- multiple programs can be saved;
- each has requirements/gaps/unknown status;
- current target switching is clear;
- no social/public behavior.

---

## P1 Task C — Program Detail polish

**Branch:** `feature/program-detail-polish`

Focus:
- evidence;
- source visibility;
- target-vs-current;
- next action;
- contextual AI.

---

## P1 Task D — Visual identity / memorability

**Branch:** `feature/visual-identity`

### Input gate
Do not invent:
- QAIRU color tokens;
- QAIRU font.

Need one of:
- user-provided palette/font;
- independently verified values;
- explicit decision to create an original Fortech palette/type system.

### Scope
- brand accent;
- typography;
- Roadmap/Next Action as signature screen;
- restrained microinteractions;
- reduced-motion support.

### Acceptance
The product feels intentional without copying another site's composition.

---

# 4. Parallelization matrix

| Task | Safe to parallelize with | Avoid parallelizing with |
|---|---|---|
| Compare fix | README docs | major Compare redesign |
| Strong-profile roadmap | Language support | Roadmap action-layer |
| Language support | Strong-profile roadmap | Activities from stale main |
| Activities | README docs | Language support from stale main |
| Goal-first Target | README docs | Landing redesign |
| Instant Diagnosis | README docs | Full Diagnosis from stale main |
| State transfer | README docs | onboarding redesign |
| Full Diagnosis | README docs | Visible AI from stale main |
| Matches evidence | README docs | large scoring refactor |
| Roadmap action layer | README docs | strong-roadmap work from stale main |
| Visible AI | README docs | provider refactor |
| Change Impact | README docs | parallel changes to same change-impact UI |
| Landing integration | README docs | visual-identity overhaul |
| RIASEC | Program polish | core admissions scoring refactor |
| Visual identity | docs/research | active landing/roadmap UI rewrite |

When uncertain, serialize work rather than create a difficult merge.

---

# 5. File-overlap risk

## High-risk shared areas

These tasks are likely to touch overlapping files:

### StudentProfile / onboarding
- Language of instruction
- Activities
- Goal-first/state transfer

Recommended order:
**Language → merge → Activities → merge → Goal-first/state transfer**

### Roadmap
- Strong-profile roadmap
- Activities
- Roadmap action layer
- Visible AI explanation

Recommended order:
**Strong-profile fix → merge → Activities → merge → Roadmap action layer → Visible AI**

### Landing
- Goal-first Target
- Landing integration
- Visual identity

Recommended order:
**Goal-first foundation → core diagnosis flow → Landing integration → Visual identity**

---

# 6. Research tasks

Research should be done independently of speculative code.

## Required before/inside P0

### Program language research
Review all 18 current programs.

Output:
- program identifier;
- verified language or `null`;
- official source/provenance;
- notes for ambiguity.

### Requirement/document research
Only add roadmap/document facts that are supported by program sources.

## Required before RIASEC

Verify:
- current O*NET Interest Profiler integration options;
- current license;
- attribution;
- 30 vs 60 question implementation decision.

## Visual reference research

Do not block core P0 on QAIRU.

If visual matching is requested later, first obtain:
- exact palette;
- font or font category;
- explicit accent direction.

---

# 7. Demo scenarios that must exist before final release

## Scenario A — Strong profile
Purpose:
- prove roadmap remains useful when no obvious admission gap exists.

Expected:
- explicit requirements-satisfied state;
- 6+ useful tasks;
- source/program-specific preparation.

## Scenario B — Gap profile
Purpose:
- show Target vs Current and roadmap prioritization.

Expected:
- at least one verified gap;
- clear next action;
- no shame/fear wording.

## Scenario C — Unknown data
Purpose:
- prove honesty.

Expected:
- `Unknown` / `Needs verification`;
- no penalty caused only by missing program data.

## Scenario D — Change Impact
Purpose:
- signature demo.

Expected:
- update a relevant profile value;
- requirement/match/roadmap changes become visible;
- optional AI explanation matches deterministic diff.

## Scenario E — AI unavailable
Purpose:
- reliability.

Expected:
- deterministic diagnosis/matches/roadmap still usable;
- fallback clearly distinguishable internally;
- no crash.

---

# 8. Completion standard for every branch

Before handing a branch to review:

- branch rebased/updated against latest main when necessary;
- no unrelated changes;
- no secrets;
- tests pass;
- typecheck passes;
- lint passes;
- production build passes when relevant;
- manual affected-flow QA performed;
- commit and push feature branch;
- concise report produced.

Report format:

```text
Branch:
Commit:

Implemented:
- ...

Files changed:
- ...

Validation:
- tests:
- typecheck:
- lint:
- build:
- manual QA:

Research/data:
- verified:
- unknown:

Known limitations:
- ...

Reviewer should inspect:
- ...
```

---

# 9. Stop conditions

An agent should stop and ask/report instead of guessing when:

- required team names/roles are missing;
- a program fact cannot be verified;
- a requested feature conflicts with the Master TZ;
- the task requires an arbitrary scoring weight;
- the requested design depends on unknown QAIRU colors/font;
- an O*NET license choice is unclear;
- a migration could destroy existing user data;
- latest `main` contains a conflicting redesign;
- a failing test appears unrelated and cannot be safely resolved within task scope.

Precision is more valuable than pretending the task is complete.
