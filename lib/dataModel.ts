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
  /**
   * Ids of {@link SharedDetachmentSet}s whose detachments belong to this faction but are stored
   * once and shared (the generic "Codex: Space Marines" detachments carried identically by all 12
   * chapters). The runtime loader merges them into `detachments`. Absent when nothing is shared.
   */
  sharedDetachments?: string[]
  units: PreparedUnit[]
  glossary: GlossaryRule[]
}

/**
 * A set of detachments factored out of multiple faction artifacts because they are byte-identical
 * across them (e.g. the generic Codex detachments shared by every Space Marine chapter). Stored
 * once and referenced by `FactionArtifact.sharedDetachments`.
 */
export type SharedDetachmentSet = {
  schemaVersion: typeof DATA_SCHEMA_VERSION
  id: string
  detachments: Detachment[]
}

export type ManifestFaction = {
  factionId: string
  factionName: string
  /** Faction keyword strings with the "Faction: " prefix stripped, e.g. ["Death Guard"]. */
  factionKeywords: string[]
  artifact: string
  bytes: number
  sha256: string
  unitCount: number
}

/** A shared detachment set's manifest entry — its URL + content hash for immutable caching. */
export type ManifestSharedDetachments = {
  id: string
  artifact: string
  bytes: number
  sha256: string
}

export type DataManifest = {
  schemaVersion: typeof DATA_SCHEMA_VERSION
  bsDataTag: string
  bsDataCommit: string
  buildTime: string
  factions: ManifestFaction[]
  /** Shared detachment sets referenced by `FactionArtifact.sharedDetachments`. */
  sharedDetachments?: ManifestSharedDetachments[]
}
