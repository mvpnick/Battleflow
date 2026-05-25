import type { FactionArtifact, PreparedUnit } from '../dataModel'
import type { PhaseId, Roster, Unit, Weapon } from '../types'
import type { ParsedArmy } from './parseGwText'
import { norm } from './normalize'

const NON_WEAPON_PHASES: PhaseId[] = ['command', 'movement', 'charge', 'battleshock']
const WEAPON_PHASES: { phase: PhaseId; kind: 'melee' | 'ranged' }[] = [
  { phase: 'fight', kind: 'melee' },
  { phase: 'shooting', kind: 'ranged' },
]

function dedup(strs: string[]): string[] {
  const seen = new Set<string>()
  return strs.filter(s => {
    const k = norm(s)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function matchUnit(name: string, units: PreparedUnit[]): PreparedUnit | undefined {
  const key = norm(name)
  return units.find(u => norm(u.name) === key)
}

/** Keep only weapons whose normalized name is in the parsed wargear set.
 *  Empty set means no wargear was parsed (format without bullet lines) → pass all through. */
function filterWeapons(weapons: Weapon[], wargearSet: Set<string>): Weapon[] {
  if (wargearSet.size === 0) return weapons
  return weapons.filter(w => wargearSet.has(norm(w.name)))
}

export type RosterMeta = {
  factionName: string
  detachment?: string
  points?: number
}

/**
 * Build a phase-keyed Roster from a parsed GW army list and a faction artifact.
 *
 * Phase assignment rules:
 *   - fight    → units that have at least one melee weapon after wargear filtering
 *   - shooting → units that have at least one ranged weapon after wargear filtering
 *   - command / movement / charge / battleshock → every unit, weapons array empty
 *     (non-weapon phases show abilities only)
 *
 * Unrecognized units (no name match) and unrecognized wargear (no weapon match)
 * are silently dropped.
 */
export function buildRoster(
  parsed: ParsedArmy,
  artifact: FactionArtifact,
): { roster: Roster; meta: RosterMeta } {
  const roster: Roster = {}
  const meta: RosterMeta = {
    factionName: artifact.factionName,
    detachment: parsed.detachment,
    points: parsed.totalPoints,
  }

  for (const parsedUnit of parsed.units) {
    const matched = matchUnit(parsedUnit.name, artifact.units)
    if (!matched) continue

    const wargearSet = new Set(parsedUnit.wargear.map(norm))
    const filteredWeapons = filterWeapons(matched.weapons, wargearSet)

    const unit: Unit = {
      id: matched.id,
      name: matched.name,
      role: matched.role,
      models: matched.models,
      stats: matched.stats,
      tags: matched.tags,
      // Enhancements from the army list are surfaced as hot chips alongside the
      // unit's own hot[] entries (e.g. "+1 Atk if charged").
      hot: dedup([...matched.hot, ...parsedUnit.enhancements]),
      weapons: filteredWeapons,
      abilities: matched.abilities,
      stratagems: matched.stratagems,
      reminders: matched.reminders,
    }

    // Non-weapon phases: all abilities, no weapons
    const unitNoWeapons: Unit = { ...unit, weapons: [] }
    for (const phase of NON_WEAPON_PHASES) {
      roster[phase] = [...(roster[phase] ?? []), unitNoWeapons]
    }

    // Weapon phases: only units with at least one weapon of the correct kind
    for (const { phase, kind } of WEAPON_PHASES) {
      const kindWeapons = filteredWeapons.filter(w => w.kind === kind)
      if (kindWeapons.length === 0) continue
      roster[phase] = [...(roster[phase] ?? []), { ...unit, weapons: kindWeapons }]
    }
  }

  return { roster, meta }
}
