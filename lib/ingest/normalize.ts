/**
 * Ingest normalization: converts BSData resolved units into `FactionArtifact` shape.
 *
 * Schemas are defined in `lib/schemas.ts` (the single source of truth); this module
 * re-exports the ones that the rest of the ingest pipeline (`emit.ts`, tests) import,
 * so those callers need no path changes. Only `toFactionArtifact()` and its
 * BSData-specific helpers live here.
 */

// Re-export schemas so ingest consumers keep `import ... from './normalize'` unchanged.
export {
  FactionArtifactSchema,
  DataManifestSchema,
  SharedDetachmentSetSchema,
  ManifestFactionSchema,
} from '../schemas'

import { textOf, type Catalogue, type Profile } from '../parsers/bsdata'
import type { ResolvedUnit } from './resolve'
import {
  DATA_SCHEMA_VERSION,
  FactionArtifactSchema,
  type Detachment,
  type FactionArtifact,
  type GlossaryRule,
  type PreparedUnit,
} from '../schemas'
import type { Stats, Weapon, Rule } from '../types'

// ---------------------------------------------------------------------------
// BSData-specific helpers (ingest-only, not exported)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a resolved BSData catalogue + units into a validated `FactionArtifact`.
 * This is the final step of the BSData ingest pipeline; the artifact is then
 * serialized and written to `public/data/factions/<id>.json` by `emit.ts`.
 */
export function toFactionArtifact(
  faction: Catalogue,
  resolved: ResolvedUnit[],
  factionId: string,
  factionKeywords: string[],
  detachments: Detachment[] = [],
): FactionArtifact {
  const factionName = faction.name
  const glossaryMap = new Map<string, GlossaryRule>()

  const units: PreparedUnit[] = resolved.map((u) => {
    // Collect rules from each unit into the faction-level glossary (deduped by id).
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
    detachments,
    units,
    glossary: [...glossaryMap.values()],
  }

  // Parse validates the artifact shape and strips any unknown fields.
  return FactionArtifactSchema.parse(artifact) as FactionArtifact
}
