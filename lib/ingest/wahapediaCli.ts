import type { DataManifest, Detachment, FactionArtifact } from '../dataModel'
import {
  prepareArtifact,
  readArtifact,
  readManifest,
  writeArtifact,
  writeManifest,
  type EmitResult,
} from './emit'
import {
  fetchFactionPage,
  parseEnhancementKinds,
  parseRealDetachmentNames,
  parseStratagems,
  type DetachmentEnhancementKinds,
  type DetachmentStratagems,
} from './wahapedia'
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

/** Tokenize a name into lowercase alphanumeric words for set-comparison matching. */
function nameTokens(s: string): Set<string> {
  const t = s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  return new Set(t)
}

/** True if every element of `sub` is in `sup`. */
function isSubsetOf(sub: Set<string>, sup: Set<string>): boolean {
  for (const x of sub) if (!sup.has(x)) return false
  return true
}

/**
 * Token-subset match: two names refer to the same detachment if one's word-token
 * set is a subset of the other's (e.g. BSData's "Alien Hunters (Ordo Xenos)" →
 * tokens {alien,hunters,ordo,xenos} matches Wahapedia's "Ordo Xenos Alien Hunters"
 * → same set). Requires ≥ 2 tokens on the smaller side to avoid 1-word false
 * positives. Used as a final matching fallback after exact/qualifier-strip.
 */
function tokensCompatible(a: string, b: string): boolean {
  const ta = nameTokens(a)
  const tb = nameTokens(b)
  const small = ta.size <= tb.size ? ta : tb
  const large = small === ta ? tb : ta
  if (small.size < 2) return false
  return isSubsetOf(small, large)
}

/**
 * Scraped group names that are not detachments and must never become one. Wahapedia mixes a
 * "Core" block (Rapid Ingress, Fire Overwatch, …) into the cards on some pages; those universal
 * stratagems are maintained separately in `coreStratagems.ts`.
 */
const SKIP_GROUPS = new Set(['core'])

type MergeStats = {
  matched: number
  synthesized: number
  stratagems: number
  enhancementsFlagged: number
  pruned: number
}

/**
 * Merge scraped stratagems (and Upgrade-subtype enhancement flags) into an artifact's
 * detachments, in place.
 *
 * - A group whose name matches an existing (BSData-sourced) detachment fills that
 *   detachment's `stratagems`. Matching ignores case/punctuation and a trailing parenthetical
 *   qualifier, so Wahapedia's "Alien Hunters" fills BSData's "Alien Hunters (Ordo Xenos)".
 * - A group with no match is appended as a synthesized shell detachment (empty `rules`), but
 *   ONLY when `allowSynthesis` is set AND the same (normalized) name is in `realDetachmentNames`
 *   — every genuine 11e detachment's page heading carries a Detachment Points badge (see
 *   `parseRealDetachmentNames` in `wahapedia.ts`); alt-game-mode listings (Boarding Action,
 *   Crusade, …) don't. This replaces 10e's "does an enhancement table exist for this name"
 *   heuristic now that enhancements are BSData-sourced, not scraped (Phase 4/6).
 * - Synthesis is DISABLED for the shared Space Marines page (served to all 12 chapters):
 *   that page lists every chapter's stratagem cards, so an unmatched group is another
 *   chapter's detachment — already modelled in the pinned BSData release and correctly
 *   scoped out of THIS chapter — not a genuinely-new one. Synthesizing it would re-leak
 *   the cross-chapter detachments that ingest deliberately scoped away.
 * - Enhancement Upgrade-subtype flags are matched onto the detachment's existing (BSData)
 *   `enhancements` array by name — never used to create or replace that array, since BSData
 *   is the structural source of truth for it now. A flag matching no existing enhancement is
 *   logged and skipped.
 *
 * Finally, after merging, any detachment left with both empty `rules` and empty `stratagems`
 * is pruned — a real BSData detachment always carries rules, and a synthesized shell is only
 * created when it has stratagems, so this drops legacy shells left over from before the
 * DP-badge gate existed (and any detachment now shown by BSData to be alt-game-mode-only).
 */
