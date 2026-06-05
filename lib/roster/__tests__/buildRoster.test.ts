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

// ── Army & detachment rules in meta ───────────────────────────────────────────

describe('buildRoster – army & detachment rules', () => {
  // Artifact with a flagged army rule in the glossary and a detachment carrying rules.
  const artifact = makeArtifact({
    glossary: [
      { id: 'g-army', name: 'The Shadow of Chaos', timing: '', effect: 'Army-wide effect.', source: 'Chaos Daemons', armyRule: true },
      { id: 'g-other', name: 'Feel No Pain', timing: '', effect: 'Some keyword.', source: 'Chaos Daemons' },
    ],
    detachments: [
      {
        id: 'det-incursion',
        name: 'Daemonic Incursion',
        rules: [
          { id: 'd-rule', name: 'Daemonic Pact', timing: '', effect: 'Detachment effect.', source: 'Daemonic Incursion' },
        ],
        stratagems: [
          { name: 'Blood Tithe', timing: 'Any phase', cp: 1, effect: 'Do stuff.', source: 'Chaos Daemons' },
        ],
      },
    ],
  })

  it('surfaces only glossary entries flagged as army rules', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: [] }],
    }
    const { meta } = buildRoster(parsed, artifact)
    expect(meta.armyRules.map(r => r.name)).toEqual(['The Shadow of Chaos'])
  })

  it('exposes the matched detachment rules and sets detachmentMatched', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: [] }],
    }
    const { meta } = buildRoster(parsed, artifact)
    expect(meta.detachmentMatched).toBe(true)
    expect(meta.detachmentRules.map(r => r.name)).toEqual(['Daemonic Pact'])
  })

  it('keeps army rules but empties detachment rules when no detachment matches', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Unknown Detachment',
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: [] }],
    }
    const { meta } = buildRoster(parsed, artifact)
    expect(meta.detachmentMatched).toBe(false)
    expect(meta.detachmentRules).toEqual([])
    // Army rules are independent of detachment matching.
    expect(meta.armyRules.map(r => r.name)).toEqual(['The Shadow of Chaos'])
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

  it('matches a faction-prefixed unit when the export omits the prefix', () => {
    // BattleBase exports "Sorcerer"; BSData stores "Thousand Sons Sorcerer"
    const artifact = makeArtifact({
      units: [
        {
          id: 'unit-sorcerer',
          bsId: 'bs-sorc',
          name: 'Thousand Sons Sorcerer',
          role: 'character',
          models: 1,
          stats: { M: '6"', T: '4', SV: '3+', W: '4', LD: '6+', OC: '1' },
          hot: [],
          weapons: [
            { name: 'Force weapon', kind: 'melee', stats: { A: '3', WS: '3+', S: '6', AP: '-1', D: 'D3' }, tags: [], mods: [] },
          ],
          abilities: [],
          stratagems: [],
          reminders: [],
          tags: [],
          keywords: ['Thousand Sons'],
          ruleRefs: [],
        },
      ],
    })
    const parsed: ParsedArmy = {
      factionKeyword: 'Thousand Sons',
      detachment: 'Grand Coven',
      units: [{ name: 'Sorcerer', wargear: [], enhancements: [] }],
    }
    const { roster } = buildRoster(parsed, artifact)
    const allNames = Object.values(roster).flat().map(u => u.name)
    expect(allNames).toContain('Thousand Sons Sorcerer')
  })

  it('matches a unit when the export uses a different faction prefix', () => {
    // BattleBase exports "Chaos Rhino"; BSData stores "Thousand Sons Rhino"
    const artifact = makeArtifact({
      units: [
        {
          id: 'unit-rhino',
          bsId: 'bs-rhino',
          name: 'Thousand Sons Rhino',
          role: 'dedicated transport',
          models: 1,
          stats: { M: '12"', T: '9', SV: '3+', W: '10', LD: '6+', OC: '2' },
          hot: [],
          weapons: [
            { name: 'Combi-bolter', kind: 'ranged', stats: { A: '2', BS: '3+', S: '4', AP: '0', D: '1' }, tags: [], mods: [] },
          ],
          abilities: [],
          stratagems: [],
          reminders: [],
          tags: [],
          keywords: ['Thousand Sons'],
          ruleRefs: [],
        },
      ],
    })
    const parsed: ParsedArmy = {
      factionKeyword: 'Thousand Sons',
      detachment: 'Grand Coven',
      units: [{ name: 'Chaos Rhino', wargear: [], enhancements: [] }],
    }
    const { roster } = buildRoster(parsed, artifact)
    const allNames = Object.values(roster).flat().map(u => u.name)
    expect(allNames).toContain('Thousand Sons Rhino')
  })

  it('matches the faction-prefixed unit when a same-suffix unit also exists', () => {
    // "Sorcerer" should match "Thousand Sons Sorcerer", not "Exalted Sorcerer",
    // even though both end with " sorcerer".  The tie-break is prefix frequency:
    // "Thousand Sons" appears as a prefix for many units; "Exalted" appears for few.
    const artifact = makeArtifact({
      units: [
        {
          id: 'unit-sorc',
          bsId: 'bs-sorc',
          name: 'Thousand Sons Sorcerer',
          role: 'character',
          models: 1,
          stats: { M: '6"', T: '4', SV: '3+', W: '4', LD: '6+', OC: '1' },
          hot: [],
          weapons: [
            { name: 'Force weapon', kind: 'melee', stats: { A: '3', WS: '3+', S: '6', AP: '-1', D: 'D3' }, tags: [], mods: [] },
          ],
          abilities: [], stratagems: [], reminders: [], tags: [], keywords: [], ruleRefs: [],
        },
        {
          id: 'unit-exalted',
          bsId: 'bs-exalted',
          name: 'Exalted Sorcerer',
          role: 'character',
          models: 1,
          stats: { M: '6"', T: '4', SV: '3+', W: '5', LD: '6+', OC: '1' },
          hot: [],
          weapons: [
            { name: 'Force weapon', kind: 'melee', stats: { A: '4', WS: '3+', S: '6', AP: '-1', D: 'D3' }, tags: [], mods: [] },
          ],
          abilities: [], stratagems: [], reminders: [], tags: [], keywords: [], ruleRefs: [],
        },
        // Extra "Thousand Sons" prefixed units to make the prefix frequency unambiguous.
        {
          id: 'unit-rhino',
          bsId: 'bs-rhino',
          name: 'Thousand Sons Rhino',
          role: 'dedicated transport',
          models: 1,
          stats: { M: '12"', T: '9', SV: '3+', W: '10', LD: '6+', OC: '2' },
          hot: [],
          weapons: [
            { name: 'Combi-bolter', kind: 'ranged', stats: { A: '2', BS: '3+', S: '4', AP: '0', D: '1' }, tags: [], mods: [] },
          ],
          abilities: [], stratagems: [], reminders: [], tags: [], keywords: [], ruleRefs: [],
        },
      ],
    })
    const parsed: ParsedArmy = {
      factionKeyword: 'Thousand Sons',
      detachment: 'Grand Coven',
      units: [{ name: 'Sorcerer', wargear: [], enhancements: [] }],
    }
    const { roster } = buildRoster(parsed, artifact)
    const allNames = [...new Set(Object.values(roster).flat().map(u => u.name))]
    expect(allNames).toContain('Thousand Sons Sorcerer')
    expect(allNames).not.toContain('Exalted Sorcerer')
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

// ── Enhancement resolution ────────────────────────────────────────────────────

describe('buildRoster – enhancement resolution', () => {
  function makeArtifactWithEnhancements(): FactionArtifact {
    return {
      schemaVersion: 1,
      factionId: 'chaos-daemons',
      factionName: 'Chaos Daemons',
      bsCatalogueId: 'test-cat-id',
      factionKeywords: ['Chaos Daemons'],
      detachments: [
        {
          id: 'det-incursion',
          name: 'Daemonic Incursion',
          rules: [],
          stratagems: [],
          enhancements: [
            { name: 'The Everstave', timing: '', effect: 'TZEENTCH only. +1 Strength.', source: 'Chaos Daemons' },
          ],
        },
      ],
      units: [
        {
          id: 'unit-lord',
          bsId: 'bs-loc',
          name: 'Lord of Change',
          role: 'character',
          models: 1,
          stats: { M: '12"', T: '11', SV: '4+', W: '18', LD: '6+', OC: '0' },
          hot: [],
          weapons: [
            { name: 'Daemonic Claws', kind: 'melee', stats: { A: '6', WS: '2+', S: '7', AP: '-2', D: '3' }, tags: [], mods: [] },
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
    }
  }

  it('resolves a known enhancement to a Rule on unit.enhancements', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Lord of Change', wargear: [], enhancements: ['The Everstave'] }],
    }
    const { roster } = buildRoster(parsed, makeArtifactWithEnhancements())
    const unit = roster.fight![0]
    expect(unit.enhancements).toHaveLength(1)
    expect(unit.enhancements[0].name).toBe('The Everstave')
    expect(unit.enhancements[0].effect).toContain('TZEENTCH')
    // Resolved enhancement should NOT also appear in hot[].
    expect(unit.hot).not.toContain('The Everstave')
  })

  it('falls back to a hot chip for an unknown enhancement name', () => {
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Lord of Change', wargear: [], enhancements: ['Unknown Relic'] }],
    }
    const { roster } = buildRoster(parsed, makeArtifactWithEnhancements())
    const unit = roster.fight![0]
    expect(unit.enhancements).toHaveLength(0)
    expect(unit.hot).toContain('Unknown Relic')
  })

  // Regression: Wahapedia stores names with the curly apostrophe `’` (e.g.
  // "A’rgath, the King of Blades"), but army-list exports normalize to the
  // ASCII `'`. Without curly-quote folding in `norm()`, the enhancement
  // wouldn't resolve to a Rule and would leak into `hot[]`.
  it('matches enhancements across curly vs straight apostrophes', () => {
    const artifact: FactionArtifact = {
      schemaVersion: 1,
      factionId: 'chaos-daemons',
      factionName: 'Chaos Daemons',
      bsCatalogueId: 'test-cat-id',
      factionKeywords: ['Chaos Daemons'],
      detachments: [
        {
          id: 'det-incursion',
          name: 'Daemonic Incursion',
          rules: [],
          stratagems: [],
          enhancements: [
            // Artifact carries Wahapedia's curly apostrophe.
            { name: 'A’rgath, the King of Blades', timing: '', effect: 'Bonus attacks.', source: 'Chaos Daemons' },
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
    }

    // Army list uses the straight ASCII apostrophe.
    const parsed: ParsedArmy = {
      factionKeyword: 'CHAOS DAEMONS',
      detachment: 'Daemonic Incursion',
      units: [{ name: 'Bloodthirster', wargear: [], enhancements: ["A'rgath, the King of Blades"] }],
    }
    const { roster } = buildRoster(parsed, artifact)
    const unit = roster.fight![0]
    expect(unit.enhancements).toHaveLength(1)
    // The resolved Rule keeps the artifact's curly form (used for chip label).
    expect(unit.enhancements[0].name).toBe('A’rgath, the King of Blades')
    expect(unit.hot).not.toContain("A'rgath, the King of Blades")
    expect(unit.hot).not.toContain('A’rgath, the King of Blades')
  })
})
