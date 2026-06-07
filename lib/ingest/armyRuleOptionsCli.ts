import type { DataManifest } from '../dataModel'
import { parseCatalogue } from '../parsers/bsdata'
import { fetchRaw } from './fetch'
import { ARMY_RULE_OPTION_TABLES, attachArmyRuleOptions } from './armyRuleOptions'
import {
  prepareArtifact,
  readArtifact,
  readManifest,
  writeArtifact,
  writeManifest,
  type EmitResult,
} from './emit'

/**
 * Offline one-time patch: attach each curated faction's army-rule reference-table
 * `options` (Thousand Sons' Rituals, World Eaters' Blessings of Khorne) to its committed
 * artifact.
 *
 * Unlike `armyRulesCli` (which only re-tags existing glossary entries), this needs the raw
 * BSData catalogue — the reference table's `<profile>` entries live there, not in the
 * artifact — so it re-fetches the faction's own catalogue at the manifest's pinned commit
 * (cached by `fetchRaw`, the same as a full ingest) and re-parses just that one file. The
 * same extraction runs inside `toFactionArtifact` so future BSData ingests are correct
 * automatically; this CLI back-fills the *already-committed* artifacts without a full
 * network re-ingest. It is idempotent and orthogonal to Wahapedia / dedup / summarise — it
 * only sets `glossary[].options` — so it can be re-run any time.
 *
 *   read manifest → fetch + parse faction catalogue → read artifact → attachArmyRuleOptions
 *   → prepareArtifact / writeArtifact → patch manifest hashes
 *
 * Usage: `npm run ingest:armyruleoptions -- [--factions <slug,slug|all>] [--dry-run]`
 */

type Args = { factions: string[] | 'all'; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { factions: 'all', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--factions') {
      const v = argv[++i]
      args.factions = v === 'all' ? 'all' : v.split(',').map(s => s.trim()).filter(Boolean)
    } else if (a === '--dry-run') {
      args.dryRun = true
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('Attaching army-rule option tables to committed artifacts')
  if (args.dryRun) console.log('  (dry run — nothing will be written)')

  const manifest = await readManifest()
  // Only the two curated factions carry a reference table — no point fetching catalogues
  // for the other 45.
  const targets = manifest.factions.filter(
    f => ARMY_RULE_OPTION_TABLES[f.factionId]
      && (args.factions === 'all' || args.factions.includes(f.factionId)),
  )

  const reEmitted = new Map<string, EmitResult>()
  let totalOptions = 0

  for (const f of targets) {
    // The catalogue's BSData `name` is exactly its filename stem (see ManifestFaction /
    // makeFileFinder's `${name}.cat` guess in cli.ts) — no chain-walking needed, the
    // reference table lives in the faction's own catalogue.
    const catalogue = parseCatalogue(await fetchRaw(manifest.bsDataCommit, `${f.factionName}.cat`))
    const artifact = await readArtifact(f.factionId)
    attachArmyRuleOptions(artifact, catalogue)

    const optioned = artifact.glossary.filter(g => g.options && g.options.length > 0)
    totalOptions += optioned.reduce((sum, g) => sum + (g.options?.length ?? 0), 0)

    // Re-serialise even when nothing matched: the content hash is unchanged, so the
    // manifest entry stays identical and the file write is a harmless no-op rewrite.
    const result = prepareArtifact(artifact)
    reEmitted.set(f.factionId, result)
    if (!args.dryRun) await writeArtifact(result)

    if (optioned.length === 0) {
      // Allowlisted faction whose names didn't resolve — almost certainly a typo or a
      // selectionEntry/glossary rename in a data bump. Surface loudly rather than silently
      // shipping nothing.
      const table = ARMY_RULE_OPTION_TABLES[f.factionId]
      console.warn(
        `  ⚠ ${f.factionId}: expected options for "${table.armyRule}" from ` +
          `"${table.selectionEntry}" but attached none`,
      )
    } else {
      for (const g of optioned) console.log(`  ${f.factionId}: ${g.name} — ${g.options!.length} option(s)`)
    }
  }

  if (!args.dryRun) {
    // Patch manifest.json so the ?v=<sha256> cache-bust URLs stay in sync with the rewritten
    // files (next.config.ts marks /data/factions/* immutable).
    const newManifest: DataManifest = {
      ...manifest,
      factions: manifest.factions.map(f => {
        const r = reEmitted.get(f.factionId)
        return r ? { ...f, bytes: r.bytes, sha256: r.sha256 } : f
      }),
    }
    await writeManifest(newManifest)
  }

  console.log(
    `\n${targets.length} faction(s) processed, ${totalOptions} option(s) attached` +
      `${args.dryRun ? ' (dry run — nothing written)' : ' — public/data/ updated'}.`,
  )
}

main().catch(err => {
  console.error('\nArmy-rule option extraction failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
