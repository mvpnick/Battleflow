/**
 * Zod runtime schemas for all shared data shapes in Battleflow.
 *
 * **Single source of truth**: every Zod schema lives here; TypeScript types are
 * derived from schemas via `z.infer<>` rather than being maintained separately.
 * Keeping the schemas in one file (rather than inside `lib/ingest/`) lets the
 * runtime loader (`lib/data/loader.ts`) import validation logic without pulling
 * in any BSData / ingest dependencies.
 *
 * Import hierarchy (all arrows = "imports from"):
 *
 *   lib/schemas.ts  ←  lib/data/loader.ts      (runtime: validates fetched JSON)
 *   lib/schemas.ts  ←  lib/ingest/normalize.ts  (re-exports schemas for the pipeline)
 *   lib/schemas.ts  ←  lib/dataModel.ts         (re-exports derived types for consumers)
 *   lib/schemas.ts  ←  lib/types.ts             (re-exports leaf types for UI consumers)
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

/** Version stamp embedded in every artifact. Increment when the shape changes. */
export const DATA_SCHEMA_VERSION = 1 as const

// ---------------------------------------------------------------------------
// Phase IDs
// ---------------------------------------------------------------------------

/** All six 10th-edition turn phases, in order. */
export const PHASE_IDS = [
  'command', 'movement', 'shooting', 'charge', 'fight', 'battleshock',
] as const

// ---------------------------------------------------------------------------
// Leaf schemas (no cross-references between schemas)
// ---------------------------------------------------------------------------

/**
 * A free-form stat record mapping characteristic names to display strings.
 * Example: `{ M: '6"', T: '4', SV: '3+', W: '2', LD: '6+', OC: '2' }`.
 */
export const StatsSchema = z.record(z.string(), z.string())

/** A weapon modifier such as a conditional bonus or penalty. */
export const ModifierSchema = z.object({
  label: z.string(),
  /** The condition under which the modifier applies, if any. */
  cond: z.string().optional(),
})

/** A ranged or melee weapon profile as shown on a datasheet. */
export const WeaponSchema = z.object({
  name: z.string(),
  kind: z.enum(['melee', 'ranged']),
  stats: StatsSchema,
  /** Keyword tags from the "Keywords" characteristic (e.g. "Rapid Fire 1"). */
  tags: z.array(z.string()),
  mods: z.array(ModifierSchema),
})

/**
 * A rule or ability entry — covers datasheet abilities, detachment rules,
 * stratagems, and glossary entries.
 */
export const RuleSchema = z.object({
  name: z.string(),
  /**
   * Free prose describing when the rule activates.
   * For stratagems this is Wahapedia timing text (e.g. "Your Shooting phase…").
   * For BSData abilities this is empty — they have no structured timing field.
   */
  timing: z.string(),
  /** Optional use condition (e.g. "ADEPTUS ASTARTES unit only"). */
  cond: z.string().optional(),
  effect: z.string(),
  /** Faction or detachment name the rule comes from; used in the glossary for de-dup. */
  source: z.string(),
})

/** A stratagem — a {@link RuleSchema} extended with CP cost and usage restrictions. */
export const StratSchema = RuleSchema.extend({
  /** Command point cost. */
  cp: z.number(),
  /**
   * Usage restriction: `'battle'` = once per battle, `'phase'` = once per phase/turn,
   * `false` (or absent) = unlimited.
   */
  once: z.union([z.enum(['battle', 'phase']), z.literal(false)]).optional(),
  /**
   * Short one-sentence mechanical summary generated at ingest for the collapsed card
   * view. Absent until `ingest:summarise` has been run.
   */
  summary: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Compound schemas
// ---------------------------------------------------------------------------

/**
 * A shared ability/rule deduped into the faction-level glossary.
 * The `id` is a BSData UUID — the stable lookup key.
 */
export const GlossaryRuleSchema = RuleSchema.extend({
  id: z.string(),
  /**
   * `true` when this entry is one of the faction's army rule(s) (e.g. Oath of Moment,
   * Reanimation Protocols, Synapse). BSData has no structured flag for this, so it is
   * applied at ingest from a curated per-faction allowlist (`lib/ingest/armyRules.ts`).
   * The entry stays in `glossary` for existing unit cross-refs — this only tags it.
   */
  armyRule: z.boolean().optional(),
})

/**
 * A unit prepared for the app. Superset of the UI `Unit` type.
 * `phases` is intentionally left unpopulated — phase inference is deferred;
 * this field is the reserved slot it will write into.
 */
export const PreparedUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Derived from keywords: the highest-priority role keyword (Infantry, Character, …). */
  role: z.string(),
  /** Number of models in the base unit (currently always 1; squad expansion is deferred). */
  models: z.number(),
  /** All keyword strings from BSData categoryLinks (e.g. "Infantry", "Faction: Aeldari"). */
  tags: z.array(z.string()),
  hot: z.array(z.string()),
  weapons: z.array(WeaponSchema),
  abilities: z.array(RuleSchema),
  stratagems: z.array(StratSchema),
  reminders: z.array(z.object({ text: z.string() })),
  /** BSData UUID — stable cross-reference key, also used as the unit's unique `id`. */
  bsId: z.string(),
  /** Unit statline (M, T, SV, W, LD, OC). Absent if the datasheet carries none. */
  stats: StatsSchema.optional(),
  /** Points cost for the base unit, if present in the BSData release. */
  points: z.number().optional(),
  /** `"Faction: X"` keyword strings belonging to this unit. */
  keywords: z.array(z.string()),
  /** BSData UUID references into the faction-level glossary. */
  ruleRefs: z.array(z.string()),
  /** Phases this unit is relevant in (deferred — see AGENTS.md). */
  phases: z.array(z.enum(PHASE_IDS)).optional(),
})

