import { describe, it, expect } from 'vitest'
import { buildIndex } from '../resolve'
import { deriveFactionKeywords, type ChainEntry } from '../keywords'
import type { Catalogue, SelectionEntry } from '../../parsers/bsdata'

/**
 * Minimal helper that builds a fake BSData SelectionEntry that looks like a
 * fieldable unit datasheet. `enumerateUnits` requires:
 *   - a Unit stat profile (typeName === "Unit") so `hasUnitProfile` returns true
 *   - a `categoryLinks` block for keywords
 */
function makeUnit(id: string, name: string, factionKws: string[]): SelectionEntry {
  return {
    id,
    name,
    type: 'unit',
    profiles: {
      profile: [
        {
          id: `${id}-stat`,
          name,
          typeId: 'unit-type',
          typeName: 'Unit',
          characteristics: { characteristic: [] },
        },
      ],
    },
    categoryLinks: {
      categoryLink: factionKws.map((kw, i) => ({
        id: `${id}-cat-${i}`,
        name: kw,
        targetId: `target-${kw}`,
      })),
    },
  } as SelectionEntry
}

/**
 * Build a minimal Catalogue object containing the supplied unit entries as
 * top-level `selectionEntries`. Only the fields that `enumerateUnits` and
 * `buildIndex` inspect are populated; everything else is the minimal valid shape.
 */
function makeCatalogue(id: string, name: string, units: SelectionEntry[]): Catalogue {
  return {
    id,
    name,
    gameSystemId: 'gst-id',
    revision: '1',
    selectionEntries: { selectionEntry: units },
  }
}

/** Build a ChainEntry marked as enumerable (roots should be offered as datasheets). */
function chainEntry(catalogue: Catalogue, enumerateRoots = true): ChainEntry {
  return { catalogue, enumerateRoots }
}

// ---------------------------------------------------------------------------

