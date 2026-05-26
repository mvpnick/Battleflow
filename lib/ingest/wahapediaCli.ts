import type { DataManifest, Detachment, FactionArtifact } from '../dataModel'
import {
  prepareArtifact,
  readArtifact,
  readManifest,
  writeArtifact,
  writeManifest,
  type EmitResult,
} from './emit'
import { fetchFactionPage, parseStratagems, type DetachmentStratagems } from './wahapedia'
import { WAHAPEDIA_SLUGS } from './wahapediaFactions'

/**
 * Offline Wahapedia stratagem ingestion.
 *
 * Patches the stratagem-shaped gap left by BSData (which has no machine-readable stratagem
 * profiles): scrapes faction stratagems from wahapedia.ru and merges them into the existing
 * `public/data/factions/<id>.json` artifacts' `detachments[].stratagems`, then rewrites each
 * touched artifact and updates its `manifest.json` entry (bytes + sha256). Run-once, never on
 * the request path. Kept separate from the BSData CLI so the two data sources update
 * independently and refreshing stratagems needs no GitHub token.
 *
 * Usage: `npm run ingest:wahapedia -- [--factions <slug,slug|all>] [--dry-run]`
 */

type Args = { factions: string[] | 'all'; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { factions: 'all', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--factions') {
      const v = argv[++i]
      args.factions = v === 'all' ? 'all' : v.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (a === '--dry-run') args.dryRun = true
  }
  return args
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Loose name key for matching scraped groups to existing detachments (case/punctuation-insensitive). */
function nameKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Drop a trailing parenthetical qualifier, e.g. "Alien Hunters (Ordo Xenos)" -> "Alien Hunters". */
function stripQualifier(s: string): string {
  return s.replace(/\([^)]*\)/g, '').trim()
}

/**
 * Scraped group names that are not detachments and must never become one. Wahapedia mixes a
 * "Core" block (Rapid Ingress, Fire Overwatch, …) into the cards on some pages; those universal
 * stratagems are maintained separately in `coreStratagems.ts`.
 */
const SKIP_GROUPS = new Set(['core'])

type MergeStats = { matched: number; synthesized: number; stratagems: number }

/**
 * Merge scraped stratagem groups into an artifact's detachments, in place.
 *
 * - A group whose name matches an existing detachment fills that detachment's `stratagems`.
 *   Matching ignores case/punctuation and a trailing parenthetical qualifier, so Wahapedia's
 *   "Alien Hunters" fills BSData's "Alien Hunters (Ordo Xenos)".
 * - A group with no match is appended as a synthesized shell detachment (empty `rules`), but ONLY
 *   when `allowSynthesis` is set. Synthesis captures detachments newer than the pinned BSData
 *   release (e.g. Sororitas' "Pious Protectors"). It is DISABLED for the shared Space Marines page
 *   (served to all 12 chapters): that page lists every chapter's stratagem cards, so an unmatched
 *   group is another chapter's detachment — already modelled in the pinned BSData release and
 *   correctly scoped out of THIS chapter — not a genuinely-new one. Synthesizing it would re-leak
 *   the cross-chapter detachments that ingest deliberately scoped away.
 */
function mergeStratagems(
  artifact: FactionArtifact,
  groups: DetachmentStratagems[],
  allowSynthesis: boolean,
): MergeStats {
  const byName = new Map<string, Detachment>()
  for (const d of artifact.detachments) {
    byName.set(nameKey(d.name), d)
    // Index the qualifier-stripped form too, but never shadow an exact name.
    const bare = nameKey(stripQualifier(d.name))
    if (!byName.has(bare)) byName.set(bare, d)
  }

  const stats: MergeStats = { matched: 0, synthesized: 0, stratagems: 0 }
  for (const group of groups) {
    if (SKIP_GROUPS.has(nameKey(group.name))) continue
    stats.stratagems += group.stratagems.length

    const existing = byName.get(nameKey(group.name)) ?? byName.get(nameKey(stripQualifier(group.name)))
    if (existing) {
      existing.stratagems = group.stratagems
      stats.matched++
    } else if (allowSynthesis) {
      const shell: Detachment = {
        id: `waha-${slugify(group.name)}`,
        name: group.name,
        rules: [],
        stratagems: group.stratagems,
      }
      artifact.detachments.push(shell)
      byName.set(nameKey(group.name), shell)
      stats.synthesized++
    }
  }
  return stats
}

