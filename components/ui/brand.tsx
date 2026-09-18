import Link from "next/link";

export function Brand({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "on-dark";
}) {
  const isDark = variant === "on-dark";

  return (
    <Link
      href="/"
      className={`product-brand inline-flex items-center gap-2.5 font-bold tracking-[-0.03em] transition-opacity hover:opacity-95 ${
        isDark ? "text-white" : "text-[#10233F]"
      } ${className}`}
      aria-label="Fortech home"
    >
      <span className="product-brand-mark flex size-8 items-center justify-center rounded-lg bg-[#1677FF] text-sm font-bold text-white shadow-xs">
        F
      </span>
      <span className="text-lg font-bold tracking-tight">Fortech</span>
    </Link>
  );
}
