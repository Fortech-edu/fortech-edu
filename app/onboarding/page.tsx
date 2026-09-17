import type { Metadata } from "next";
import { OnboardingForm } from "@/components/journey/onboarding-form";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Build your profile | Admission Journey",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#eef6f1_0,#f6f8f5_24rem)]">
      <header className="mx-auto w-full max-w-[1280px] px-5 py-5 sm:px-8 sm:py-7">
        <Brand />
      </header>
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-2 sm:px-8 sm:pb-16 sm:pt-4">
        <OnboardingForm />
        <p className="mt-5 text-center text-xs leading-5 text-muted lg:ml-[35%]">
          Your draft is saved in this browser immediately. Cloud sync runs in the background when configured.
        </p>
      </div>
    </main>
  );
}
