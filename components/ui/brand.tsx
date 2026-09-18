import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="product-brand inline-flex items-center gap-3 font-semibold tracking-[-0.03em] text-[var(--ink)]"
      aria-label="Fortech home"
    >
      <span className="product-brand-mark flex size-9 items-center justify-center rounded-full bg-[var(--dark)] text-sm font-bold text-white">
        F
      </span>
      <span className="text-lg">Fortech</span>
    </Link>
  );
}
