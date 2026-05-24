import {
  fetchRaw,
  getLatestReleaseTag,
  listDataFiles,
  resolveRef,
} from './fetch'
import { parseCatalogue, parseGameSystem, type Catalogue } from '../parsers/bsdata'
import { buildIndex, enumerateUnits } from './resolve'
import { toFactionArtifact } from './normalize'
import { prepareArtifact, writeArtifact, writeManifest, type EmitResult } from './emit'
import { DATA_SCHEMA_VERSION, type DataManifest } from '../dataModel'

type Args = { tag?: string; factions: string[] | 'all'; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { factions: 'all', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--tag') args.tag = argv[++i]
    else if (a === '--factions') {
      const v = argv[++i]
      args.factions = v === 'all' ? 'all' : v.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (a === '--dry-run') args.dryRun = true
  }
  return args
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** "Imperium - Space Marines.cat" -> "space-marines"; "Necrons.cat" -> "necrons". */
function factionSlug(filename: string): string {
  const stem = filename.replace(/\.cat$/, '')
  const last = stem.split(' - ').pop() ?? stem
  return slugify(last)
}

function isFactionFile(filename: string): boolean {
  if (/library/i.test(filename)) return false
  if (filename === 'Unaligned Forces.cat') return false
  return true
}

/** Resolve a catalogueLink targetId to a filename, guessing by name first, then scanning. */
async function makeFileFinder(sha: string, allCatFiles: string[]) {
  const idToFile = new Map<string, string>()
  const scanned = new Set<string>()
  return async function findFileById(targetId: string, name: string): Promise<string | undefined> {
    if (idToFile.has(targetId)) return idToFile.get(targetId)
    const guess = `${name}.cat`
    const ordered = allCatFiles.includes(guess)
      ? [guess, ...allCatFiles.filter((f) => f !== guess)]
      : allCatFiles
    for (const file of ordered) {
      if (scanned.has(file)) continue
      scanned.add(file)
      const cat = parseCatalogue(await fetchRaw(sha, file))
      idToFile.set(cat.id, file)
      if (cat.id === targetId) return file
    }
    return idToFile.get(targetId)
  }
}

type ChainEntry = { catalogue: Catalogue; enumerateRoots: boolean }

/**
 * Load a faction catalogue and every catalogue it links, transitively. `enumerateRoots`
 * marks catalogues whose top-level entries should be offered as fieldable datasheets —
 * the start catalogue plus any reached only through `importRootEntries="true"` links.
 * Catalogues linked for shared rules/profiles only still load (for the index) but their
 * roots are not enumerated.
 */
async function loadChain(
  sha: string,
  startFile: string,
  findFileById: (id: string, name: string) => Promise<string | undefined>,
): Promise<ChainEntry[]> {
  // A catalogue is enumerable if ANY path reaches it through importRootEntries links, so
  // `enumerateRoots` is ORed across paths rather than fixed by whichever link is seen first.
  // Enumerability is monotonic (false→true only), so each catalogue is expanded at most twice.
  const entries = new Map<string, ChainEntry>()
  const queue: { file: string; enumerateRoots: boolean }[] = [{ file: startFile, enumerateRoots: true }]
  while (queue.length) {
    const { file, enumerateRoots } = queue.shift()!
    const cat = parseCatalogue(await fetchRaw(sha, file))
    const existing = entries.get(cat.id)
    if (existing) {
      if (!enumerateRoots || existing.enumerateRoots) continue // no new enumerability to propagate
      existing.enumerateRoots = true // upgrade, then re-expand so children inherit it
    } else {
      entries.set(cat.id, { catalogue: cat, enumerateRoots })
    }
    const enumerable = entries.get(cat.id)!.enumerateRoots
    for (const link of cat.catalogueLinks?.catalogueLink ?? []) {
      const linked = await findFileById(link.targetId, link.name)
      if (linked) {
        queue.push({ file: linked, enumerateRoots: enumerable && link.importRootEntries === 'true' })
      } else {
        console.warn(`  ! unresolved catalogueLink "${link.name}" (${link.targetId})`)
      }
    }
  }
  return [...entries.values()]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const tag = args.tag ?? (await getLatestReleaseTag())
  console.log(`Ingesting BSData wh40k-10e @ ${tag}`)

  const { sha } = await resolveRef(tag)
  console.log(`  resolved ${tag} -> ${sha}`)

  const { gst: gstFile, catalogues } = await listDataFiles(sha)
  const gst = parseGameSystem(await fetchRaw(sha, gstFile))

  const factionFiles = catalogues.filter(isFactionFile).filter((f) => {
    if (args.factions === 'all') return true
    return args.factions.includes(factionSlug(f))
  })

  if (factionFiles.length === 0) {
    console.error('No matching faction catalogues. Available slugs:')
    console.error(catalogues.filter(isFactionFile).map(factionSlug).join(', '))
    process.exit(1)
  }

  const findFileById = await makeFileFinder(sha, catalogues)
  const results: EmitResult[] = []

  for (const file of factionFiles) {
    const slug = factionSlug(file)
    process.stdout.write(`  ${slug} … `)
    const chain = await loadChain(sha, file, findFileById)
    const faction = chain[0].catalogue
    const allCats = chain.map((c) => c.catalogue)
    const index = buildIndex([gst, ...allCats])
    const enumerable = chain.filter((c) => c.enumerateRoots).map((c) => c.catalogue)
    const units = enumerateUnits(enumerable, index)
    const artifact = toFactionArtifact(faction, units, slug)
    const result = prepareArtifact(artifact)
    results.push(result)
    if (!args.dryRun) await writeArtifact(result)
    console.log(`${result.unitCount} units, ${(result.bytes / 1024).toFixed(1)} KB`)
  }

  const manifest: DataManifest = {
    schemaVersion: DATA_SCHEMA_VERSION,
    bsDataTag: tag,
    bsDataCommit: sha,
    buildTime: new Date().toISOString(),
    factions: results
      .map((r) => ({
        factionId: r.factionId,
        factionName: r.factionName,
        artifact: r.artifact,
        bytes: r.bytes,
        sha256: r.sha256,
        unitCount: r.unitCount,
      }))
      .sort((a, b) => a.factionName.localeCompare(b.factionName)),
  }
  if (!args.dryRun) await writeManifest(manifest)

  const totalKb = results.reduce((n, r) => n + r.bytes, 0) / 1024
  console.log(`\n${results.length} faction(s), ${totalKb.toFixed(1)} KB total${args.dryRun ? ' (dry run — nothing written)' : ' written to public/data/'}`)
}

main().catch((err) => {
  console.error('\nIngest failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
