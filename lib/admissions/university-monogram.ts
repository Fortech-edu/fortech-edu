/**
 * Typographic University Monogram Helper
 *
 * Derives a clean, neutral, 2-3 letter monogram abbreviation purely from
 * the real university name (e.g. "LUT University" -> "LU", "University of Twente" -> "UT").
 * Does not make external branding claims or invent fake logos.
 */
export function getUniversityMonogram(universityName: string): string {
  if (!universityName) return "";
  const stopWords = new Set(["of", "the", "and", "for", "at", "in"]);
  const words = universityName
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w && !stopWords.has(w.toLowerCase()));

  if (words.length === 0) return universityName.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}
