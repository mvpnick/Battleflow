/** Canonical string normalizer used across roster parsing and matching. */
export function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}
