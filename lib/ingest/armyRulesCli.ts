import type { DataManifest } from '../dataModel'
import { ARMY_RULES, flagArmyRules } from './armyRules'
import {
  prepareArtifact,
  readArtifact,
  readManifest,
  writeArtifact,
  writeManifest,
  type EmitResult,
} from './emit'

/**
 * Offline one-time patch: tag each committed faction artifact's army rule(s).
 *
 * The same flagging logic runs inside `toFactionArtifact` so future BSData ingests are
 * correct automatically; this CLI back-fills the *already-committed* artifacts without a
 * full network re-ingest (which would also force re-running Wahapedia / dedup / summarise).
 * It is idempotent and orthogonal to those passes — it only sets `glossary[].armyRule`,
 * touching no stratagems, rules, or detachments — so it can be re-run any time.
 *
 *   read artifact → flagArmyRules → prepareArtifact / writeArtifact → patch manifest hashes
 *
 * Usage: `npm run ingest:armyrules -- [--factions <slug,slug|all>] [--dry-run]`
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
  console.log('Flagging army rules in committed artifacts')
  if (args.dryRun) console.log('  (dry run — nothing will be written)')

  const manifest = await readManifest()
  const targets = manifest.factions.filter(
    f => args.factions === 'all' || args.factions.includes(f.factionId),
  )

  const reEmitted = new Map<string, EmitResult>()
  let totalFlagged = 0

  for (const f of targets) {
    const artifact = await readArtifact(f.factionId)
    flagArmyRules(artifact)
    const flagged = artifact.glossary.filter(g => g.armyRule).map(g => g.name)
    totalFlagged += flagged.length

    // Re-serialise even when nothing matched: the content hash is unchanged, so the
    // manifest entry stays identical and the file write is a harmless no-op rewrite.
    const result = prepareArtifact(artifact)
    reEmitted.set(f.factionId, result)
    if (!args.dryRun) await writeArtifact(result)

    const expected = ARMY_RULES[f.factionId]
    if (expected && flagged.length === 0) {
      // Allowlisted faction whose names didn't resolve — almost certainly a typo or a
      // glossary rename in a data bump. Surface loudly rather than silently shipping nothing.
      console.warn(`  ⚠ ${f.factionId}: expected army rule(s) ${expected.join(', ')} but matched none`)
    } else if (flagged.length > 0) {
      console.log(`  ${f.factionId}: ${flagged.join(', ')}`)
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
    `\n${targets.length} faction(s) processed, ${totalFlagged} glossary entr(y/ies) flagged` +
      `${args.dryRun ? ' (dry run — nothing written)' : ' — public/data/ updated'}.`,
  )
}

main().catch(err => {
  console.error('\nArmy-rule flagging failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
