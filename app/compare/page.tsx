import type { Metadata } from "next";
import { CompareView } from "@/components/matches/compare-view";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Compare programs | Fortech",
};

export default function ComparePage() {
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]"><CompareView /></div>
    </ProductShell>
  );
}
