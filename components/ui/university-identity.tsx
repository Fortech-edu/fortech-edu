import { getUniversityMonogram } from "../../lib/admissions/university-monogram.ts";

export { getUniversityMonogram };

interface UniversityIdentityProps {
  universityName: string;
  programName?: string;
  location?: string | null;
  degreeLevel?: string | null;
  showMonogram?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * UniversityIdentity Foundation Component
 *
 * Enforces the primary design hierarchy:
 * UNIVERSITY (primary, bold, prominent)
 * -> Program (subordinate, secondary)
 * -> Location / Degree Level (metadata)
 */
export function UniversityIdentity({
  universityName,
  programName,
  location,
  degreeLevel,
  showMonogram = false,
  size = "md",
  className = "",
}: UniversityIdentityProps) {
  const monogram = showMonogram ? getUniversityMonogram(universityName) : null;

  const universityClass =
    size === "lg"
      ? "text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#10233F]"
      : size === "sm"
        ? "text-sm font-bold tracking-[-0.02em] text-[#10233F]"
        : "text-base sm:text-lg font-bold tracking-[-0.02em] text-[#10233F]";

  const programClass =
    size === "lg"
      ? "text-base font-semibold text-[#1677FF] mt-0.5"
      : size === "sm"
        ? "text-xs font-medium text-[#64748B] mt-0.5"
        : "text-sm font-medium text-[#1677FF] mt-0.5";

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {monogram && (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#D7E7FA] bg-[#EDF4FD] text-xs font-bold tracking-tight text-[#10233F] shadow-xs"
        >
          {monogram}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className={universityClass}>{universityName}</div>
        {programName && <div className={programClass}>{programName}</div>}
        {(location || degreeLevel) && (
          <p className="mt-1 text-[12.5px] text-[#64748B]">
            {[location, degreeLevel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
