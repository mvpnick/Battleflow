import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DataManifest, FactionArtifact, ManifestFaction } from '../dataModel'

const FACTIONS_DIR = join(process.cwd(), 'public', 'data', 'factions')
const MANIFEST_PATH = join(process.cwd(), 'public', 'data', 'manifest.json')

export type EmitResult = ManifestFaction & { json: string }

/** Serialize a faction artifact (minified) and compute its size + content hash. */
export function prepareArtifact(artifact: FactionArtifact): EmitResult {
  const json = JSON.stringify(artifact)
  const bytes = Buffer.byteLength(json, 'utf8')
  const sha256 = createHash('sha256').update(json).digest('hex')
  return {
    factionId: artifact.factionId,
    factionName: artifact.factionName,
    artifact: `/data/factions/${artifact.factionId}.json`,
    bytes,
    sha256,
    unitCount: artifact.units.length,
    json,
  }
}

export async function writeArtifact(result: EmitResult): Promise<void> {
  await mkdir(FACTIONS_DIR, { recursive: true })
  await writeFile(join(FACTIONS_DIR, `${result.factionId}.json`), result.json, 'utf8')
}

export async function writeManifest(manifest: DataManifest): Promise<void> {
  await mkdir(join(process.cwd(), 'public', 'data'), { recursive: true })
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}
