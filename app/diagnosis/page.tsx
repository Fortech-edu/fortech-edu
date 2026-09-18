import type { Metadata } from "next";
import { DiagnosisView } from "@/components/journey/diagnosis-view";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Your diagnosis | Fortech",
};

export default function DiagnosisPage() {
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]">
        <DiagnosisView />
      </div>
    </ProductShell>
  );
}
