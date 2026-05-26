import type { DataManifest, Detachment, FactionArtifact, ManifestFaction } from '../dataModel'
import { DataManifestSchema, FactionArtifactSchema, SharedDetachmentSetSchema } from '../ingest/normalize'

/**
 * Runtime data access. This is the single seam between the app and where prepared
 * data lives. Today that's static files under `public/data/` served by the CDN;
 * swapping to Vercel Blob later means changing only the URLs built here.
 */

export async function loadManifest(): Promise<DataManifest> {
  const res = await fetch('/data/manifest.json')
  if (!res.ok) throw new Error(`Failed to load data manifest (HTTP ${res.status}).`)
  return DataManifestSchema.parse(await res.json()) as DataManifest
}

/** Fetch one shared detachment set by its manifest entry (immutably cached via its hash). */
async function loadSharedDetachments(id: string, manifest: DataManifest): Promise<Detachment[]> {
  const entry = manifest.sharedDetachments?.find(s => s.id === id)
  if (!entry) throw new Error(`Manifest is missing shared detachment set "${id}".`)
  const res = await fetch(`${entry.artifact}?v=${entry.sha256}`)
  if (!res.ok) throw new Error(`Failed to load shared detachments "${id}" (HTTP ${res.status}).`)
  return SharedDetachmentSetSchema.parse(await res.json()).detachments as Detachment[]
}

export async function loadFaction(
  faction: ManifestFaction,
  manifest: DataManifest,
): Promise<FactionArtifact> {
  // The `?v=<sha256>` query lets the artifact be cached immutably: a data bump
  // changes the hash, hence the URL, so clients always fetch the right version.
  const res = await fetch(`${faction.artifact}?v=${faction.sha256}`)
  if (!res.ok) {
    throw new Error(`Failed to load ${faction.factionName} (HTTP ${res.status}).`)
  }
  const artifact = FactionArtifactSchema.parse(await res.json()) as FactionArtifact

  // Merge in any shared detachment sets (e.g. the generic Codex: Space Marines detachments,
  // stored once and referenced by all 12 chapters) so callers see a complete detachment list.
  if (artifact.sharedDetachments?.length) {
    const shared = await Promise.all(
      artifact.sharedDetachments.map(id => loadSharedDetachments(id, manifest)),
    )
    artifact.detachments = [...shared.flat(), ...artifact.detachments]
  }
  return artifact
}
