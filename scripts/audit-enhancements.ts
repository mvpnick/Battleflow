/**
 * One-shot audit: find detachments that ended up with stratagems but no enhancements
 * after `ingest:wahapedia`, then refetch the source page to distinguish:
 *
 *   - "legitimate empty" — the live Wahapedia page has no enhancement group whose name
 *     matches the detachment (e.g. truly alt-mode listings, or pages that don't list
 *     enhancements at all); nothing to do.
 *   - "real miss" — the page DOES expose an enhancement group matching the detachment,
 *     but our parser/matcher dropped it. These are actionable; they need a parser
 *     selector tweak or a matching adjustment in `wahapediaCli.ts::mergeStratagems`.
 *
 * Run with: `tsx scripts/audit-enhancements.ts`
 *
 * Read-only — does not modify artifacts. Use Step 5 of `docs/plan-enhancement-coverage.md`
 * to patch any real misses surfaced here.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FactionArtifact } from '../lib/dataModel'
import { fetchFactionPage, parseEnhancements } from '../lib/ingest/wahapedia'
import { nameKey, stripQualifier } from '../lib/ingest/wahapediaCli'
import { WAHAPEDIA_SLUGS } from '../lib/ingest/wahapediaFactions'

const FACTIONS_DIR = join(process.cwd(), 'public', 'data', 'factions')

type Suspect = { faction: string; detachment: string; stratagems: number }

async function readArtifact(factionId: string): Promise<FactionArtifact> {
  const raw = await readFile(join(FACTIONS_DIR, `${factionId}.json`), 'utf8')
  return JSON.parse(raw) as FactionArtifact
}

/** Find detachments with stratagems but zero enhancements, grouped by faction. */
async function collectSuspects(): Promise<Suspect[]> {
  const out: Suspect[] = []
  for (const factionId of Object.keys(WAHAPEDIA_SLUGS)) {
    const slug = WAHAPEDIA_SLUGS[factionId]
    if (slug === null) continue // skipped factions: no Wahapedia page
    let artifact: FactionArtifact
    try {
      artifact = await readArtifact(factionId)
    } catch {
      continue
    }
    for (const det of artifact.detachments) {
      const stratCount = det.stratagems.length
      const enhCount = det.enhancements?.length ?? 0
      if (stratCount > 0 && enhCount === 0) {
        out.push({ faction: factionId, detachment: det.name, stratagems: stratCount })
      }
    }
  }
  return out
}

async function main() {
  const suspects = await collectSuspects()
  if (suspects.length === 0) {
    console.log('No detachments with stratagems but missing enhancements. ✅')
    return
  }

  console.log(`Found ${suspects.length} suspect detachment(s); refetching pages to classify…\n`)

  // Cache pages by slug — Space Marines chapters share one page.
  const pageCache = new Map<string, string>()
  // Cache parsed enhancement names by slug to avoid re-parsing.
  const groupKeyCache = new Map<string, Set<string>>()

  let realMisses = 0
  let legitimateEmpty = 0

  for (const s of suspects) {
    const slug = WAHAPEDIA_SLUGS[s.faction]!
    let groupKeys = groupKeyCache.get(slug)
    if (!groupKeys) {
      let html = pageCache.get(slug)
      if (!html) {
        html = await fetchFactionPage(slug)
        pageCache.set(slug, html)
      }
      // `source` is irrelevant for this read-only audit; pass the slug for traceability.
      const groups = parseEnhancements(html, slug)
      groupKeys = new Set<string>()
      for (const g of groups) {
        groupKeys.add(nameKey(g.name))
        groupKeys.add(nameKey(stripQualifier(g.name)))
      }
      groupKeyCache.set(slug, groupKeys)
    }

    const detKeys = [nameKey(s.detachment), nameKey(stripQualifier(s.detachment))]
    const hit = detKeys.some((k) => groupKeys!.has(k))
    if (hit) {
      realMisses++
      console.log(`  ❗ ${s.faction} / ${s.detachment} — page has matching enhancement group (real miss)`)
    } else {
      legitimateEmpty++
      console.log(`  · ${s.faction} / ${s.detachment} — no matching enhancement group on page (legitimate empty)`)
    }
  }

  console.log(`\nReal misses: ${realMisses}`)
  console.log(`Legitimate empty: ${legitimateEmpty}`)
}

main().catch((err) => {
  console.error('\nAudit failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
