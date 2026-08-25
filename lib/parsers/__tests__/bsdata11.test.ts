import { describe, it, expect } from 'vitest'
import { parseBsJson, parseCatalogue11, parseGameSystem11 } from '../bsdata11'

describe('parseBsJson', () => {
  it('wraps bare-array containers into the { tag: [...] } shape bsdata.ts expects', () => {
    const root = parseBsJson({
      catalogue: {
        id: 'cat-1',
        name: 'Necrons',
        selectionEntries: [
          {
            id: 'se-1',
            name: 'Veil of Darkness',
            type: 'upgrade',
            profiles: [
              {
                id: 'p-1',
                name: 'Veil of Darkness',
                typeId: 't-1',
                typeName: 'Abilities',
                hidden: false,
                characteristics: [
                  { name: 'Description', typeId: 'c-1', $text: 'Deep strike back in.' },
                ],
              },
            ],
            costs: [{ name: 'pts', typeId: 'pts-1', value: 20 }],
          },
        ],
      },
    })

    const entry = root.catalogue?.selectionEntries?.selectionEntry?.[0]
    expect(entry?.id).toBe('se-1')

    const profile = entry?.profiles?.profile?.[0]
    expect(profile?.hidden).toBe('false')

    const characteristic = profile?.characteristics?.characteristic?.[0]
    expect(characteristic?.['#text']).toBe('Deep strike back in.')
    expect((characteristic as unknown as { $text?: string }).$text).toBeUndefined()

    const cost = entry?.costs?.cost?.[0]
    expect(cost?.value).toBe('20')
  })

  it('recurses into nested selectionEntries/selectionEntryGroups', () => {
    const root = parseBsJson({
      catalogue: {
        id: 'cat-1',
        name: 'Necrons',
        sharedSelectionEntryGroups: [
          {
            id: 'seg-1',
            name: 'Force Disposition',
            selectionEntries: [
              { id: 'se-a', name: 'Disruption', type: 'upgrade', hidden: false },
              { id: 'se-b', name: 'Reconnaissance', type: 'upgrade', hidden: true },
            ],
          },
        ],
      },
    })

    const group = root.catalogue?.sharedSelectionEntryGroups?.selectionEntryGroup?.[0]
    const nested = group?.selectionEntries?.selectionEntry
    expect(nested).toHaveLength(2)
    expect(nested?.[0].hidden).toBe('false')
    expect(nested?.[1].hidden).toBe('true')
  })

  it('coerces booleans on selectionEntry import/entryLink primary, and numbers on revision', () => {
    const root = parseBsJson({
      catalogue: {
        id: 'cat-1',
        name: 'Necrons',
        revision: 16,
        gameSystemRevision: 1,
        selectionEntries: [
          { id: 'se-1', name: 'Destroyer Cult', type: 'upgrade', import: true },
        ],
        entryLinks: [
          { id: 'el-1', name: 'Destroyer Cult', type: 'selectionEntry', targetId: 't-1', primary: false },
        ],
      },
    })

    expect(root.catalogue?.revision).toBe('16')
    const selectionEntry = root.catalogue?.selectionEntries?.selectionEntry?.[0]
    expect(selectionEntry?.import).toBe('true')
    const entryLink = root.catalogue?.entryLinks?.entryLink?.[0]
    expect((entryLink as unknown as { primary?: string }).primary).toBe('false')
  })

  it('leaves unmapped structural count fields (min/max/sortIndex) as numbers', () => {
    const root = parseBsJson({
      catalogue: {
        id: 'cat-1',
        name: 'Necrons',
        selectionEntries: [
          {
            id: 'se-1',
            name: 'Awakened Dynasty',
            type: 'upgrade',
            sortIndex: 8,
            constraints: [{ type: 'max', value: 1, field: 'selections', scope: 'roster' }],
          },
        ],
      },
    })

    const entry = root.catalogue?.selectionEntries?.selectionEntry?.[0] as unknown as {
      sortIndex: number
    }
    expect(entry.sortIndex).toBe(8)
    // `value` inside a constraint is still coerced (global rule keyed on the "value" key name,
    // not on which structural container it lives in) — constraints aren't consumed downstream
    // today, so this is inert either way.
  })
})

describe('parseCatalogue11 / parseGameSystem11', () => {
  it('extracts the catalogue/gameSystem root and throws when absent', () => {
    const catalogue = parseCatalogue11({ catalogue: { id: 'cat-1', name: 'Necrons' } })
    expect(catalogue.id).toBe('cat-1')

    const gameSystem = parseGameSystem11({ gameSystem: { id: 'gst-1', name: 'Warhammer 40,000' } })
    expect(gameSystem.id).toBe('gst-1')

    expect(() => parseCatalogue11({ gameSystem: {} })).toThrow()
    expect(() => parseGameSystem11({ catalogue: {} })).toThrow()
  })
})
