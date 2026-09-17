# Supabase setup

1. Create a Supabase project.
2. In **Authentication > Providers > Anonymous Sign-Ins**, enable anonymous sign-ins. No login screen is required.
3. Open the SQL Editor, paste [`supabase/schema.sql`](../supabase/schema.sql), and run it once. The script creates two RLS-protected tables and grants Data API access only to authenticated users.
4. In **Project Settings > API**, copy the project URL and publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy anon key also works as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy `.env.example` to `.env.local` and replace the placeholders. Never use a service-role or secret key in a `NEXT_PUBLIC_*` variable.
6. If your project restricts exposed Data API schemas, confirm that `public` is exposed under **Integrations > Data API**.
7. Restart `npm run dev`.

To verify sync, complete onboarding and inspect `profiles` and `journey_state` in the Table Editor. Refresh the app after changing a profile or roadmap task. The same anonymous user should retain the state, while another browser profile must not be able to read it.

Anonymous users are tied to the browser's persisted Supabase session. Clearing browser storage or signing out loses access to that anonymous identity. Before a public launch, add CAPTCHA or Turnstile and an anonymous-user cleanup policy to control abuse and unused accounts.
