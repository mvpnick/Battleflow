import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  DataManifest,
  FactionArtifact,
  ManifestFaction,
  ManifestSharedDetachments,
  SharedDetachmentSet,
} from '../dataModel'
import { DataManifestSchema, FactionArtifactSchema } from './normalize'

const DATA_DIR = join(process.cwd(), 'public', 'data')
const FACTIONS_DIR = join(DATA_DIR, 'factions')
const SHARED_DIR = join(DATA_DIR, 'shared')
const MANIFEST_PATH = join(DATA_DIR, 'manifest.json')

export type EmitResult = ManifestFaction & { json: string }

/** Serialize a faction artifact (minified) and compute its size + content hash. */
export function prepareArtifact(artifact: FactionArtifact): EmitResult {
  const json = JSON.stringify(artifact)
  const bytes = Buffer.byteLength(json, 'utf8')
  const sha256 = createHash('sha256').update(json).digest('hex')
  return {
    factionId: artifact.factionId,
    factionName: artifact.factionName,
    factionKeywords: artifact.factionKeywords.map(kw => kw.replace(/^Faction:\s*/i, '')),
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

export type SharedEmitResult = ManifestSharedDetachments & { json: string }

/** Serialize a shared detachment set (minified) and compute its size + content hash. */
export function prepareSharedSet(set: SharedDetachmentSet): SharedEmitResult {
  const json = JSON.stringify(set)
  return {
    id: set.id,
    artifact: `/data/shared/${set.id}.json`,
    bytes: Buffer.byteLength(json, 'utf8'),
    sha256: createHash('sha256').update(json).digest('hex'),
    json,
  }
}

export async function writeSharedSet(result: SharedEmitResult): Promise<void> {
  await mkdir(SHARED_DIR, { recursive: true })
  await writeFile(join(SHARED_DIR, `${result.id}.json`), result.json, 'utf8')
}

/**
 * Remove shared-set files whose id is not in `keepIds`. Shared artifacts are content-hash named,
 * so re-running the dedup pass after a data bump produces new filenames; this prunes the stale
 * ones left behind.
 */
export async function pruneSharedSets(keepIds: Set<string>): Promise<void> {
  let files: string[]
  try {
    files = await readdir(SHARED_DIR)
  } catch {
    return // shared dir doesn't exist yet — nothing to prune
  }
  for (const file of files) {
    if (file.endsWith('.json') && !keepIds.has(file.replace(/\.json$/, ''))) {
      await rm(join(SHARED_DIR, file))
    }
  }
}

/** Read a previously-emitted faction artifact from disk (for incremental patch passes). */
export async function readArtifact(factionId: string): Promise<FactionArtifact> {
  const raw = await readFile(join(FACTIONS_DIR, `${factionId}.json`), 'utf8')
  return FactionArtifactSchema.parse(JSON.parse(raw)) as FactionArtifact
}

/** Read the current data manifest from disk. */
export async function readManifest(): Promise<DataManifest> {
  const raw = await readFile(MANIFEST_PATH, 'utf8')
  return DataManifestSchema.parse(JSON.parse(raw)) as DataManifest
}

export async function writeManifest(manifest: DataManifest): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}
