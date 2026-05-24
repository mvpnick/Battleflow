import type { FactionArtifact } from '../dataModel'
import type { PhaseId, Roster, Unit } from '../types'

const PHASE_IDS: PhaseId[] = ['command', 'movement', 'shooting', 'charge', 'fight', 'battleshock']

/**
 * Bridge a prepared faction artifact into the phase-keyed `Roster` shape the UI
 * consumes today.
 *
 * STOPGAP: phase inference is a later round, so we don't yet know which phase each
 * unit acts in. Until then every unit is surfaced under every phase, so the screen
 * works as a full faction datasheet browser. Once `PreparedUnit.phases` is populated,
 * this should bucket by those instead.
 */
export function toRoster(artifact: FactionArtifact): Roster {
  const units = [...artifact.units].sort((a, b) => a.name.localeCompare(b.name)) as Unit[]
  const roster: Roster = {}
  for (const phase of PHASE_IDS) roster[phase] = units
  return roster
}
