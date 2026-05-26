import { createHash } from 'node:crypto'
import type {
  DataManifest,
  Detachment,
  FactionArtifact,
  ManifestSharedDetachments,
  SharedDetachmentSet,
} from '../dataModel'
import { DATA_SCHEMA_VERSION } from '../dataModel'
import {
  prepareArtifact,
  prepareSharedSet,
  pruneSharedSets,
  readArtifact,
  readManifest,
  writeArtifact,
  writeManifest,
  writeSharedSet,
  type EmitResult,
} from './emit'

/**
 * Offline shared-detachment de-duplication.
 *
 * After BSData ingest + the Wahapedia merge, the generic "Codex: Space Marines" detachments
 * (Gladius Task Force, …) are carried byte-identically by all 12 Space Marine chapter artifacts —
 * ~35 KB duplicated 11 extra times. This pass factors any such cross-faction-identical detachment
 * into a single shared artifact under `public/data/shared/`, removes it from the per-faction
 * artifacts, and points them at it via `FactionArtifact.sharedDetachments`. The runtime loader
 * merges the shared set back in (`lib/data/loader.ts`).
 *
 * Run-once, AFTER both other ingest passes (it reads their final artifacts, with stratagems
 * already merged), never on the request path:
 *   `npm run ingest:dedup -- [--dry-run]`
 */

type Args = { dryRun: boolean }

function parseArgs(argv: string[]): Args {
  return { dryRun: argv.includes('--dry-run') }
}

/** Stable comparison key for a detachment, ignoring each stratagem's per-faction `source` stamp. */
function detachmentKey(d: Detachment): string {
  return JSON.stringify({
    id: d.id,
    name: d.name,
    rules: d.rules,
    stratagems: d.stratagems.map(s => ({ ...s, source: '' })),
  })
}

type Occurrence = { factionId: string; detachment: Detachment }

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('De-duplicating shared detachments')

  const manifest = await readManifest()
  const artifacts = new Map<string, FactionArtifact>()
  for (const f of manifest.factions) artifacts.set(f.factionId, await readArtifact(f.factionId))

  // Group detachments by id across factions. Synthesized Wahapedia shells (`waha-…`) are always
  // faction-specific, so they are never candidates for sharing.
  const byId = new Map<string, Occurrence[]>()
  for (const [factionId, artifact] of artifacts) {
    for (const detachment of artifact.detachments) {
      if (detachment.id.startsWith('waha-')) continue
      const list = byId.get(detachment.id) ?? []
      list.push({ factionId, detachment })
      byId.set(detachment.id, list)
    }
  }

  // A detachment is shareable when it appears in ≥2 factions AND every copy is identical (modulo
  // the per-faction stratagem `source`). This naturally limits sharing to the SM generic set: the
  // Aeldari library detachments, shared by id across Craftworlds/Drukhari/Ynnari, differ in
  // stratagem coverage (different Wahapedia pages) and so are correctly left inline.
  const totalDetachments = (factionId: string) => artifacts.get(factionId)!.detachments.length
  const shareable = new Map<string, Occurrence>() // detId -> canonical occurrence to store
  const factionsOf = new Map<string, string[]>() // detId -> sorted faction ids carrying it
  for (const [detId, occ] of byId) {
    if (occ.length < 2) continue
    const key = detachmentKey(occ[0].detachment)
    if (!occ.every(o => detachmentKey(o.detachment) === key)) continue
    // Canonical copy = the one from the "base codex" faction, so the stored stratagem `source` is
    // the neutral codex name ("Space Marines") rather than a chapter's. The base codex is the
    // faction whose detachments are entirely the shared set (fewest detachments overall) and whose
    // name is least specialized (e.g. "Imperium - Space Marines" has fewer " - " segments than
    // "Imperium - Adeptus Astartes - Imperial Fists"). Faction id breaks any remaining tie.
    const nameDepth = (factionId: string) => artifacts.get(factionId)!.factionName.split(' - ').length
    const canonical = [...occ].sort(
      (a, b) => totalDetachments(a.factionId) - totalDetachments(b.factionId)
        || nameDepth(a.factionId) - nameDepth(b.factionId)
        || a.factionId.localeCompare(b.factionId),
    )[0]
    shareable.set(detId, canonical)
    factionsOf.set(detId, occ.map(o => o.factionId).sort())
  }

  if (shareable.size === 0) {
    console.log('  nothing to share — no cross-faction-identical detachments found.')
    return
  }

  // Group shareable detachments by the exact set of factions that carry them, so each distinct
  // sharing group becomes one shared artifact.
  const groups = new Map<string, { factionIds: string[]; detIds: string[] }>()
  for (const [detId, factionIds] of factionsOf) {
    const sig = factionIds.join(',')
    const group = groups.get(sig) ?? { factionIds, detIds: [] }
    group.detIds.push(detId)
    groups.set(sig, group)
  }

  const sharedManifest: ManifestSharedDetachments[] = []
  const touched = new Set<string>()

  for (const { factionIds, detIds } of groups.values()) {
    // Stored detachments in name order (deterministic content → stable content hash → stable id).
    const detachments = detIds
      .map(id => shareable.get(id)!.detachment)
      .sort((a, b) => a.name.localeCompare(b.name))
    const id = 'shared-' + createHash('sha256').update(JSON.stringify(detachments)).digest('hex').slice(0, 12)
    const set: SharedDetachmentSet = { schemaVersion: DATA_SCHEMA_VERSION, id, detachments }
    const result = prepareSharedSet(set)
    sharedManifest.push({ id: result.id, artifact: result.artifact, bytes: result.bytes, sha256: result.sha256 })
    if (!args.dryRun) await writeSharedSet(result)

    const remove = new Set(detIds)
    for (const factionId of factionIds) {
      const artifact = artifacts.get(factionId)!
      artifact.detachments = artifact.detachments.filter(d => !remove.has(d.id))
      artifact.sharedDetachments = [...(artifact.sharedDetachments ?? []), id]
      touched.add(factionId)
    }
    console.log(`  ${id}: ${detachments.length} detachment(s) shared by ${factionIds.length} faction(s) (${(result.bytes / 1024).toFixed(1)} KB)`)
  }

  // Re-emit the touched faction artifacts and refresh their manifest entries (bytes + sha256).
  const reEmitted = new Map<string, EmitResult>()
  for (const factionId of touched) {
    const result = prepareArtifact(artifacts.get(factionId)!)
    reEmitted.set(factionId, result)
    if (!args.dryRun) await writeArtifact(result)
  }

  const newManifest: DataManifest = {
    ...manifest,
    factions: manifest.factions.map(f => {
      const r = reEmitted.get(f.factionId)
      return r ? { ...f, bytes: r.bytes, sha256: r.sha256 } : f
    }),
    sharedDetachments: sharedManifest.sort((a, b) => a.id.localeCompare(b.id)),
  }
  if (!args.dryRun) {
    await writeManifest(newManifest)
    // Drop stale content-hash-named shared files from earlier runs.
    await pruneSharedSets(new Set(sharedManifest.map(s => s.id)))
  }

  console.log(
    `\n${sharedManifest.length} shared set(s), ${touched.size} faction(s) rewritten` +
      `${args.dryRun ? ' (dry run — nothing written)' : ' — public/data/ updated'}.`,
  )
}

main().catch(err => {
  console.error('\nDedup failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
