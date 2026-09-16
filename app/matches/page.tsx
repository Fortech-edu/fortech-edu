import type { Metadata } from "next";
import { MatchesView } from "@/components/matches/matches-view";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Your matches | Admission Journey",
};

export default function MatchesPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f0f7f3_0,#f6f8f5_22rem)]">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <Brand />
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-4 sm:px-8 sm:pt-8">
        <MatchesView />
      </div>
    </main>
  );
}
