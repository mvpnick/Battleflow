/**
 * Shared stratagem utilities.
 *
 * Stratagems carry no structured phase field — `Strat.timing` is Wahapedia
 * prose (e.g. "Fight phase", "Your opponent's Shooting phase", "After enemy
 * unit fights"). Phase matching is therefore a keyword heuristic: if the
 * timing string contains a known phase pattern the stratagem is considered
 * phase-specific; if it contains none it is shown on every phase tab.
 *
 * Round-boundary phrasing maps to the structural turn that owns the boundary:
 *  - "start of the (battle) round" → command phase (first phase of the round).
 *  - "end of the (battle) round"   → battleshock (last step of the round).
 */

import { PhaseId } from '@/lib/types'

const ROUND_DET = '(?:the |a |an |any |each |every |its |next |the next )?'
const ROUND_START_RE = new RegExp(`\\bstart of ${ROUND_DET}(?:battle )?round\\b`, 'i')
const ROUND_END_RE   = new RegExp(`\\bend of ${ROUND_DET}(?:battle )?round\\b`, 'i')

// ---------------------------------------------------------------------------
// Per-phase patterns. Each PhaseId maps to one-or-more case-insensitive
// patterns; a stratagem's timing string is phase-specific for `phase` iff any
// of `PHASE_PATTERNS[phase]` matches it.
// ---------------------------------------------------------------------------

export const PHASE_PATTERNS: Record<PhaseId, RegExp[]> = {
  command:     [/\bcommand\b/i, ROUND_START_RE],
  movement:    [/\bmovement\b/i],
  shooting:    [/\bshooting\b/i],
  charge:      [/\bcharge\b/i],
  fight:       [/\bfight\b/i],
  battleshock: [/\bbattle-?shock\b/i, ROUND_END_RE],
}

/** True iff `timing` explicitly names `phase` (via any of its patterns). */
export function stratagemNamesPhase(timing: string, phase: PhaseId): boolean {
  return PHASE_PATTERNS[phase].some(p => p.test(timing))
}

/**
 * Returns `true` when a stratagem should appear on the given phase tab.
 *
 * Rules:
 *  - If `timing` matches none of the known phase patterns → "any phase"
 *    stratagem → show on every tab (return `true`).
 *  - If `timing` matches at least one phase pattern → phase-specific
 *    stratagem → show only on tabs whose pattern also matches.
 */
export function stratagemMatchesPhase(timing: string, phase: PhaseId): boolean {
  const isPhaseSpecific = Object.values(PHASE_PATTERNS).some(arr =>
    arr.some(p => p.test(timing)),
  )
  if (!isPhaseSpecific) return true
  return stratagemNamesPhase(timing, phase)
}
