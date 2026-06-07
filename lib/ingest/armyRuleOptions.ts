/**
 * Curated per-faction army-rule option-table allowlist + the ingest extraction helper.
 *
 * Thousand Sons' army rule (*Cabal of Sorcerers*) and World Eaters' army rule (*Blessings
 * of Khorne*) each send the player to a faction-wide table of named effects — Rituals with
 * Warp Charge values, Blessings with dice-roll requirements — to use the rule. BSData models
 * each table as a standalone `selectionEntry` ("Rituals reference" / "Blessings of Khorne
 * Reference") holding only `<profile>` children, with no `Unit` stat profile, so
 * `enumerateUnits` never walks it: the named entries never reach any unit, detachment, or
 * glossary. A scan of all 47 cached 10e catalogues for this shape (an `upgrade` selection
 * entry holding ≥4 profiles of a custom profile type, no Unit profile) found no other
 * matches, so — mirroring `armyRules.ts` — a small curated map names the exact pair to
 * extract rather than a generic heuristic that could misfire on structurally similar but
 * differently-purposed entries (e.g. Chaos Space Marines' "Marks of Chaos", a per-unit
 * wargear choice already handled correctly elsewhere).
 *
 * Applied at BSData ingest (`normalize.ts`, alongside `flagArmyRules`) and re-applied to
 * committed artifacts by the one-time patch CLI (`armyRuleOptionsCli.ts`).
 */

import { norm } from '../roster/normalize'
import { textOf, type Catalogue, type Profile } from '../parsers/bsdata'
import type { ArmyRuleOption, FactionArtifact } from '../schemas'

/** Faction id → the reference `selectionEntry` to read and the glossary entry it attaches to. */
export const ARMY_RULE_OPTION_TABLES: Record<string, { selectionEntry: string; armyRule: string }> = {
  'thousand-sons': { selectionEntry: 'Rituals reference', armyRule: 'Cabal of Sorcerers' },
  'world-eaters': { selectionEntry: 'Blessings of Khorne Reference', armyRule: 'Blessings of Khorne' },
}

/**
 * Read a reference-table profile generically: each carries exactly two characteristics,
 * a themed "requirement" (Warp Charge cost for Rituals, a dice roll for Blessings) and an
 * `Effect`. Whichever isn't named `Effect` becomes `requirement`/`requirementLabel` — this
 * is what lets the same extraction serve both factions' differently-named characteristics
 * without hardcoding either vocabulary. Returns `undefined` for a profile that doesn't
 * match this two-characteristic shape (defensive against an unexpected BSData layout).
 */
function optionFromProfile(profile: Profile): ArmyRuleOption | undefined {
  const characteristics = profile.characteristics?.characteristic ?? []
  const effect = characteristics.find((c) => c.name === 'Effect')
  const requirement = characteristics.find((c) => c.name !== 'Effect')
  if (!effect || !requirement) return undefined
  return {
    name: profile.name,
    requirement: textOf(requirement),
    requirementLabel: requirement.name,
    effect: textOf(effect),
  }
}

/**
 * Extract the curated faction's reference-table options from its own catalogue and attach
 * them as `options` on the matching `armyRule`-flagged glossary entry.
 *
 * Mutates and returns the same artifact (other ingest passes follow this read→patch→
 * rewrite convention). A faction absent from `ARMY_RULE_OPTION_TABLES`, or whose named
 * `selectionEntry` / glossary entry can't be resolved (data-bump rename), is a no-op —
 * callers that need to know whether extraction actually landed should inspect
 * `artifact.glossary` for entries with `options` afterwards (see `armyRuleOptionsCli.ts`).
 */
export function attachArmyRuleOptions(artifact: FactionArtifact, faction: Catalogue): FactionArtifact {
  const table = ARMY_RULE_OPTION_TABLES[artifact.factionId]
  if (!table) return artifact

  // Thousand Sons keeps "Rituals reference" in the catalogue's own `selectionEntries`;
  // World Eaters' "Blessings of Khorne Reference" lives in `sharedSelectionEntries`
  // instead (BSData's place for entries a catalogue defines but doesn't root-enumerate).
  // Check both rather than hardcoding either per faction.
  const candidates = [
    ...(faction.selectionEntries?.selectionEntry ?? []),
    ...(faction.sharedSelectionEntries?.selectionEntry ?? []),
  ]
  const source = candidates.find((entry) => norm(entry.name) === norm(table.selectionEntry))
  if (!source) return artifact

  const options = (source.profiles?.profile ?? [])
    .map(optionFromProfile)
    .filter((option): option is ArmyRuleOption => option != null)
  if (options.length === 0) return artifact

  const target = artifact.glossary.find((entry) => norm(entry.name) === norm(table.armyRule))
  if (target) target.options = options
  return artifact
}