/** One faction detachment with its rules and stratagems. */
export const DetachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  /**
   * Detachment-specific rules and abilities. Stored in the same shape as glossary
   * rules — `DetachmentRule` is an alias of `GlossaryRule`.
   */
  rules: z.array(GlossaryRuleSchema),
  stratagems: z.array(StratSchema),
  /**
   * Character enhancements available in this detachment, merged in from Wahapedia
   * (BSData does not model enhancement rules as machine-readable profiles). Optional
   * because older artifacts pre-date this field and detachments synthesized from
   * pages we haven't scraped have no enhancement data.
   */
  enhancements: z.array(RuleSchema).optional(),
})

// ---------------------------------------------------------------------------
// Artifact schemas
// ---------------------------------------------------------------------------

/** One faction's fully-resolved, self-contained data artifact. */
export const FactionArtifactSchema = z.object({
  schemaVersion: z.literal(DATA_SCHEMA_VERSION),
  factionId: z.string(),
  factionName: z.string(),
  bsCatalogueId: z.string(),
  /**
   * The `"Faction: X"` keywords that belong to this faction, derived at ingest to
   * filter out units from ally catalogues imported only for roster-building.
   */
  factionKeywords: z.array(z.string()),
  /** Inline detachments (faction-specific or Aeldari-library). */
  detachments: z.array(DetachmentSchema),
  /**
   * Ids of {@link SharedDetachmentSetSchema}s whose detachments belong here but are
   * stored once and shared across multiple factions (e.g. the generic Codex: Space
   * Marines detachments carried identically by all 12 chapters). The runtime loader
   * merges them into `detachments`. Absent when nothing is shared.
   */
  sharedDetachments: z.array(z.string()).optional(),
  units: z.array(PreparedUnitSchema),
  glossary: z.array(GlossaryRuleSchema),
})

/**
 * A set of detachments factored out of multiple faction artifacts because they are
 * byte-identical across them. Stored once and referenced by `FactionArtifact.sharedDetachments`.
 */
export const SharedDetachmentSetSchema = z.object({
  schemaVersion: z.literal(DATA_SCHEMA_VERSION),
  id: z.string(),
  detachments: z.array(DetachmentSchema),
})

// ---------------------------------------------------------------------------
// Manifest schemas
// ---------------------------------------------------------------------------

/** A single faction's entry in the data manifest. */
export const ManifestFactionSchema = z.object({
  factionId: z.string(),
  factionName: z.string(),
  /** Faction keyword strings with the `"Faction: "` prefix stripped. */
  factionKeywords: z.array(z.string()),
  /** CDN-relative URL to the faction artifact JSON (e.g. `/data/factions/necrons.json`). */
  artifact: z.string(),
  bytes: z.number(),
  sha256: z.string(),
  unitCount: z.number(),
})

/** A shared detachment set's manifest entry — its URL and content hash for immutable caching. */
export const ManifestSharedDetachmentsSchema = z.object({
  id: z.string(),
  artifact: z.string(),
  bytes: z.number(),
  sha256: z.string(),
})

/** The top-level manifest index (`public/data/manifest.json`). */
export const DataManifestSchema = z.object({
  schemaVersion: z.literal(DATA_SCHEMA_VERSION),
  bsDataTag: z.string(),
  bsDataCommit: z.string(),
  buildTime: z.string(),
  factions: z.array(ManifestFactionSchema),
  /** Shared detachment sets referenced by faction artifacts. */
  sharedDetachments: z.array(ManifestSharedDetachmentsSchema).optional(),
})

// ---------------------------------------------------------------------------
// Derived TypeScript types
// Each type below is the single source of truth — derived from its schema.
// ---------------------------------------------------------------------------

export type Stats = z.infer<typeof StatsSchema>
export type Modifier = z.infer<typeof ModifierSchema>
export type Weapon = z.infer<typeof WeaponSchema>
export type Rule = z.infer<typeof RuleSchema>
export type Strat = z.infer<typeof StratSchema>
export type GlossaryRule = z.infer<typeof GlossaryRuleSchema>

/**
 * Alias of {@link GlossaryRule}. Detachment-specific rules are stored in the same
 * shape as glossary rules; the dedicated name keeps `detachments.ts` readable.
 */
export type DetachmentRule = GlossaryRule

export type PreparedUnit = z.infer<typeof PreparedUnitSchema>
export type Detachment = z.infer<typeof DetachmentSchema>
export type FactionArtifact = z.infer<typeof FactionArtifactSchema>
export type SharedDetachmentSet = z.infer<typeof SharedDetachmentSetSchema>
export type ManifestFaction = z.infer<typeof ManifestFactionSchema>
export type ManifestSharedDetachments = z.infer<typeof ManifestSharedDetachmentsSchema>
export type DataManifest = z.infer<typeof DataManifestSchema>