/** "Imperium - Adepta Sororitas" -> "Adepta Sororitas"; "Necrons" -> "Necrons". */
function sourceName(factionName: string): string {
  return factionName.split(' - ').pop() ?? factionName
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('Ingesting Wahapedia stratagems')

  const manifest = await readManifest()
  const selected = args.factions === 'all' ? Object.keys(WAHAPEDIA_SLUGS) : args.factions

  // Slugs served to more than one faction (only `space-marines`, shared by all 12 chapters).
  // On such a page, shell synthesis is suppressed so one chapter's page does not re-introduce
  // another chapter's detachments. Computed from the full map, independent of the --factions subset.
  const slugFactionCount = new Map<string, number>()
  for (const slug of Object.values(WAHAPEDIA_SLUGS)) {
    if (slug) slugFactionCount.set(slug, (slugFactionCount.get(slug) ?? 0) + 1)
  }

  // Cache pages by slug so the shared Space Marines page is fetched once, not once per chapter.
  const pageCache = new Map<string, string>()
  const getPage = async (slug: string): Promise<string> => {
    let html = pageCache.get(slug)
    if (html === undefined) {
      html = await fetchFactionPage(slug)
      pageCache.set(slug, html)
    }
    return html
  }

  const updated = new Map<string, EmitResult>()

  for (const id of selected) {
    const slug = WAHAPEDIA_SLUGS[id]
    if (slug === undefined) {
      console.warn(`  ? ${id} — not in WAHAPEDIA_SLUGS, skipping`)
      continue
    }
    if (slug === null) {
      console.log(`  ${id} … skipped (no Wahapedia equivalent)`)
      continue
    }

    process.stdout.write(`  ${id} (${slug}) … `)
    let artifact: FactionArtifact
    try {
      artifact = await readArtifact(id)
    } catch {
      console.log('no artifact on disk — run `npm run ingest` first; skipping')
      continue
    }

    const groups = parseStratagems(await getPage(slug), sourceName(artifact.factionName))
    const allowSynthesis = (slugFactionCount.get(slug) ?? 0) <= 1
    const stats = mergeStratagems(artifact, groups, allowSynthesis)

    const result = prepareArtifact(artifact)
    updated.set(id, result)
    if (!args.dryRun) await writeArtifact(result)

    const newDets = stats.synthesized > 0 ? `, ${stats.synthesized} new detachment(s)` : ''
    console.log(`${stats.stratagems} stratagems → ${stats.matched} matched detachment(s)${newDets}`)
  }

  if (updated.size > 0 && !args.dryRun) {
    const newManifest: DataManifest = {
      ...manifest,
      factions: manifest.factions.map((f) => {
        const r = updated.get(f.factionId)
        if (!r) return f
        // Only bytes + sha256 actually change; the rest is recomputed identically.
        return {
          factionId: r.factionId,
          factionName: r.factionName,
          factionKeywords: r.factionKeywords,
          artifact: r.artifact,
          bytes: r.bytes,
          sha256: r.sha256,
          unitCount: r.unitCount,
        }
      }),
    }
    await writeManifest(newManifest)
  }

  console.log(
    `\n${updated.size} faction(s) updated${args.dryRun ? ' (dry run — nothing written)' : ' — public/data/ rewritten'}.`,
  )
}

main().catch((err) => {
  console.error('\nWahapedia ingest failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
