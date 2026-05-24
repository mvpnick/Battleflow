import { z } from 'zod'
import { textOf, type Catalogue, type Profile } from '../parsers/bsdata'
import type { ResolvedUnit } from './resolve'
import {
  DATA_SCHEMA_VERSION,
  type FactionArtifact,
  type GlossaryRule,
  type PreparedUnit,
} from '../dataModel'
import type { Stats, Weapon, Rule } from '../types'

const PHASE_IDS = ['command', 'movement', 'shooting', 'charge', 'fight', 'battleshock'] as const

/** Priority order for picking a single display "role" from a unit's keywords. */
const ROLE_KEYWORDS = [
  'Epic Hero', 'Character', 'Battleline', 'Dedicated Transport', 'Infantry',
  'Mounted', 'Beast', 'Swarm', 'Vehicle', 'Walker', 'Monster', 'Aircraft',
  'Fortification', 'Titanic',
]

function statsFromProfile(p: Profile, exclude: Set<string> = new Set()): Stats {
  const stats: Stats = {}
  for (const c of p.characteristics?.characteristic ?? []) {
    if (exclude.has(c.name)) continue
    stats[c.name] = c['#text'] ?? ''
  }
  return stats
}

function weaponFromProfile(p: Profile): Weapon {
  const keywords = (p.characteristics?.characteristic ?? []).find((c) => c.name === 'Keywords')
  const tags = (keywords?.['#text'] ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && t !== '-')
  return {
    name: p.name,
    kind: p.typeName === 'Ranged Weapons' ? 'ranged' : 'melee',
    stats: statsFromProfile(p, new Set(['Keywords'])),
    tags,
    mods: [],
  }
}

function abilityFromProfile(p: Profile, source: string): Rule {
  const chars = p.characteristics?.characteristic ?? []
  const description = chars.find((c) => c.name === 'Description')
  const effect = description?.['#text'] ?? chars.map((c) => `${c.name}: ${c['#text'] ?? ''}`).join('; ')
  return { name: p.name, timing: '', effect, source }
}

function deriveRole(keywords: string[]): string {
  return ROLE_KEYWORDS.find((r) => keywords.includes(r)) ?? ''
}

/**
 * Dedupe by a content key, not just name — two distinct profiles can share a display
 * name (e.g. wargear reached via multiple option paths) yet differ in stats/effect, and
 * keying on name alone would silently drop one.
 */
function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

const StatsSchema = z.record(z.string(), z.string())
const ModifierSchema = z.object({ label: z.string(), cond: z.string().optional() })
const WeaponSchema = z.object({
  name: z.string(),
  kind: z.enum(['melee', 'ranged']),
  stats: StatsSchema,
  tags: z.array(z.string()),
  mods: z.array(ModifierSchema),
})
const RuleSchema = z.object({
  name: z.string(),
  timing: z.string(),
  cond: z.string().optional(),
  effect: z.string(),
  source: z.string(),
})
const StratSchema = RuleSchema.extend({
  cp: z.number(),
  once: z.union([z.enum(['battle', 'phase']), z.literal(false)]).optional(),
})
const GlossaryRuleSchema = RuleSchema.extend({ id: z.string() })
const PreparedUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  models: z.number(),
  tags: z.array(z.string()),
  hot: z.array(z.string()),
  weapons: z.array(WeaponSchema),
  abilities: z.array(RuleSchema),
  stratagems: z.array(StratSchema),
  reminders: z.array(z.object({ text: z.string() })),
  bsId: z.string(),
  stats: StatsSchema.optional(),
  points: z.number().optional(),
  keywords: z.array(z.string()),
  ruleRefs: z.array(z.string()),
  phases: z.array(z.enum(PHASE_IDS)).optional(),
})
export const ManifestFactionSchema = z.object({
  factionId: z.string(),
  factionName: z.string(),
  artifact: z.string(),
  bytes: z.number(),
  sha256: z.string(),
  unitCount: z.number(),
})

export const DataManifestSchema = z.object({
  schemaVersion: z.literal(DATA_SCHEMA_VERSION),
  bsDataTag: z.string(),
  bsDataCommit: z.string(),
  buildTime: z.string(),
  factions: z.array(ManifestFactionSchema),
})

export const FactionArtifactSchema = z.object({
  schemaVersion: z.literal(DATA_SCHEMA_VERSION),
  factionId: z.string(),
  factionName: z.string(),
  bsCatalogueId: z.string(),
  factionKeywords: z.array(z.string()),
  detachments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rules: z.array(GlossaryRuleSchema),
      stratagems: z.array(StratSchema),
    }),
  ),
  units: z.array(PreparedUnitSchema),
  glossary: z.array(GlossaryRuleSchema),
})

export function toFactionArtifact(
  faction: Catalogue,
  resolved: ResolvedUnit[],
  factionId: string,
  factionKeywords: string[],
): FactionArtifact {
  const factionName = faction.name
  const glossaryMap = new Map<string, GlossaryRule>()

  const units: PreparedUnit[] = resolved.map((u) => {
    for (const rule of u.rules) {
      if (!glossaryMap.has(rule.id)) {
        glossaryMap.set(rule.id, {
          id: rule.id,
          name: rule.name,
          timing: '',
          effect: textOf(rule.description),
          source: factionName,
        })
      }
    }

    const stats = u.statProfile ? statsFromProfile(u.statProfile) : undefined

    const unit: PreparedUnit = {
      id: u.bsId,
      bsId: u.bsId,
      name: u.name,
      role: deriveRole(u.keywords),
      models: 1,
      tags: u.keywords,
      hot: [],
      weapons: dedupeBy(u.weapons.map(weaponFromProfile), (w) => `${w.kind}|${w.name}|${JSON.stringify(w.stats)}`),
      abilities: dedupeBy(u.abilities.map((p) => abilityFromProfile(p, factionName)), (a) => `${a.name}|${a.effect}`),
      stratagems: [],
      reminders: [],
      keywords: u.keywords,
      ruleRefs: u.rules.map((r) => r.id),
    }
    if (stats && Object.keys(stats).length) unit.stats = stats
    const points = u.points != null ? Number(u.points) : NaN
    if (!Number.isNaN(points)) unit.points = points
    return unit
  })

  const artifact: FactionArtifact = {
    schemaVersion: DATA_SCHEMA_VERSION,
    factionId,
    factionName,
    bsCatalogueId: faction.id,
    factionKeywords,
    detachments: [],
    units,
    glossary: [...glossaryMap.values()],
  }

  return FactionArtifactSchema.parse(artifact) as FactionArtifact
}
