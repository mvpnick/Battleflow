import type { Catalogue, Profile, RuleNode } from '../parsers/bsdata'

/**
 * Resolves BSData UUID cross-references (infoLink / entryLink / catalogueLink) so
 * each faction's units become self-contained. Operates on already-parsed trees;
 * fetching/parsing of the catalogue chain happens in the CLI.
 */

// BSData trees are deeply heterogeneous (any element can nest almost anything),
// so the resolver walks them with a permissive node type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BsNode = Record<string, any>

export type BsIndex = Map<string, BsNode>

/**
 * Deep-walk parsed trees, indexing every node that carries an `id`.
 * Ids are assumed globally unique across the catalogue chain (they are BSData UUIDs);
 * if the same id appears twice, the last node walked wins.
 */
export function buildIndex(roots: BsNode[]): BsIndex {
  const index: BsIndex = new Map()
  const stack: BsNode[] = [...roots]
  while (stack.length) {
    const node = stack.pop()!
    if (!node || typeof node !== 'object') continue
    if (typeof node.id === 'string') index.set(node.id, node)
    for (const [key, val] of Object.entries(node)) {
      if (key === 'id' || key === '#text') continue
      if (Array.isArray(val)) {
        for (const c of val) if (c && typeof c === 'object') stack.push(c)
      } else if (val && typeof val === 'object') {
        stack.push(val)
      }
    }
  }
  return index
}

const STAT_TYPES = new Set(['Unit'])
const WEAPON_TYPES = new Set(['Ranged Weapons', 'Melee Weapons'])

/**
 * Option subtrees linked onto units that are army-building choices, NOT datasheet
 * content, and so must not be walked when collecting a unit's profiles:
 *  - Enhancement groups: detachment relics/upgrades a character can buy (e.g. "Sigismund's
 *    Seal", "Phoenix Gem"). BSData names these "<Detachment> Enhancements" (or bare
 *    "Enhancements"); they belong to a detachment, not the datasheet.
 *  - "Crusade": narrative-play progression (battle honours, relics, scars).
 * Without pruning, `collectUnit` sweeps these whole pools into every eligible unit's
 * abilities — observed as a median of ~28 spurious abilities per unit, most belonging
 * to other datasheets. Matched by the group's canonical (English) name, like the
 * typeName sets above. (Enhancements get their own home once detachments are extracted.)
 */
function isPrunedOption(name: string | undefined): boolean {
  if (!name) return false
  return name === 'Crusade' || name === 'Enhancements' || name.endsWith(' Enhancements')
}

function isAbilityProfile(p: Profile): boolean {
  return !STAT_TYPES.has(p.typeName) && !WEAPON_TYPES.has(p.typeName)
}

export interface ResolvedUnit {
  bsId: string
  name: string
  statProfile?: Profile
  weapons: Profile[]
  abilities: Profile[]
  rules: RuleNode[]
  keywords: string[]
  points?: string
}

function hasUnitProfile(node: BsNode, index: BsIndex, seen = new Set<string>(), depth = 0): boolean {
  if (!node || depth > 8) return false
  for (const p of node.profiles?.profile ?? []) if (STAT_TYPES.has(p.typeName)) return true
  for (const l of node.entryLinks?.entryLink ?? []) {
    if (seen.has(l.targetId)) continue
    seen.add(l.targetId)
    const t = index.get(l.targetId)
    if (t && hasUnitProfile(t, index, seen, depth + 1)) return true
  }
  for (const e of node.selectionEntries?.selectionEntry ?? []) if (hasUnitProfile(e, index, seen, depth + 1)) return true
  for (const g of node.selectionEntryGroups?.selectionEntryGroup ?? []) if (hasUnitProfile(g, index, seen, depth + 1)) return true
  return false
}

