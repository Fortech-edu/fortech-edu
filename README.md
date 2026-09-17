# Admission Journey

Admission Journey turns a prospective bachelor student's profile into explainable program recommendations, eligibility guidance, a two-program comparison, and a persistent application roadmap. Fit Score measures profile match; it is never an admission probability.

## Product flow

1. Complete the four-step student profile.
2. Review the deterministic diagnosis and optional AI summary.
3. Explore recommendations ranked by eligibility and profile fit.
4. Open a program to review requirements and official sources.
5. Select two programs to compare.
6. Choose one program and complete its roadmap tasks.
7. Edit the profile to see recommendations, eligibility, and roadmap state recalculate.

## Architecture

- **Next.js App Router and React:** server-rendered route shells with client components for browser storage and interaction.
- **Deterministic admissions engine:** field matching, Fit Score, data coverage, eligibility, explanations, and roadmap generation live in `lib/admissions`.
- **Verified data:** production records live in `data/programs.ts`; synthetic records are isolated in `data/fixtures` for tests.
- **Optional Gemini enhancement:** server-only API routes add constrained summaries while deterministic content remains immediately available.
- **Persistence:** local storage is the immediate source of truth. Optional Supabase anonymous auth synchronizes profiles, selections, and per-program progress.

## Recommendation logic

Recommendations stay within the selected field and explicitly related subjects. Viable programs are ordered by eligibility status, then Fit Score, then data coverage. Fit Score uses only known, comparable profile inputs: field, academics, tuition budget, English, country preference, and timeline. Unknown inputs are excluded from the normalized score and reduce data coverage instead of being treated as satisfied.

Eligibility is calculated separately. Missing critical requirements produce **Needs verification**; known improvable English gaps produce **Possible with actions**. The engine does not calculate admission probability or invent GPA conversions.

## AI role

Gemini is optional and never changes program facts, Fit Score, eligibility, or roadmap rules. Requests are made only from server routes. Responses must match a strict schema and pass factual-safety checks; timeouts, provider errors, malformed output, and unsupported claims return deterministic fallback content.

Configure the server-only AI variables in `.env.local`:

```dotenv
AI_API_URL=https://your-json-chat-endpoint.example/v1/chat/completions
AI_API_KEY=your-server-only-key
AI_MODEL=your-model
```

## Verified program dataset

Production uses 18 bachelor programs verified from official university websites on **2026-09-17**:

- 11 technology and 7 business programs
- Astana IT University, University of Twente, LUT University, Hong Kong University of Science and Technology, and Arizona State University
- Kazakhstan, Netherlands, Finland, Hong Kong, and United States

Each record links to its official program page and, where needed, separate admissions, tuition, and deadline pages. Missing facts remain `null` and render as **Unknown**. Missing SAT or IELTS information never becomes “not required.” Qualification-specific requirements remain descriptive, and users are prompted to verify time-sensitive facts before applying.

## Persistence and Supabase

Profiles and journey state save locally first, so the product remains usable offline or when Supabase is unavailable. When configured, the app creates an anonymous Supabase session and synchronizes the newest profile and journey state. Row-level security restricts each authenticated anonymous user to their own rows; derived recommendations are never stored remotely.

To enable cloud sync:

1. Enable Anonymous Sign-Ins in Supabase Authentication.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

See [`docs/supabase-setup.md`](docs/supabase-setup.md) for verification and operational notes. Never place a service-role or secret key in a `NEXT_PUBLIC_*` variable.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Limitations

- This is a curated sample, not a global university catalog.
- Fees, requirements, applicant categories, curricula, and deadlines can change after verification.
- Tuition is compared only when profile and program currencies match; no live exchange rates are used.
- Some university rules depend on nationality, qualification, residency, or alternative admission routes and therefore require manual verification.
- Anonymous Supabase identity is tied to the browser session; clearing browser storage can remove access to that cloud identity.
- Before a public launch, add bot protection and an anonymous-user cleanup policy as described in the Supabase setup guide.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
git diff --check
```