describe('deriveFactionKeywords', () => {
  it('single-match: returns native keywords from the best-matching catalogue', () => {
    // "necrons" slug → 1 slug word → "Necrons" catalogue scores 1; the ally "Space Marines"
    // catalogue scores 0.  Only Necron units are native.
    const nativeUnits = [
      makeUnit('u1', 'Necron Warriors', ['Faction: Necrons', 'Infantry']),
      makeUnit('u2', 'Overlord',        ['Faction: Necrons', 'Character']),
    ]
    const allyUnits = [
      makeUnit('u3', 'Tactical Squad',  ['Faction: Adeptus Astartes', 'Infantry']),
    ]
    const nativeCat = makeCatalogue('cat-necrons', 'Necrons', nativeUnits)
    const allyCat   = makeCatalogue('cat-sm',      'Space Marines', allyUnits)

    const chain = [chainEntry(nativeCat), chainEntry(allyCat)]
    const index = buildIndex([nativeCat, allyCat])
    const allUnits = [...nativeUnits, ...allyUnits]
      .map(e => ({ bsId: e.id, name: e.name, keywords: (e.categoryLinks?.categoryLink ?? []).map(c => c.name), weapons: [], abilities: [], rules: [], unitRules: [] }))

    const result = deriveFactionKeywords(chain, allUnits, 'necrons', index)

    expect(result).toContain('Faction: Necrons')
    expect(result).not.toContain('Faction: Adeptus Astartes')
  })

  it('tie-break by unit count: higher-unit catalogue wins when scores are equal', () => {
    // Two enumerable catalogues both score 1 for slug "daemons":
    //   "Chaos - Chaos Daemons" (primary, 1 unit)  vs  "Chaos - Daemons Library" (3 units)
    // The library should win the tie-break because it has more units.
    const primaryUnits = [
      makeUnit('p1', 'Chaos Spawn', ['Faction: Heretic Astartes', 'Chaos']),
    ]
    const libraryUnits = [
      makeUnit('l1', 'Bloodletter',     ['Faction: Legiones Daemonica', 'Infantry']),
      makeUnit('l2', 'Plaguebearer',    ['Faction: Legiones Daemonica', 'Infantry']),
      makeUnit('l3', 'Bloodthirster',   ['Faction: Legiones Daemonica', 'Monster']),
    ]
    const primaryCat = makeCatalogue('cat-primary', 'Chaos - Chaos Daemons', primaryUnits)
    const libraryCat = makeCatalogue('cat-library', 'Chaos - Daemons Library', libraryUnits)

    const chain = [chainEntry(primaryCat), chainEntry(libraryCat)]
    const index = buildIndex([primaryCat, libraryCat])
    const allUnits = [...primaryUnits, ...libraryUnits]
      .map(e => ({ bsId: e.id, name: e.name, keywords: (e.categoryLinks?.categoryLink ?? []).map(c => c.name), weapons: [], abilities: [], rules: [], unitRules: [] }))

    const result = deriveFactionKeywords(chain, allUnits, 'chaos-daemons', index)

    // The library wins — "Legiones Daemonica" is native, not "Heretic Astartes".
    expect(result).toContain('Faction: Legiones Daemonica')
    expect(result).not.toContain('Faction: Heretic Astartes')
  })

  it('sub-keyword inclusion: adds a co-occurring keyword shared by all native units', () => {
    // Every Blood Angels unit carries both "Faction: Adeptus Astartes" AND
    // "Faction: Blood Angels".  Pass 1 picks up "Adeptus Astartes"; pass 2 should
    // add "Blood Angels" because all its carriers are native.
    const nativeUnits = [
      makeUnit('ba1', 'Mephiston',      ['Faction: Adeptus Astartes', 'Faction: Blood Angels', 'Character']),
      makeUnit('ba2', 'Death Company',  ['Faction: Adeptus Astartes', 'Faction: Blood Angels', 'Infantry']),
    ]
    const cat = makeCatalogue('cat-ba', 'Blood Angels', nativeUnits)

    const chain = [chainEntry(cat)]
    const index = buildIndex([cat])
    const allUnits = nativeUnits.map(e => ({
      bsId: e.id, name: e.name,
      keywords: (e.categoryLinks?.categoryLink ?? []).map(c => c.name),
      weapons: [], abilities: [], rules: [], unitRules: [],
    }))

    const result = deriveFactionKeywords(chain, allUnits, 'blood-angels', index)

    expect(result).toContain('Faction: Adeptus Astartes')
    expect(result).toContain('Faction: Blood Angels')
  })

  it('sub-keyword exclusion: does not add a keyword carried by non-native (ally) units', () => {
    // A Chaos Space Marines chain imports "Chaos - Daemons Library".
    // "Faction: Legiones Daemonica" appears on non-native (ally) units, so it must
    // NOT be added even if it co-occurs with some CSM units.
    const nativeUnits = [
      makeUnit('csm1', 'Chaos Lord', ['Faction: Heretic Astartes', 'Character']),
      makeUnit('csm2', 'Chaos Space Marines', ['Faction: Heretic Astartes', 'Infantry']),
    ]
    const allyUnits = [
      makeUnit('d1', 'Bloodletter',  ['Faction: Legiones Daemonica', 'Infantry']),
      makeUnit('d2', 'Plaguebearer', ['Faction: Legiones Daemonica', 'Infantry']),
    ]
    const nativeCat = makeCatalogue('cat-csm', 'Chaos - Chaos Space Marines', nativeUnits)
    const allyCat   = makeCatalogue('cat-dae', 'Chaos - Daemons Library', allyUnits)

    // allyCat is NOT enumerable in the CSM chain (importRootEntries=false for the ally).
    const chain = [chainEntry(nativeCat, true), chainEntry(allyCat, false)]
    const index = buildIndex([nativeCat, allyCat])
    const allUnits = [...nativeUnits, ...allyUnits].map(e => ({
      bsId: e.id, name: e.name,
      keywords: (e.categoryLinks?.categoryLink ?? []).map(c => c.name),
      weapons: [], abilities: [], rules: [], unitRules: [],
    }))

    const result = deriveFactionKeywords(chain, allUnits, 'chaos-space-marines', index)

    expect(result).toContain('Faction: Heretic Astartes')
    // "Legiones Daemonica" must be excluded — ally units carry it, not native ones.
    expect(result).not.toContain('Faction: Legiones Daemonica')
  })
})
