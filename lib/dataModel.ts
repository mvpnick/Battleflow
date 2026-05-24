import type { PhaseId, Rule, Stats, Strat, Unit } from './types'

export const DATA_SCHEMA_VERSION = 1 as const

/** A shared rule/ability, deduped into a per-faction glossary. id = BSData UUID. */
export type GlossaryRule = Rule & { id: string }

/**
 * A unit prepared for the app. Superset of the UI `Unit`.
 * `phases` is intentionally left unpopulated for now — phase inference is a
 * later round; this is the slot it will write into.
 */
export type PreparedUnit = Omit<Unit, 'id'> & {
  id: string
  bsId: string
  /** Unit statline (M, T, SV, W, LD, OC). Absent if the datasheet has none. */
  stats?: Stats
  /** Points cost for the base unit, if present. */
  points?: number
  keywords: string[]
  ruleRefs: string[]
  phases?: PhaseId[]
}

export type DetachmentRule = Rule & { id: string }

export type Detachment = {
  id: string
  name: string
  rules: DetachmentRule[]
  stratagems: Strat[]
}

/** One faction's fully-resolved, self-contained data artifact. */
export type FactionArtifact = {
  schemaVersion: typeof DATA_SCHEMA_VERSION
  factionId: string
  factionName: string
  bsCatalogueId: string
  /**
   * The set of `"Faction: X"` keywords that belong to this faction.
   * Derived at ingest to filter out units from ally catalogues imported only for
   * roster-building (e.g. Chaos Daemons library inside a CSM chain).
   */
  factionKeywords: string[]
  detachments: Detachment[]
  units: PreparedUnit[]
  glossary: GlossaryRule[]
}

export type ManifestFaction = {
  factionId: string
  factionName: string
  artifact: string
  bytes: number
  sha256: string
  unitCount: number
}

export type DataManifest = {
  schemaVersion: typeof DATA_SCHEMA_VERSION
  bsDataTag: string
  bsDataCommit: string
  buildTime: string
  factions: ManifestFaction[]
}
