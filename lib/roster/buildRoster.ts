import type { FactionArtifact, PreparedUnit } from '../dataModel'
import type { PhaseId, Roster, Rule, Stats, Strat, Unit, Weapon } from '../types'
import type { ParsedArmy } from './parseGwText'
import { norm } from './normalize'
import { abilityPhasesFor } from './abilityPhase'
import { findPlainInvulnSave, stripPlainInvulnSave, withInvulnSv } from './invulnSave'

const NON_WEAPON_PHASES: PhaseId[] = ['command', 'movement', 'charge', 'battleshock']
const WEAPON_PHASES: { phase: PhaseId; kind: 'melee' | 'ranged' }[] = [
  { phase: 'fight', kind: 'melee' },
  { phase: 'shooting', kind: 'ranged' },
]

/**
 * Statline keys that are actually consulted in each phase.
 *
 *  - command / battleshock → LD (Leadership) and OC (Objective Control)
 *  - movement / charge     → M (Move) and OC
 *  - shooting / fight      → T (Toughness), SV (Save), W (Wounds)
 *
 * WS / BS aren't listed here — those ride on the weapon profile, not the
 * unit statline, so the weapon-kind filter already covers them.
 */
const STATS_BY_PHASE: Record<PhaseId, readonly string[]> = {
  command:     ['LD', 'OC'],
  movement:    ['M', 'OC'],
  shooting:    ['T', 'SV', 'W'],
  charge:      ['M', 'OC'],
  fight:       ['T', 'SV', 'W'],
  battleshock: ['LD', 'OC'],
}

/** Project `stats` down to the keys relevant for `phase`. Missing keys are dropped silently. */
function pickStats(stats: Stats | undefined, phase: PhaseId): Stats | undefined {
  if (!stats) return undefined
  const picked: Stats = {}
  for (const key of STATS_BY_PHASE[phase]) {
    if (key in stats) picked[key] = stats[key]
  }
  return picked
}

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
 *  Empty set means no wargear was parsed (format without bullet lines) → pass all through.
 *  BSData names multi-profile weapons with a leading ➤ and a " - <profile>" suffix
 *  (e.g. "➤ Great axe of Khorne - strike"). Army list exports name the weapon without
 *  those decorations, so we also match against the stripped base name. */
function filterWeapons(weapons: Weapon[], wargearSet: Set<string>): Weapon[] {
  if (wargearSet.size === 0) return weapons
  return weapons.filter(w => {
    if (wargearSet.has(norm(w.name))) return true
    if (!w.name.startsWith('➤')) return false
    const base = norm(w.name.replace(/^➤\s*/, '').replace(/\s+-\s+.+$/, ''))
    return wargearSet.has(base)
  })
}

export type RosterMeta = {
  factionName: string
  detachment?: string
  points?: number
  stratagems?: Strat[]
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

  // Strip parenthetical suffixes (e.g. "Daemonic Incursion (Warp Rifts)" → "Daemonic Incursion")
  // during comparison only; the raw parsed.detachment is preserved for display.
  const stripParen = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const detNorm = norm(parsed.detachment ?? '')
  const detNormStripped = norm(stripParen(parsed.detachment ?? ''))
  const matchedDetachment = artifact.detachments.find(d => {
    const dn = norm(d.name)
    return dn === detNorm || dn === detNormStripped
  })
  if (matchedDetachment) meta.stratagems = matchedDetachment.stratagems

  // Index the matched detachment's enhancements once per build, so each unit can
  // resolve its army-list enhancement bullets to the full Rule (for the drawer).
  const enhancementsByKey = new Map<string, Rule>()
  for (const enh of matchedDetachment?.enhancements ?? []) {
    enhancementsByKey.set(norm(enh.name), enh)
  }

  for (const parsedUnit of parsed.units) {
    const matched = matchUnit(parsedUnit.name, artifact.units)
    if (!matched) continue

    const wargearSet = new Set(parsedUnit.wargear.map(norm))
    const filteredWeapons = filterWeapons(matched.weapons, wargearSet)

    // Fold a plain "Invulnerable Save" ability into the SV stat ("7+, 4++")
    // and drop it from the abilities list — see lib/roster/invulnSave.ts.
    const invulnDigit = findPlainInvulnSave(matched.abilities)
    const baseStats = withInvulnSv(matched.stats, invulnDigit)
    const baseAbilities = invulnDigit ? stripPlainInvulnSave(matched.abilities) : matched.abilities

    // Split parsed enhancement names: those matching a known detachment enhancement
    // become clickable Rule chips; the rest fall back to plain hot chips (covers
    // synthesized detachments and factions with no enhancement coverage yet).
    const enhancements: Rule[] = []
    const unresolvedEnhancements: string[] = []
    for (const name of parsedUnit.enhancements) {
      const rule = enhancementsByKey.get(norm(name))
      if (rule) enhancements.push(rule)
      else unresolvedEnhancements.push(name)
    }

    const base: Unit = {
      id: matched.id,
      name: matched.name,
      role: matched.role,
      models: matched.models,
      stats: baseStats,
      tags: matched.tags,
      // Unit's own hot[] entries plus any enhancement names we couldn't resolve.
      hot: dedup([...matched.hot, ...unresolvedEnhancements]),
      enhancements,
      weapons: filteredWeapons,
      abilities: baseAbilities,
      stratagems: matched.stratagems,
      reminders: matched.reminders,
    }

    // Pre-compute each ability's relevant phase set once per unit so the
    // per-phase filter below is a cheap Set lookup.
    const abilityPhases = base.abilities.map(a => abilityPhasesFor(a))

    // The unfiltered datasheet view, attached to every per-phase copy so the
    // expanded card can render the whole profile regardless of phase. Object
    // references are shared across the six copies — no actual duplication.
    const full = {
      stats: base.stats,
      weapons: filteredWeapons,
      abilities: base.abilities,
    }

    /**
     * Build the per-phase copy of this unit: trims stats to the keys consulted
     * in `phase`, drops abilities whose prose doesn't reference the phase
     * (passive abilities pass through every phase via `abilityPhasesFor`), and
     * substitutes the supplied weapons list. `full` is shared across all six
     * copies and powers the expanded-datasheet view.
     */
    const phaseUnit = (phase: PhaseId, weapons: Weapon[]): Unit => ({
      ...base,
      stats: pickStats(base.stats, phase),
      abilities: base.abilities.filter((_, i) => abilityPhases[i].has(phase)),
      weapons,
      full,
    })

    // Non-weapon phases: no weapons surfaced, but the unit still appears for
    // its abilities and statline.
    for (const phase of NON_WEAPON_PHASES) {
      roster[phase] = [...(roster[phase] ?? []), phaseUnit(phase, [])]
    }

    // Weapon phases: only include the unit if it has at least one weapon of
    // the matching kind after wargear filtering.
    for (const { phase, kind } of WEAPON_PHASES) {
      const kindWeapons = filteredWeapons.filter(w => w.kind === kind)
      if (kindWeapons.length === 0) continue
      roster[phase] = [...(roster[phase] ?? []), phaseUnit(phase, kindWeapons)]
    }
  }

  return { roster, meta }
}
