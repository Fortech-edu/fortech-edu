import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: "Your matches | Admission Journey",
};

export default function MatchesPage() {
  return (
    <main className="min-h-dvh bg-forest-50">
      <header className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8">
        <Brand />
      </header>
      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-forest-100 font-bold text-forest-700">
          02
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
          Your matches are the next step.
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-muted">
          Your profile is saved and ready. Program recommendation cards will be built in the next phase.
        </p>
        <Link
          href="/diagnosis"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full border border-forest-200 bg-white px-6 font-semibold text-forest-700 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
        >
          Back to diagnosis
        </Link>
      </div>
    </main>
  );
}
