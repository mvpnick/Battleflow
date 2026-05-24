import type { DataManifest, FactionArtifact, ManifestFaction } from '../dataModel'
import { DataManifestSchema, FactionArtifactSchema } from '../ingest/normalize'

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

export async function loadFaction(faction: ManifestFaction): Promise<FactionArtifact> {
  // The `?v=<sha256>` query lets the artifact be cached immutably: a data bump
  // changes the hash, hence the URL, so clients always fetch the right version.
  const res = await fetch(`${faction.artifact}?v=${faction.sha256}`)
  if (!res.ok) {
    throw new Error(`Failed to load ${faction.factionName} (HTTP ${res.status}).`)
  }
  return FactionArtifactSchema.parse(await res.json()) as FactionArtifact
}
