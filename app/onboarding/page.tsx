import type { Metadata } from "next";
import { OnboardingForm } from "@/components/journey/onboarding-form";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Build your profile | Fortech",
};

export default function OnboardingPage() {
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]">
        <OnboardingForm />
        <p className="mt-5 text-center text-xs leading-5 text-muted lg:ml-[35%]">
          Your draft is saved in this browser immediately. Cloud sync runs in the background when configured.
        </p>
      </div>
    </ProductShell>
  );
}
