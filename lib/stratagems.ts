/**
 * Shared stratagem utilities.
 *
 * Stratagems carry no structured phase field — `Strat.timing` is Wahapedia
 * prose (e.g. "Fight phase", "Your opponent's Shooting phase", "After enemy
 * unit fights").  Phase matching is therefore a keyword heuristic: if the
 * timing string contains a known phase word the stratagem is considered
 * phase-specific; if it contains no phase word it is shown on every phase tab.
 */

import { PhaseId } from '@/lib/types'

// ---------------------------------------------------------------------------
// Phase keyword map
// Each PhaseId maps to the lowercase substring that identifies that phase
// inside a free-form Wahapedia timing string.
// ---------------------------------------------------------------------------

export const PHASE_KEYWORDS: Record<PhaseId, string> = {
  command:     'command',
  movement:    'movement',
  shooting:    'shooting',
  charge:      'charge',
  fight:       'fight',
  battleshock: 'battleshock',
}

// Pre-computed flat list of every known phase keyword (used for the
// "does this timing mention *any* phase?" check).
const ALL_PHASE_WORDS = Object.values(PHASE_KEYWORDS)

/**
 * Returns `true` when a stratagem should appear on the given phase tab.
 *
 * Rules:
 *  - If `timing` contains none of the known phase keywords → "any phase"
 *    stratagem → show on every tab (return `true`).
 *  - If `timing` contains at least one known phase keyword → phase-specific
 *    stratagem → show only on tabs whose keyword also appears (return `true`
 *    only when `PHASE_KEYWORDS[phase]` is present in `timing`).
 *
 * The comparison is case-insensitive so "Fight phase", "fight", and
 * "FIGHT PHASE" all match the `fight` tab.
 */
export function stratagemMatchesPhase(timing: string, phase: PhaseId): boolean {
  const lower = timing.toLowerCase()

  // Check whether *any* phase word appears in this timing string.
  const isPhaseSpecific = ALL_PHASE_WORDS.some(word => lower.includes(word))

  if (!isPhaseSpecific) {
    // No phase keyword found → "any phase" → show everywhere.
    return true
  }

  // Phase-specific: show only when the active phase's keyword is present.
  return lower.includes(PHASE_KEYWORDS[phase])
}
