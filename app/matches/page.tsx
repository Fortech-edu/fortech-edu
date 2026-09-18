import type { Metadata } from "next";
import { MatchesView } from "@/components/matches/matches-view";
import { ProductShell } from "@/components/ui/product-shell";

export const metadata: Metadata = {
  title: "Your matches | Fortech",
};

export default function MatchesPage() {
  return (
    <ProductShell>
      <div className="mx-auto w-full max-w-[1280px]">
        <MatchesView />
      </div>
    </ProductShell>
  );
}
