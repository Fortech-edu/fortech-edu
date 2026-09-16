import type { Metadata } from "next";
import { ProgramDetailView } from "@/components/matches/program-detail-view";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Program details | Admission Journey",
};

export default async function ProgramDetailsPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f0f7f3_0,#f6f8f5_22rem)]">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8"><Brand /></header>
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-2 sm:px-8"><ProgramDetailView programId={programId} /></div>
    </main>
  );
}
