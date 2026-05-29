/**
 * Canonical string normalizer used across roster parsing and matching.
 *
 * Folds typographic punctuation to its ASCII equivalent before lowercasing and
 * whitespace-collapsing, so a roster pasted with straight `'` matches an
 * artifact that stores Wahapedia's curly `’` (and vice versa). Covers:
 *  - apostrophes: `’ ‘ ‛` → `'`
 *  - double quotes: `“ ” „` → `"`
 *  - dashes: `– — ‐` → `-`
 *  - NBSP (U+00A0) → space (collapsed by the trailing whitespace pass)
 */
export function norm(s: string): string {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—‐]/g, '-')
    .replace(/ /g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
