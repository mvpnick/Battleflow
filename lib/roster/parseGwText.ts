import { norm } from './normalize'

export type ParsedUnit = {
  name: string
  points?: number
  /** Weapon names extracted from count-prefixed bullets (Nx ...) and indented sub-model lines. */
  wargear: string[]
  /** Enhancement names from bare-name or (+N pts) bullets without a count prefix. */
  enhancements: string[]
}

export type ParsedArmy = {
  /** Faction keyword from [BRACKETS] — taken from the +++ header if present, otherwise the first bracket group in the opening lines. */
  factionKeyword: string
  detachment?: string
  totalPoints?: number
  units: ParsedUnit[]
}

/**
 * Parse the GW My Army app text export, or the New Recruit / BattleScribe army list format.
 *
 * GW My Army skeleton:
 *   +++ Army Name [FACTION KEYWORD] (N pts) +++
 *   == Detachment Name ==
 *   SECTION HEADER
 *   Unit Name (N pts)
 *   • Nx Weapon
 *     ◦ Sub-weapon        ← indented sub-model line → wargear
 *   • Enhancement (+N pts)
 *
 * New Recruit / BattleScribe skeleton:
 *   + FACTION KEYWORD: CHAOS DAEMONS +
 *   + DETACHMENT: Daemonic Incursion (Warp Rifts) +
 *   + TOTAL ARMY POINTS: 1995pts +
 *   Unit Name (N pts)
 *   • Nx Weapon
 *
 * The two formats are detected automatically: presence of `+ KEY: value +` lines
 * triggers New Recruit extraction; otherwise the `+++`/`[BRACKET]`/`==` paths run.
 */
export function parseGwText(raw: string): ParsedArmy {
  const lines = raw.split('\n')

  let factionKeyword = ''
  let detachment: string | undefined
  let totalPoints: number | undefined

  // New Recruit / BattleScribe: `+ KEY: value +` header lines.
  // These use a single `+` prefix and a colon separator, distinct from the `+++` GW header.
  for (const l of lines) {
    const t = l.trim()
    // Matches:  + FACTION KEYWORD: CHAOS DAEMONS +   (trailing + is optional)
    const nrKw = t.match(/^\+\s+FACTION KEYWORD:\s*(.+?)\s*\+?\s*$/i)
    if (nrKw && !factionKeyword) { factionKeyword = nrKw[1].trim(); continue }

    const nrDet = t.match(/^\+\s+DETACHMENT:\s*(.+?)\s*\+?\s*$/i)
    if (nrDet && !detachment) { detachment = nrDet[1].trim(); continue }

    const nrPts = t.match(/^\+\s+TOTAL ARMY POINTS:\s*(\d[\d,]*)\s*pts?\s*\+?\s*$/i)
    if (nrPts && totalPoints === undefined) {
      totalPoints = parseInt(nrPts[1].replace(/,/g, ''), 10)
    }
  }

  // GW My Army: extract from +++ header line if New Recruit didn't supply values.
  if (!factionKeyword || totalPoints === undefined) {
    const headerLine = lines.find(l => /^\+\+\+/.test(l.trim()))
    if (headerLine) {
      if (!factionKeyword) {
        const kwMatch = headerLine.match(/\[([^\]]+)\]/)
        if (kwMatch) factionKeyword = kwMatch[1].trim()
      }
      if (totalPoints === undefined) {
        const ptsMatch = headerLine.match(/\((\d[\d,]*)\s*pts?\)/i)
        if (ptsMatch) totalPoints = parseInt(ptsMatch[1].replace(/,/g, ''), 10)
      }
    }
  }

  // Fallback: scan the opening lines for a [BRACKET] group in case the +++ wrapper is absent.
  // Capped at 10 lines so we don't pick up ability annotations deeper in the list body.
  if (!factionKeyword) {
    for (const l of lines.slice(0, 10)) {
      const m = l.match(/\[([^\]]+)\]/)
      if (m) { factionKeyword = m[1].trim(); break }
    }
  }

  // GW My Army: detachment from == ... == line if New Recruit didn't supply it.
  if (!detachment) {
    const detachLine = lines.find(l => /^==\s*.+\s*==$/.test(l.trim()))
    if (detachLine) {
      detachment = detachLine.replace(/^==\s*/, '').replace(/\s*==$/, '').trim()
    }
  }

  // Group non-empty lines into blocks separated by blank lines
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (cur.length) { blocks.push(cur); cur = [] }
    } else {
      cur.push(line)
    }
  }
  if (cur.length) blocks.push(cur)

  const units: ParsedUnit[] = []
  for (const block of blocks) {
    const unit = parseBlock(block)
    if (unit) units.push(unit)
  }

  return { factionKeyword, detachment, totalPoints, units }
}

function parseBlock(lines: string[]): ParsedUnit | null {
  const firstLine = lines[0].trim()

  // Skip GW My Army control lines (+++ / ==) and New Recruit `+ KEY: value +` lines.
  if (/^\+\+\+/.test(firstLine) || /^==/.test(firstLine)) return null
  if (/^\+\s+[A-Z].*:/i.test(firstLine)) return null

  // A valid unit first line must be "Name (N pts)"; section headers like
  // "CHARACTER" / "BATTLELINE" have no pts suffix and are all-caps — skip them.
  const unitMatch = firstLine.match(/^(.+?)\s*\((\d[\d,]*)\s*pts?\)\s*$/i)
  let name: string
  let points: number | undefined

  if (unitMatch) {
    name = unitMatch[1].trim()
    points = parseInt(unitMatch[2].replace(/,/g, ''), 10)
  } else {
    // Section headers like "CHARACTER" / "BATTLELINE" are all-caps with no digits.
    // Require both conditions so all-caps unit names (if they exist) aren't dropped.
    if (/^[A-Z\s]+$/.test(firstLine) && !/\d/.test(firstLine)) return null
    name = firstLine
  }
  if (!name) return null

  const wargear: string[] = []
  const enhancements: string[] = []

  for (const line of lines.slice(1)) {
    const trimmed = line.trim()

    // Indented lines (sub-model bullets) are wargear regardless of bullet char.
    // "Indented" means the raw line starts with whitespace before the bullet.
    const isIndented = line.length > trimmed.length && /^\s/.test(line)

    const bulletMatch = trimmed.match(/^[•◦*-]\s*(.+)$/)
    if (!bulletMatch) continue

    const content = bulletMatch[1].trim()

    if (isIndented) {
      // Strip optional count prefix on sub-model lines
      const cm = content.match(/^(\d+)x\s+(.+)$/i)
      wargear.push(cm ? cm[2].trim() : content)
      continue
    }

    // Warlord marker → discard
    if (norm(content) === 'warlord') continue

    // Count-prefixed bullet → wargear
    const cm = content.match(/^(\d+)x\s+(.+)$/i)
    if (cm) {
      wargear.push(cm[2].trim())
      continue
    }

    // Bare name or "Name (+N pts)" → enhancement
    const enhMatch = content.match(/^(.+?)\s*\(\+\d+\s*pts?\)\s*$/i)
    enhancements.push(enhMatch ? enhMatch[1].trim() : content)
  }

  return { name, points, wargear, enhancements }
}
