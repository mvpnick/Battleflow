/**
 * Public TypeScript contract for the Battleflow data layer.
 *
 * Types are derived from Zod schemas in `lib/schemas.ts` (single source of truth).
 * This file re-exports them so existing consumers — the ingest pipeline, the runtime
 * adapter, and the loader — keep their import paths unchanged.
 *
 * Also re-exports `DATA_SCHEMA_VERSION` so ingest CLI files do not need to change
 * their `import { DATA_SCHEMA_VERSION } from '../dataModel'` lines.
 */

export { DATA_SCHEMA_VERSION } from './schemas'

export type {
  GlossaryRule,
  /**
   * Alias of {@link GlossaryRule}. Detachment-specific rules use the same shape;
   * the name keeps `ingest/detachments.ts` readable.
   */
  DetachmentRule,
  PreparedUnit,
  Detachment,
  FactionArtifact,
  SharedDetachmentSet,
  ManifestFaction,
  ManifestSharedDetachments,
  DataManifest,
} from './schemas'
