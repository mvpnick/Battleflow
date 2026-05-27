/**
 * Faction keyword derivation logic, extracted from the BSData ingest CLI.
 *
 * `deriveFactionKeywords` determines which `"Faction: X"` strings truly belong to
 * a faction (as opposed to ally catalogues imported for roster-building). The logic
 * runs in two passes:
 *
 * 1. **NAME-MATCH** — Find the enumerable catalogue whose name best matches the
 *    faction slug. Its `"Faction: X"` keywords become the "native" set.
 *
 * 2. **SUB-KEYWORD** — Also include any `"Faction: X"` keyword that co-occurs only
 *    with units that already carry a native keyword (e.g. `"Faction: Blood Angels"`
 *    always appears alongside `"Faction: Adeptus Astartes"`).
 *
 * Kept in a dedicated module so the logic can be unit-tested without running the
 * full ingest pipeline.
 */

import type { Catalogue } from '../parsers/bsdata'
import { enumerateUnits, type BsIndex, type ResolvedUnit } from './resolve'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One node in a faction's catalogue chain.  `enumerateRoots` marks catalogues whose
 * top-level entries are offered as fieldable datasheets.
 */
export type ChainEntry = {
  catalogue: Catalogue
  enumerateRoots: boolean
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive the canonical `"Faction: X"` keyword strings for a faction.
 *
 * @param chain    The full catalogue chain for the faction (primary + all imports).
 * @param units    All `ResolvedUnit`s already enumerated across the full chain.
 * @param slug     The faction's hyphenated slug (e.g. `"blood-angels"`).
 * @param index    The BSData cross-reference index built from the chain.
 * @returns        The unique `"Faction: X"` strings that belong to this faction.
 *
 * ### Pass 1 — name-match
 *
 * Each enumerable catalogue in the chain is scored by how many slug words appear
 * in its name.  The highest-scoring one (tie-broken by unit count) is the "native"
 * catalogue; its `"Faction: X"` keywords seed the result.
 *
 * Example: Chaos Daemons has two enumerable catalogues — "Chaos - Chaos Daemons"
 * (31 units, score 2 for "chaos" + "daemons") and "Chaos - Daemons Library" (64
 * units, score 2).  The library wins the tie-break by unit count and its keyword
 * `"Faction: Legiones Daemonica"` becomes the seed.
 *
 * ### Pass 2 — sub-keyword
 *
 * Any `"Faction: X"` keyword that:
 *   - appears in ≥2 native units, AND
 *   - every unit carrying it is native
 *
 * is added to the result.  This captures sub-faction keywords like
 * `"Faction: Blood Angels"` (every BA unit also carries `"Faction: Adeptus
 * Astartes"`, so both filter identically). Keywords from separate groups (Agents of
 * the Imperium, Imperial Knights …) appear in units that are NOT native and are
 * therefore excluded.
 */
export function deriveFactionKeywords(
  chain: ChainEntry[],
  units: ResolvedUnit[],
  slug: string,
  index: BsIndex,
): string[] {
  // --- Pass 1: name-match to find the native catalogue ---

  /** How many slug words appear in the given catalogue name (case-insensitive). */
  const slugWords = slug.split('-')
  const nameScore = (catalogueName: string): number =>
    slugWords.filter((w) => catalogueName.toLowerCase().includes(w)).length

  // Enumerate units per enumerable entry once (used for both the tie-break and
  // the native-id set in Pass 2).
  const enumerableEntries = chain.filter((c) => c.enumerateRoots)
  const unitsByEntry = new Map(
    enumerableEntries.map((e) => [e, enumerateUnits([e.catalogue], index)]),
  )

  // Start from the primary catalogue and update whenever a later entry scores
  // higher or ties with more units.
  let bestScore = nameScore(chain[0].catalogue.name)
  let bestCatUnits: ResolvedUnit[] = unitsByEntry.get(enumerableEntries[0]) ?? []

  for (const entry of enumerableEntries.slice(1)) {
    const score = nameScore(entry.catalogue.name)
    if (score < bestScore) continue
    const catUnits = unitsByEntry.get(entry)!
    if (score > bestScore || catUnits.length > bestCatUnits.length) {
      bestScore = score
      bestCatUnits = catUnits
    }
  }

  const nativeIds = new Set(bestCatUnits.map((u) => u.bsId))
  const nativeKeywords = new Set(
    bestCatUnits.flatMap((u) => u.keywords.filter((k) => k.startsWith('Faction: '))),
  )
  const factionKeywords = [...nativeKeywords]

  // --- Pass 2: sub-keyword — include co-occurring faction keywords ---

  const isFactionKw = (k: string): boolean => k.startsWith('Faction: ')
  const allFactionKws = [...new Set(units.flatMap((u) => u.keywords.filter(isFactionKw)))]

  for (const kw of allFactionKws) {
    if (nativeKeywords.has(kw)) continue // already included
    const kwUnits = units.filter((u) => u.keywords.includes(kw))
    // Require ≥2 native units (prevents lone-character sub-factions from inflating
    // factionKeywords) and all carriers must be native (excludes ally keywords).
    if (kwUnits.length >= 2 && kwUnits.every((u) => nativeIds.has(u.bsId))) {
      factionKeywords.push(kw)
    }
  }

  return factionKeywords
}
