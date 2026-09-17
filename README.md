# Admission Journey

Admission Journey turns a student profile into deterministic bachelor-program recommendations, eligibility guidance, comparisons, and an application roadmap. Fit Score is a profile-match score, not an admission probability. Gemini can enhance explanations when configured; the deterministic product remains the fallback.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verified program dataset

Production recommendations use 18 bachelor programs verified from official university websites on **2026-09-17**:

- 11 technology programs and 7 business programs
- 5 universities: Astana IT University, University of Twente, LUT University, Hong Kong University of Science and Technology, and Arizona State University
- 5 represented countries or jurisdictions: Kazakhstan, Netherlands, Finland, Hong Kong, and United States

Each record links to its official program page and, when needed, separate official admissions, tuition, and deadline pages. Synthetic programs live only in `data/fixtures/demo-programs.ts` for deterministic tests and are not used in production.

### Data policy

- A fact is recorded only when an official university source clearly supports it.
- Missing values remain `null` and appear as **Unknown**. Missing SAT or IELTS information never becomes “not required.”
- Qualification-specific or non-numeric academic rules remain descriptive; the app does not invent GPA conversions.
- Unknown critical requirements keep eligibility at **Needs verification** and reduce data coverage.
- Tuition preserves the published currency and applicant category. The app does not perform exchange-rate conversions.
- Deadlines are included only when the applicable date is clear. Users should recheck every source before applying.

### Limitations

This is a curated sample, not a global catalog. Fees, requirements, applicant categories, curricula, and deadlines can change after the verification date. Some university pages publish requirements by qualification or residency, so a single universal value is intentionally unavailable. Recommendations do not estimate admission probability.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
git diff --check
```
