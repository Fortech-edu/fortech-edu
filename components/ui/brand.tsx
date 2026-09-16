import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-lg font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest-600"
      aria-label="Admission Journey home"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-forest-700 text-sm font-bold text-white">
        AJ
      </span>
      <span>Admission Journey</span>
    </Link>
  );
}
