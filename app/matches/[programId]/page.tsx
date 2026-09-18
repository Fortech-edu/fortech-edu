import type { Metadata } from "next";
import { ProgramDetailView } from "@/components/matches/program-detail-view";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Program details | Fortech",
};

export default async function ProgramDetailsPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]"><ProgramDetailView programId={programId} /></div>
    </ProductShell>
  );
}
