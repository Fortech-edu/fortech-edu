import Link from "next/link";
import { Brand } from "./brand";

export function ProductShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="product-shell flex min-h-dvh flex-col">
      <header className="product-header sticky top-0 z-50 border-b border-black/15 bg-[color:var(--page)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Brand />
          <nav aria-label="Product navigation" className="flex items-center gap-1 sm:gap-5">
            <Link href="/interests" className="product-nav-link hidden md:inline-flex">Interests</Link>
            <Link href="/diagnosis" className="product-nav-link hidden sm:inline-flex">Diagnosis</Link>
            <Link href="/matches" className="product-nav-link hidden sm:inline-flex">Matches</Link>
            <Link href="/roadmap" className="product-nav-link hidden md:inline-flex">Roadmap</Link>
            <Link href="/onboarding" className="product-nav-action">Profile</Link>
          </nav>
        </div>
      </header>
      <div className="product-page mx-auto w-full max-w-[1400px] flex-1 px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pb-28 lg:pt-16">
        {children}
      </div>
      <footer className="mt-auto border-t border-black/15 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Fortech supports decisions; universities make admission decisions.</p>
          <Link href="/" className="product-text-link font-semibold text-[var(--ink)]">Return to landing</Link>
        </div>
      </footer>
    </main>
  );
}
