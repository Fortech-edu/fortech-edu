import type { Metadata } from "next";
import { RoadmapView } from "@/components/journey/roadmap-view";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Your roadmap | Fortech",
};

export default function RoadmapPage() {
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]"><RoadmapView /></div>
    </ProductShell>
  );
}
