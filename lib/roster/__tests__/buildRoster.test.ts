import { describe, it, expect } from 'vitest'
import { buildRoster } from '../buildRoster'
import type { FactionArtifact } from '../../dataModel'
import type { ParsedArmy } from '../parseGwText'

/** Minimal artifact fixture — only the fields buildRoster touches. */
function makeArtifact(overrides: Partial<FactionArtifact> = {}): FactionArtifact {
  return {
    schemaVersion: 1,
    factionId: 'chaos-daemons',
    factionName: 'Chaos Daemons',
    bsCatalogueId: 'test-cat-id',
    factionKeywords: ['Chaos Daemons', 'Chaos'],
    detachments: [
      {
        id: 'det-incursion',
        name: 'Daemonic Incursion',
        rules: [],
        stratagems: [
          { name: 'Blood Tithe', timing: 'Any phase', cp: 1, effect: 'Do stuff.', source: 'Chaos Daemons' },
        ],
      },
    ],
    units: [
      {
        id: 'unit-bloodthirster',
        bsId: 'bs-bt',
        name: 'Bloodthirster',
        role: 'lord of war',
        models: 1,
        stats: { M: '12"', T: '9', SV: '2+', W: '18', LD: '6+', OC: '5' },
        hot: [],
        weapons: [
          { name: 'Great axe of Khorne', kind: 'melee', stats: { A: 'D6+3', WS: '2+', S: '14', AP: '-3', D: 'D6+3' }, tags: [], mods: [] },
        ],
        abilities: [],
        stratagems: [],
        reminders: [],
        tags: [],
        keywords: ['Chaos Daemons'],
        ruleRefs: [],
      },
    ],
    glossary: [],
    ...overrides,
  }
}

// ── Detachment matching ───────────────────────────────────────────────────────

describe('buildRoster – detachment matching', () => {
  const artifact = makeArtifact()

  it('resolves stratagems via exact detachment name match', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      totalPoints: 300,
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: [] }],
    }
    const { meta } = buildRoster(parsed, artifact)
    expect(meta.stratagems).toBeDefined()
    expect(meta.stratagems!.map(s => s.name)).toContain('Blood Tithe')
  })

  it('resolves stratagems when detachment has a parenthetical suffix', () => {
    // New Recruit exports "Daemonic Incursion (Warp Rifts)" but artifact stores "Daemonic Incursion"
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion (Warp Rifts)',
      totalPoints: 300,
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: [] }],
    }
    const { meta } = buildRoster(parsed, artifact)
    expect(meta.stratagems).toBeDefined()
    expect(meta.stratagems!.map(s => s.name)).toContain('Blood Tithe')
  })

  it('returns no stratagems when detachment does not match', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Unknown Detachment',
      totalPoints: 300,
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: [] }],
    }
    const { meta } = buildRoster(parsed, artifact)
    expect(meta.stratagems).toBeUndefined()
  })
})

// ── Unit building ─────────────────────────────────────────────────────────────

describe('buildRoster – unit matching', () => {
  const artifact = makeArtifact()

  it('matches a unit by normalized name', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Bloodthirster', wargear: ['Great axe of Khorne'], enhancements: [] }],
    }
    const { roster } = buildRoster(parsed, artifact)
    // Bloodthirster has a melee weapon so it appears in the fight phase
    expect(roster.fight?.map(u => u.name)).toContain('Bloodthirster')
  })

  it('silently drops unrecognized unit names', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Nonexistent Unit', wargear: [], enhancements: [] }],
    }
    const { roster } = buildRoster(parsed, artifact)
    const allNames = Object.values(roster).flat().map(u => u.name)
    expect(allNames).not.toContain('Nonexistent Unit')
  })
})
