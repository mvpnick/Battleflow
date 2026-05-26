import { describe, it, expect } from 'vitest'
import { parseGwText } from '../parseGwText'

// ── GW My Army format ────────────────────────────────────────────────────────

describe('parseGwText – GW My Army format', () => {
  // In the actual GW My Army export, section headers (CHARACTER, BATTLELINE) are separated
  // from unit entries by blank lines, so they land in their own blocks and are skipped.
  const GW_SAMPLE = `
+++ My Army [CHAOS DAEMONS] (1000 pts) +++

== Daemonic Incursion ==

CHARACTER

Bloodthirster (300 pts)
• 1x Bloodflail
• 1x Great axe of Khorne

BATTLELINE

Bloodletters (110 pts)
• 10x Hellblade
`.trim()

  it('extracts factionKeyword from [BRACKET] in the header', () => {
    const result = parseGwText(GW_SAMPLE)
    expect(result.factionKeyword).toBe('CHAOS DAEMONS')
  })

  it('extracts detachment from == == line', () => {
    const result = parseGwText(GW_SAMPLE)
    expect(result.detachment).toBe('Daemonic Incursion')
  })

  it('extracts totalPoints from the header', () => {
    const result = parseGwText(GW_SAMPLE)
    expect(result.totalPoints).toBe(1000)
  })

  it('parses at least one unit', () => {
    const result = parseGwText(GW_SAMPLE)
    expect(result.units.length).toBeGreaterThanOrEqual(1)
    expect(result.units.map(u => u.name)).toContain('Bloodthirster')
  })
})

// ── New Recruit / BattleScribe format ────────────────────────────────────────

describe('parseGwText – New Recruit / BattleScribe format', () => {
  const NR_SAMPLE = `
+ FACTION KEYWORD: CHAOS DAEMONS +
+ DETACHMENT: Daemonic Incursion (Warp Rifts) +
+ TOTAL ARMY POINTS: 1000pts +

Bloodthirster (300 pts)
• 1x Bloodflail
• 1x Great axe of Khorne

Bloodletters (110 pts)
• 10x Hellblade
`.trim()

  it('extracts factionKeyword from + FACTION KEYWORD: line', () => {
    const result = parseGwText(NR_SAMPLE)
    expect(result.factionKeyword).toBe('CHAOS DAEMONS')
  })

  it('extracts detachment including parenthetical suffix', () => {
    const result = parseGwText(NR_SAMPLE)
    // Raw value is preserved as-is (stripping happens only during matching in buildRoster)
    expect(result.detachment).toBe('Daemonic Incursion (Warp Rifts)')
  })

  it('extracts totalPoints from + TOTAL ARMY POINTS: line', () => {
    const result = parseGwText(NR_SAMPLE)
    expect(result.totalPoints).toBe(1000)
  })

  it('parses at least one unit', () => {
    const result = parseGwText(NR_SAMPLE)
    expect(result.units.length).toBeGreaterThanOrEqual(1)
    expect(result.units.map(u => u.name)).toContain('Bloodthirster')
  })

  it('does not include control lines as units', () => {
    const result = parseGwText(NR_SAMPLE)
    const names = result.units.map(u => u.name)
    expect(names).not.toContain('FACTION KEYWORD: CHAOS DAEMONS')
    expect(names).not.toContain('DETACHMENT: Daemonic Incursion (Warp Rifts)')
    expect(names).not.toContain('TOTAL ARMY POINTS: 1000pts')
  })

  it('handles the trailing + being absent on control lines', () => {
    const withoutTrailingPlus = `
+ FACTION KEYWORD: CHAOS DAEMONS
+ DETACHMENT: Daemonic Incursion (Warp Rifts)
+ TOTAL ARMY POINTS: 500pts

Bloodthirster (300 pts)
`.trim()
    const result = parseGwText(withoutTrailingPlus)
    expect(result.factionKeyword).toBe('CHAOS DAEMONS')
    expect(result.detachment).toBe('Daemonic Incursion (Warp Rifts)')
    expect(result.totalPoints).toBe(500)
  })
})
