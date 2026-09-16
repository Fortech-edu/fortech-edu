import type { Metadata } from "next";
import { DiagnosisView } from "@/components/journey/diagnosis-view";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Your diagnosis | Admission Journey",
};

export default function DiagnosisPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f0f7f3_0,#f6f8f5_22rem)]">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <Brand />
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-4 sm:px-8 sm:pt-8">
        <DiagnosisView />
      </div>
    </main>
  );
}
