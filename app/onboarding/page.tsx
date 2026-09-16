import type { Metadata } from "next";
import { OnboardingForm } from "@/components/journey/onboarding-form";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Build your profile | Admission Journey",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f0f7f3_0,#f6f8f5_20rem)]">
      <header className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
        <Brand />
      </header>
      <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-4 sm:px-8 sm:pt-8">
        <OnboardingForm />
        <p className="mt-5 text-center text-xs leading-5 text-muted">
          Your draft is stored only in this browser. No account or external database is used.
        </p>
      </div>
    </main>
  );
}
