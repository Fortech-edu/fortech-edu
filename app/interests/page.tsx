import type { Metadata } from "next";
import { InterestTest } from "@/components/interests/interest-test";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Interest check | Fortech",
  description:
    "A short interest questionnaire based on Holland's RIASEC model that suggests which study direction to start from.",
};

export default function InterestsPage() {
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]">
        <InterestTest />
      </div>
    </ProductShell>
  );
}