function mergeStratagems(
  artifact: FactionArtifact,
  stratagemGroups: DetachmentStratagems[],
  realDetachmentNames: Set<string>,
  enhancementKindGroups: DetachmentEnhancementKinds[],
  allowSynthesis: boolean,
): MergeStats {
  // Pre-prune: drop synthesized shells from previous runs (rules.length === 0)
  // before indexing. A real BSData-sourced detachment always carries rules, so
  // any rules-empty detachment is, by construction, a prior synth shell. Without
  // this, the byName map locks "Ordo Xenos Alien Hunters" (a previous-run shell)
  // ahead of "Alien Hunters (Ordo Xenos)" (the real BSData detachment), so the
  // token-subset fallback below never gets a chance to reroute the enhancement
  // group to the right home. Legitimate new detachments will be re-synthesized
  // by the merge passes below; this just clears the slate.
  artifact.detachments = artifact.detachments.filter((d) => d.rules.length > 0)

  const byName = new Map<string, Detachment>()
  for (const d of artifact.detachments) {
    byName.set(nameKey(d.name), d)
    // Index the qualifier-stripped form too, but never shadow an exact name.
    const bare = nameKey(stripQualifier(d.name))
    if (!byName.has(bare)) byName.set(bare, d)
  }

  // Name keys of real (DP-badged, non-alt-game-mode) detachments parsed off the same page —
  // the structural signal that an otherwise-unmatched stratagem group represents a genuine
  // detachment BSData's pinned commit doesn't yet have, not a Boarding-Action-style alt-mode
  // listing. Stored as both the raw and qualifier-stripped form so "Alien Hunters" matches
  // "Alien Hunters (Ordo Xenos)". Names are kept separately to support the same token-subset
  // fallback used for detachment matching.
  const realDetachmentKeys = new Set<string>()
  const realDetachmentNameList: string[] = []
  for (const name of realDetachmentNames) {
    if (SKIP_GROUPS.has(nameKey(name))) continue
    realDetachmentKeys.add(nameKey(name))
    realDetachmentKeys.add(nameKey(stripQualifier(name)))
    realDetachmentNameList.push(name)
  }

  /** True if `groupName` names one of the page's real (DP-badged) detachments. */
  const isRealDetachment = (groupName: string): boolean => {
    if (
      realDetachmentKeys.has(nameKey(groupName)) ||
      realDetachmentKeys.has(nameKey(stripQualifier(groupName)))
    ) {
      return true
    }
    // Final fallback: token-subset across real detachment names.
    return realDetachmentNameList.some((n) => tokensCompatible(n, groupName))
  }

  /**
   * Resolve a scraped group to a detachment, synthesizing a shell when allowed.
   * Matching tries exact / qualifier-stripped first, then a token-subset fallback
   * for cross-source naming irregularities (BSData's "Alien Hunters (Ordo Xenos)"
   * vs Wahapedia's "Ordo Xenos Alien Hunters" — same detachment, different word order).
   *
   * Synthesis is gated on `isRealDetachment`, the structural signal (a DP badge on the
   * page) that the group represents a real detachment rather than an alt-game-mode listing.
   *
   * Returns `{ det, synthesized }` so callers can count true shell creation vs.
   * matches that resolved to an existing detachment via the token-subset fallback
   * (which would otherwise be misclassified as synthesized).
   */
  const findOrSynth = (
    groupName: string,
    makeShell: () => Detachment,
  ): { det: Detachment; synthesized: boolean } | null => {
    if (SKIP_GROUPS.has(nameKey(groupName))) return null
    const existing = byName.get(nameKey(groupName)) ?? byName.get(nameKey(stripQualifier(groupName)))
    if (existing) return { det: existing, synthesized: false }
    // Token-subset fallback against existing detachments (now guaranteed to be
    // real BSData-sourced ones because the pre-prune above stripped synth shells).
    for (const d of artifact.detachments) {
      if (tokensCompatible(d.name, groupName)) return { det: d, synthesized: false }
    }
    if (!allowSynthesis) return null
    if (!isRealDetachment(groupName)) return null
    const shell = makeShell()
    artifact.detachments.push(shell)
    byName.set(nameKey(groupName), shell)
    return { det: shell, synthesized: true }
  }

  const stats: MergeStats = { matched: 0, synthesized: 0, stratagems: 0, enhancementsFlagged: 0, pruned: 0 }
  const matchedDetachments = new Set<Detachment>()
  const synthesizedDetachments = new Set<Detachment>()

  for (const group of stratagemGroups) {
    if (SKIP_GROUPS.has(nameKey(group.name))) continue
    stats.stratagems += group.stratagems.length
    const result = findOrSynth(group.name, () => ({
      id: `waha-${slugify(group.name)}`,
      name: group.name,
      rules: [],
      stratagems: group.stratagems,
    }))
    if (!result) continue
    const erasedSummaries = result.det.stratagems.filter((s) => s.summary).length
    if (erasedSummaries > 0) {
      console.warn(
        `  ⚠ Erasing ${erasedSummaries} summar${erasedSummaries === 1 ? 'y' : 'ies'} from "${result.det.name}" — run ingest:summarise afterwards`,
      )
    }
    result.det.stratagems = group.stratagems
    if (result.synthesized) synthesizedDetachments.add(result.det)
    else matchedDetachments.add(result.det)
  }

  // Enhancement Upgrade-subtype flags: matched onto the detachment's EXISTING (BSData-sourced)
  // `enhancements` array by name — never used to create a detachment or replace that array.
  for (const group of enhancementKindGroups) {
    if (SKIP_GROUPS.has(nameKey(group.name)) || group.upgradeNames.length === 0) continue
    const det =
      byName.get(nameKey(group.name)) ??
      byName.get(nameKey(stripQualifier(group.name))) ??
      artifact.detachments.find((d) => tokensCompatible(d.name, group.name))
    if (!det?.enhancements) continue
    for (const upgradeName of group.upgradeNames) {
      const match = det.enhancements.find(
        (e) =>
          nameKey(e.name) === nameKey(upgradeName) ||
          nameKey(stripQualifier(e.name)) === nameKey(stripQualifier(upgradeName)) ||
          tokensCompatible(e.name, upgradeName),
      )
      if (match) {
        match.kind = 'upgrade'
        stats.enhancementsFlagged++
      } else {
        console.warn(
          `  ⚠ Upgrade-marked enhancement "${upgradeName}" (${group.name}) matches no BSData enhancement — skipped`,
        )
      }
    }
  }

  // Prune legacy shells synthesized before the gate above existed: a detachment with
  // no rules AND no stratagems is, by construction, a Boarding-mode / alt-game-mode
  // listing that slipped through (or a shell whose stratagem group vanished on a
  // later run). Real BSData detachments always carry rules; a synthesized shell is
  // only ever created together with stratagems.
  const before = artifact.detachments.length
  artifact.detachments = artifact.detachments.filter(
    (d) => d.rules.length > 0 || d.stratagems.length > 0,
  )
  stats.pruned = before - artifact.detachments.length

  stats.matched = matchedDetachments.size
  stats.synthesized = synthesizedDetachments.size
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

    const html = await getPage(slug)
    const source = sourceName(artifact.factionName)
    const stratagemGroups = parseStratagems(html, source)
    const realDetachmentNames = parseRealDetachmentNames(html)
    const enhancementKindGroups = parseEnhancementKinds(html)
    const allowSynthesis = (slugFactionCount.get(slug) ?? 0) <= 1
    const stats = mergeStratagems(
      artifact,
      stratagemGroups,
      realDetachmentNames,
      enhancementKindGroups,
      allowSynthesis,
    )

    const result = prepareArtifact(artifact)
    updated.set(id, result)
    if (!args.dryRun) await writeArtifact(result)

    const newDets = stats.synthesized > 0 ? `, ${stats.synthesized} new detachment(s)` : ''
    const enh = stats.enhancementsFlagged > 0 ? `, ${stats.enhancementsFlagged} enhancement(s) flagged Upgrade` : ''
    const pruned = stats.pruned > 0 ? `, ${stats.pruned} shell(s) pruned` : ''
    console.log(`${stats.stratagems} stratagems → ${stats.matched} matched detachment(s)${enh}${newDets}${pruned}`)
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

// Only run the CLI when this file is invoked as an entry point. Guarded so test
// files can `import` the exported helpers (mergeStratagems, tokensCompatible)
// without triggering a full ingest run. NB: this check is tsx-only — it relies
// on the source filename in argv[1] and will not fire if the module is compiled
// to .js, renamed, or invoked via a symlink. The CLI is `npm run ingest:wahapedia`
// which runs the source via tsx, so that's the only invocation path that matters.
if (process.argv[1]?.endsWith('wahapediaCli.ts')) {
  main().catch((err) => {
    console.error('\nWahapedia ingest failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}

export { mergeStratagems, nameKey, stripQualifier, tokensCompatible }
