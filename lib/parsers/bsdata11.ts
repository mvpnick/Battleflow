import type { BsRoot, Catalogue, GameSystem } from './bsdata'

/**
 * Thin typed wrapper over `wh40k-11e` (BattleScribe) JSON catalogues/game-systems.
 * Parse only — no cross-reference resolution or normalization here.
 *
 * Same conceptual BattleScribe schema as the XML `bsdata.ts` parser, just serialized
 * differently: bare arrays (`"selectionEntries": [...]`) instead of XML's plural-wrapper
 * shape (`"selectionEntries": { "selectionEntry": [...] }`), native booleans/numbers instead
 * of XML's string attributes, and `$text` instead of `#text` for element text content.
 * `reshape()` below normalizes both differences so the rest of the pipeline
 * (`lib/ingest/resolve.ts`, `lib/ingest/detachments.ts`, `lib/ingest/normalize.ts`) can consume
 * the output through the exact same `Catalogue`/`GameSystem` interfaces `bsdata.ts` exports,
 * with zero changes.
 */

/** Plural JSON container key -> the singular tag name `bsdata.ts`'s interfaces wrap it as. */
const CONTAINER_TO_TAG: Record<string, string> = {
  catalogueLinks: 'catalogueLink',
  categoryEntries: 'categoryEntry',
  categoryLinks: 'categoryLink',
  characteristicTypes: 'characteristicType',
  characteristics: 'characteristic',
  conditionGroups: 'conditionGroup',
  conditions: 'condition',
  constraints: 'constraint',
  costTypes: 'costType',
  costs: 'cost',
  entryLinks: 'entryLink',
  forceEntries: 'forceEntry',
  infoGroups: 'infoGroup',
  infoLinks: 'infoLink',
  modifiers: 'modifier',
  profileTypes: 'profileType',
  profiles: 'profile',
  publications: 'publication',
  repeats: 'repeat',
  rules: 'rule',
  selectionEntries: 'selectionEntry',
  selectionEntryGroups: 'selectionEntryGroup',
  sharedInfoGroups: 'infoGroup',
  sharedProfiles: 'profile',
  sharedRules: 'rule',
  sharedSelectionEntries: 'selectionEntry',
  sharedSelectionEntryGroups: 'selectionEntryGroup',
}

/**
 * Keys whose JSON value is a native number but which `bsdata.ts`'s interfaces type as
 * `string` (matching XML attribute semantics, e.g. `Cost.value`, `Catalogue.revision`).
 * Booleans are coerced unconditionally (see `reshapeValue`) since no interface field expects
 * a real JS boolean; numbers are coerced only for this known set so structural count fields
 * BSData doesn't model (`min`, `max`, `sortIndex`, ...) pass through untouched.
 */
const STRING_NUMBER_KEYS = new Set(['value', 'revision', 'gameSystemRevision'])

function reshapeValue(key: string, value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number' && STRING_NUMBER_KEYS.has(key)) return String(value)
  if (Array.isArray(value)) return value.map((v) => reshapeValue(key, v))
  if (value && typeof value === 'object') return reshapeObject(value as Record<string, unknown>)
  return value
}

function reshapeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$text') {
      out['#text'] = reshapeValue(key, value)
      continue
    }
    if (Array.isArray(value) && CONTAINER_TO_TAG[key]) {
      out[key] = { [CONTAINER_TO_TAG[key]]: value.map((v) => reshapeValue(key, v)) }
      continue
    }
    out[key] = reshapeValue(key, value)
  }
  return out
}

export function parseBsJson(json: unknown): BsRoot {
  return reshapeObject(json as Record<string, unknown>) as BsRoot
}

export function parseCatalogue11(json: unknown): Catalogue {
  const root = parseBsJson(json)
  if (!root.catalogue) throw new Error('Expected a "catalogue" root key.')
  return root.catalogue
}

export function parseGameSystem11(json: unknown): GameSystem {
  const root = parseBsJson(json)
  if (!root.gameSystem) throw new Error('Expected a "gameSystem" root key.')
  return root.gameSystem
}
