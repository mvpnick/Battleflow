import type { Catalogue, EntryLink, InfoLink, Profile, RuleNode, SelectionEntry, SelectionEntryGroup } from '../parsers/bsdata'
import { textOf } from '../parsers/bsdata'
import { buildIndex, type BsIndex } from './resolve'
import type { Detachment, DetachmentRule } from '../dataModel'
import type { Strat } from '../types'

const STRATAGEM_TYPE = 'Stratagem'

/**
 * BSData typeName values that indicate detachment ability profiles.
 * Note: BSData 10e uses "Abilities" (plural) for all ability profiles — earlier
 * versions used "Ability" (singular). Both are included for compatibility.
 */
const ABILITY_TYPES = new Set(['Ability', 'Abilities', 'Detachment Ability', 'Enhancement'])

/** Parse an integer CP cost from strings like "1 CP", "2CP", "1". */
function parseCp(raw: string | undefined): number {
  if (!raw) return 1
  const m = raw.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

/** Infer usage restriction from effect/restriction text. */
function parseOnce(text: string): 'battle' | 'phase' | false {
  const t = text.toLowerCase()
  if (t.includes('once per battle') || t.includes('more than once per battle')) return 'battle'
  if (t.includes('once per phase') || t.includes('once per turn')) return 'phase'
  return false
}

/**
 * Extract a short tactical summary from a stratagem's full effect text.
 * Prefers the EFFECT: section when the text is structured; falls back to first sentence.
 */
function extractSummary(effect: string): string {
  const effectMatch = effect.match(/EFFECT:\s*([\s\S]+?)(?=\n[A-Z ]+:|$)/i)
  const raw = effectMatch ? effectMatch[1].trim() : effect.trim()
  const breakIdx = raw.search(/[.!]\s/)
  const first = breakIdx >= 0 ? raw.slice(0, breakIdx + 1) : raw
  const clean = first.replace(/\n/g, ' ').trim()
  return clean.length > 80 ? clean.slice(0, 77) + '...' : clean
}

/** Get a characteristic value by one of several candidate names. */
function charValue(profile: Profile, ...names: string[]): string {
  for (const c of profile.characteristics?.characteristic ?? []) {
    if (names.includes(c.name)) return c['#text'] ?? ''
  }
  return ''
}

function stratagemFromProfile(profile: Profile, source: string): Strat {
  const effect = charValue(profile, 'Description', 'Effect', 'Summary')
  const restriction = charValue(profile, 'Restriction', 'Restrictions')
  const combinedText = [effect, restriction].filter(Boolean).join(' ')
  return {
    name: profile.name,
    cp: parseCp(charValue(profile, 'Cost', 'CP')),
    timing: charValue(profile, 'Type', 'When', 'Phase'),
    effect,
    cond: restriction || undefined,
    once: parseOnce(combinedText),
    source,
    summary: extractSummary(effect || combinedText),
  }
}

function detachmentRuleFromProfile(profile: Profile, source: string): DetachmentRule {
  const chars = profile.characteristics?.characteristic ?? []
  const desc = chars.find(c => c.name === 'Description' || c.name === 'Effect')
  const effect = desc?.['#text'] ?? chars.map(c => `${c.name}: ${c['#text'] ?? ''}`).join('; ')
  return {
    id: profile.id,
    name: profile.name,
    timing: charValue(profile, 'Type', 'When', 'Phase'),
    effect,
    source,
  }
}

function detachmentRuleFromRuleNode(rule: RuleNode, source: string): DetachmentRule {
  return {
    id: rule.id,
    name: rule.name,
    timing: '',
    effect: textOf(rule.description),
    source,
  }
}

/**
 * A permissive node type for traversal — BSData subtrees are heterogeneous
 * (SelectionEntry, SelectionEntryGroup, EntryLink all share nested children).
 */
interface BsDataNode {
  profiles?: { profile?: Profile[] }
  rules?: { rule?: RuleNode[] }
  infoLinks?: { infoLink?: InfoLink[] }
  entryLinks?: { entryLink?: EntryLink[] }
  selectionEntries?: { selectionEntry?: SelectionEntry[] }
  selectionEntryGroups?: { selectionEntryGroup?: SelectionEntryGroup[] }
}

/**
 * Walk a single detachment entry's subtree, collecting stratagem profiles,
 * ability profiles, and rule nodes.
 *
 * BSData 10e uses three patterns for detachment rules:
 * - Space Marines: profiles with typeName="Abilities" directly on the entry
 * - Necrons: infoLinks with type="rule" pointing to rule nodes in the index
 * - T'au: rule nodes embedded directly under <rules> on the entry
 *
 * Does NOT recurse into nested selectionEntry/selectionEntryGroup children —
 * individual detachment entries are treated as leaf nodes so each detachment's
 * content stays separate.
 */
function collectDetachmentContent(
  node: BsDataNode,
  index: BsIndex,
  stratagems: Profile[],
  abilities: Profile[],
  ruleNodes: RuleNode[],
  seenIds: Set<string>,
  depth = 0,
): void {
  if (depth > 4) return

  for (const p of node.profiles?.profile ?? []) {
    if (seenIds.has(p.id)) continue
    seenIds.add(p.id)
    if (p.typeName === STRATAGEM_TYPE) stratagems.push(p)
    else if (ABILITY_TYPES.has(p.typeName)) abilities.push(p)
  }

  for (const r of node.rules?.rule ?? []) {
    if (!r.id || seenIds.has(r.id)) continue
    seenIds.add(r.id)
    ruleNodes.push(r)
  }

  for (const link of node.infoLinks?.infoLink ?? []) {
    if (seenIds.has(link.targetId)) continue
    seenIds.add(link.targetId)
    const target = index.get(link.targetId)
    if (!target) continue
    if (link.type === 'rule' || !('typeName' in target)) {
      ruleNodes.push(target as RuleNode)
    } else {
      const profile = target as Profile
      if (profile.typeName === STRATAGEM_TYPE) stratagems.push(profile)
      else if (profile.typeName && ABILITY_TYPES.has(profile.typeName)) abilities.push(profile)
    }
  }

  for (const l of node.entryLinks?.entryLink ?? []) {
    if (seenIds.has(l.targetId)) continue
    seenIds.add(l.targetId)
    const target = index.get(l.targetId) as BsDataNode | undefined
    if (target) collectDetachmentContent(target, index, stratagems, abilities, ruleNodes, seenIds, depth + 1)
  }
}

function entryToDetachment(entry: SelectionEntry, index: BsIndex): Detachment | null {
  const stratProfiles: Profile[] = []
  const abilityProfiles: Profile[] = []
  const ruleNodes: RuleNode[] = []
  const seenIds = new Set<string>([entry.id])

  collectDetachmentContent(entry, index, stratProfiles, abilityProfiles, ruleNodes, seenIds)

  if (stratProfiles.length === 0 && abilityProfiles.length === 0 && ruleNodes.length === 0) return null

  const nameSeen = new Set<string>()
  const dedup = <T extends { name: string }>(arr: T[]): T[] => arr.filter(item => {
    if (nameSeen.has(item.name)) return false
    nameSeen.add(item.name)
    return true
  })

  const rules: DetachmentRule[] = [
    ...dedup(abilityProfiles).map(p => detachmentRuleFromProfile(p, entry.name)),
    ...dedup(ruleNodes).map(r => detachmentRuleFromRuleNode(r, entry.name)),
  ]

  return {
    id: entry.id,
    name: entry.name,
    stratagems: dedup(stratProfiles).map(p => stratagemFromProfile(p, entry.name)),
    rules,
  }
}

/**
 * Collect a catalogue's individual detachment `selectionEntry`s.
 *
 * BSData 10e stores detachments in three structural patterns depending on the faction:
 *
 * Pattern A (Space Marines): sharedSelectionEntryGroups["Detachment"] whose direct
 *   selectionEntry children are individual detachments with Abilities profiles.
 *
 * Pattern B (Necrons): sharedSelectionEntries["Detachment Choice"] containing a nested
 *   selectionEntryGroups["Detachment"] whose children are individual detachments with
 *   infoLinks to rule nodes.
 *
 * Pattern C (T'au): sharedSelectionEntries["Detachment"] with an entryLink to a
 *   selectionEntryGroup["Detachment"] (resolved via the index) whose children are
 *   individual detachments with embedded rule nodes.
 */
function detachmentEntriesOf(cat: Catalogue, index: BsIndex): SelectionEntry[] {
  const entries: SelectionEntry[] = []
  const seen = new Set<string>()
  const add = (entry: SelectionEntry) => {
    if (seen.has(entry.id)) return
    seen.add(entry.id)
    entries.push(entry)
  }
  const group = (seg: SelectionEntryGroup) => {
    for (const entry of seg.selectionEntries?.selectionEntry ?? []) add(entry)
  }

  // Pattern A: sharedSelectionEntryGroups named "Detachment" (Space Marines)
  for (const seg of cat.sharedSelectionEntryGroups?.selectionEntryGroup ?? []) {
    if (seg.name.toLowerCase().includes('detachment')) group(seg)
  }

  // Patterns B & C: sharedSelectionEntries whose name includes "detachment"
  for (const entry of cat.sharedSelectionEntries?.selectionEntry ?? []) {
    if (!entry.name.toLowerCase().includes('detachment')) continue

    // Pattern B (Necrons): entry has a nested selectionEntryGroups["Detachment"]
    const nestedGroup = (entry.selectionEntryGroups?.selectionEntryGroup ?? [])
      .find(g => g.name.toLowerCase().includes('detachment'))
    if (nestedGroup) {
      group(nestedGroup)
      continue
    }

    // Pattern C (T'au): entry has an entryLink to a selectionEntryGroup named "Detachment"
    let resolvedViaLink = false
    for (const link of entry.entryLinks?.entryLink ?? []) {
      if (link.type !== 'selectionEntryGroup') continue
      const target = index.get(link.targetId) as SelectionEntryGroup | undefined
      if (!target || !target.name?.toLowerCase().includes('detachment')) continue
      group(target)
      resolvedViaLink = true
    }

    // Fallback: treat the entry itself as a single detachment
    if (!resolvedViaLink) add(entry)
  }

  return entries
}

/**
 * The catalogue ids a detachment entry is *restricted to*, read from its BSData visibility
 * modifiers. A chapter/sub-faction detachment hides itself via a `set hidden=true` modifier
 * gated on `notInstanceOf` / `scope="primary-catalogue"` conditions whose `childId` is the
 * catalogue it belongs to (e.g. "Unforgiven Task Force" → Dark Angels' catalogue id). An empty
 * result means the detachment is ungated — generic and legal for every importer of the group.
 */
export function gatingChildIds(entry: SelectionEntry): string[] {
  const ids: string[] = []
  for (const mod of entry.modifiers?.modifier ?? []) {
    if (mod.field !== 'hidden' || mod.value !== 'true') continue
    const conditions = [
      ...(mod.conditions?.condition ?? []),
      ...(mod.conditionGroups?.conditionGroup ?? []).flatMap(g => g.conditions?.condition ?? []),
    ]
    for (const c of conditions) {
      if (c.type === 'notInstanceOf' && c.scope === 'primary-catalogue' && c.childId) {
        ids.push(c.childId)
      }
    }
  }
  return ids
}

/**
 * Select the catalogues whose detachment groups belong to a faction, scoping out the ally
 * catalogues its chain imports for roster-building (Agents of the Imperium, Imperial Knights,
 * allied AM/Tyranids/Daemons libraries, …). Without this, walking the whole import chain leaks
 * other factions' detachments — and the 12 Space Marine chapters each store the full 53-detachment
 * union. A catalogue is "owned" by the faction (primary catalogue `primary`) if:
 *
 *   1. It IS the primary.
 *   2. The primary's own top-level "…detachment…" `entryLink`(s) resolve into it. This catches
 *      "library" factions whose primary holds no detachment group but links one in a sibling
 *      library (Astra Militarum → AM Library, Chaos Daemons → Daemons Library, the Knights → their
 *      Library, Aeldari → Aeldari Library).
 *   3. It is an imported "chaptered codex" — its detachment group carries `primary-catalogue`
 *      gating (only `Imperium - Space Marines` and `Aeldari - Aeldari Library` do, each imported
 *      solely by its own family). This adopts the SM codex for ALL 12 chapters, including the
 *      divisio chapters that have no chapter-specific detachments of their own, while never pulling
 *      in ungated ally catalogues.
 *
 * `extractDetachments` then gate-filters the entries from these catalogues per chapter.
 */
export function selectOwnedCatalogues(
  allCatalogues: Catalogue[],
  primary: Catalogue,
  index: BsIndex,
): Catalogue[] {
  const owned = new Set<string>([primary.id])

  // (2) Resolve the primary's detachment entryLink target(s) to their owning catalogue.
  const idToCatalogueId = new Map<string, string>()
  for (const cat of allCatalogues) {
    for (const id of buildIndex([cat]).keys()) idToCatalogueId.set(id, cat.id)
  }
  for (const link of primary.entryLinks?.entryLink ?? []) {
    if (!link.name?.toLowerCase().includes('detachment')) continue
    const ownerCatId = idToCatalogueId.get(link.targetId)
    if (ownerCatId) owned.add(ownerCatId)
  }

  // (3) Adopt any imported chaptered codex (its group carries primary-catalogue gating).
  for (const cat of allCatalogues) {
    if (owned.has(cat.id)) continue
    if (detachmentEntriesOf(cat, index).some(e => gatingChildIds(e).length > 0)) owned.add(cat.id)
  }

  return allCatalogues.filter(cat => owned.has(cat.id))
}

/**
 * Extract structured detachments (with rules and any available stratagems) from a faction's
 * *owned* catalogues (see {@link selectOwnedCatalogues}), keeping only those legal for the
 * faction's primary catalogue `primaryCatalogueId`: a detachment is kept when it is ungated, or
 * gated to the primary itself (see {@link gatingChildIds}).
 *
 * Note: BSData 10e does not encode faction stratagems as machine-readable profiles. The
 * `stratagems` array of each Detachment is empty here; they are merged in later from Wahapedia.
 */
export function extractDetachments(
  ownedCatalogues: Catalogue[],
  index: BsIndex,
  primaryCatalogueId: string,
): Detachment[] {
  const detachments: Detachment[] = []
  const seenDetachmentIds = new Set<string>()

  for (const cat of ownedCatalogues) {
    for (const entry of detachmentEntriesOf(cat, index)) {
      if (seenDetachmentIds.has(entry.id)) continue
      seenDetachmentIds.add(entry.id)

      // Gate-filter: drop chapter/sub-faction detachments not belonging to this primary.
      const gate = gatingChildIds(entry)
      if (gate.length > 0 && !gate.includes(primaryCatalogueId)) continue

      const det = entryToDetachment(entry, index)
      if (det) detachments.push(det)
    }
  }

  return detachments
}
