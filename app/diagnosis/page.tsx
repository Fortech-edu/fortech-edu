import type { Metadata } from "next";
import { DiagnosisView } from "@/components/journey/diagnosis-view";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Your diagnosis | Admission Journey",
};

export default function DiagnosisPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#eef6f1_0,#f6f8f5_24rem)]">
      <header className="mx-auto w-full max-w-[1280px] px-5 py-5 sm:px-8 sm:py-7">
        <Brand />
      </header>
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-2 sm:px-8 sm:pt-4">
        <DiagnosisView />
      </div>
    </main>
  );
}