/**
 * Enumerate fieldable datasheets across one or more catalogues. Candidate roots are
 * each catalogue's top-level entryLinks (the roster-selectable entries) plus any
 * directly-defined top-level selectionEntries; we keep those that resolve to an entry
 * carrying a Unit stat profile, deduped by resolved entry id. Passing the faction's
 * imported catalogues (those linked with importRootEntries) surfaces allied/shared
 * datasheets exactly as a roster builder would offer them.
 */
export function enumerateUnits(catalogues: Catalogue[], index: BsIndex): ResolvedUnit[] {
  const roots: BsNode[] = []
  const seenRoot = new Set<string>()

  const consider = (node: BsNode | undefined) => {
    if (!node || typeof node.id !== 'string' || seenRoot.has(node.id)) return
    if (!hasUnitProfile(node, index)) return
    seenRoot.add(node.id)
    roots.push(node)
  }

  for (const cat of catalogues) {
    for (const link of cat.entryLinks?.entryLink ?? []) consider(index.get(link.targetId))
    for (const entry of cat.selectionEntries?.selectionEntry ?? []) consider(entry)
  }

  return roots.map((root) => collectUnit(root, index))
}

/** Walk a unit subtree, resolving links, gathering its stat/weapon/ability/rule nodes. */
function collectUnit(root: BsNode, index: BsIndex): ResolvedUnit {
  const unit: ResolvedUnit = {
    bsId: root.id,
    name: root.name ?? '(unnamed)',
    weapons: [],
    abilities: [],
    rules: [],
    keywords: [],
  }
  const weaponIds = new Set<string>()
  const abilityIds = new Set<string>()
  const ruleIds = new Set<string>()
  const visited = new Set<string>()

  // Keywords + points come from the root datasheet node only (canonical).
  for (const c of root.categoryLinks?.categoryLink ?? []) {
    if (c.name && !unit.keywords.includes(c.name)) unit.keywords.push(c.name)
  }
  const pts = (root.costs?.cost ?? []).find((c: { name: string; value: string }) => c.name === 'pts')
  if (pts) unit.points = pts.value

  const addProfile = (p: Profile) => {
    if (STAT_TYPES.has(p.typeName)) {
      if (!unit.statProfile) unit.statProfile = p
    } else if (WEAPON_TYPES.has(p.typeName)) {
      if (!weaponIds.has(p.id)) { weaponIds.add(p.id); unit.weapons.push(p) }
    } else if (isAbilityProfile(p)) {
      if (!abilityIds.has(p.id)) { abilityIds.add(p.id); unit.abilities.push(p) }
    }
  }
  const addRule = (r: RuleNode) => {
    if (r?.id && !ruleIds.has(r.id)) { ruleIds.add(r.id); unit.rules.push(r) }
  }

  const traverse = (node: BsNode | undefined, depth: number) => {
    if (!node || depth > 12) return

    for (const p of node.profiles?.profile ?? []) addProfile(p)

    for (const l of node.infoLinks?.infoLink ?? []) {
      const target = index.get(l.targetId)
      if (!target) continue
      if (l.type === 'rule') addRule(target as RuleNode)
      else if (l.type === 'profile') addProfile(target as Profile)
      else if (l.type === 'infoGroup') {
        if (visited.has(l.targetId)) continue
        visited.add(l.targetId)
        traverse(target, depth + 1)
      }
    }

    for (const l of node.entryLinks?.entryLink ?? []) {
      if (isPrunedOption(l.name)) continue
      const target = index.get(l.targetId)
      if (!target || visited.has(l.targetId)) continue
      visited.add(l.targetId)
      traverse(target, depth + 1)
    }

    for (const e of node.selectionEntries?.selectionEntry ?? []) {
      if (isPrunedOption(e.name)) continue
      traverse(e, depth + 1)
    }
    for (const g of node.selectionEntryGroups?.selectionEntryGroup ?? []) {
      if (isPrunedOption(g.name)) continue
      traverse(g, depth + 1)
    }
  }

  traverse(root, 0)
  return unit
}
