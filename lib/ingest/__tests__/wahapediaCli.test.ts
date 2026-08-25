import { describe, it, expect } from 'vitest'
import { mergeStratagems, tokensCompatible } from '../wahapediaCli'
import type { FactionArtifact } from '../../dataModel'
import type { DetachmentEnhancementKinds, DetachmentStratagems } from '../wahapedia'

// ── tokensCompatible ──────────────────────────────────────────────────────────

describe('tokensCompatible', () => {
  // Inverted-order qualifier across sources — the Agents-of-Imperium case that
  // motivated the fallback. Real BSData detachment name on one side, real
  // Wahapedia page heading on the other.
  it('matches inverted-order qualifiers (BSData vs Wahapedia)', () => {
    expect(tokensCompatible('Alien Hunters (Ordo Xenos)', 'Ordo Xenos Alien Hunters')).toBe(true)
    expect(tokensCompatible('Purgation Force (Ordo Hereticus)', 'Ordo Hereticus Purgation Force')).toBe(true)
    expect(tokensCompatible('Daemon Hunters (Ordo Malleus)', 'Ordo Malleus Daemon Hunters')).toBe(true)
  })

  it('matches when one name is a strict superset of the other', () => {
    expect(tokensCompatible('Hallowed Martyrs', 'Hallowed Martyrs of the Convent')).toBe(true)
  })

  it('rejects unrelated names with no shared tokens', () => {
    expect(tokensCompatible('Hallowed Martyrs', 'Pious Protectors')).toBe(false)
  })

  it('rejects 1-token matches to avoid false positives', () => {
    // "Hunters" alone shouldn't pair with "Alien Hunters" — the smaller side
    // needs ≥ 2 tokens for the fallback to engage.
    expect(tokensCompatible('Hunters', 'Alien Hunters')).toBe(false)
  })

  it('is case- and punctuation-insensitive', () => {
    expect(tokensCompatible("Huron's Marauders", 'huron marauders')).toBe(true)
  })
})

// ── mergeStratagems ───────────────────────────────────────────────────────────

/** Minimal artifact fixture covering only the fields `mergeStratagems` touches. */
function makeArtifact(detachments: FactionArtifact['detachments']): FactionArtifact {
  return {
    schemaVersion: 3,
    factionId: 'test-faction',
    factionName: 'Test Faction',
    bsCatalogueId: 'test-cat',
    factionKeywords: ['Test'],
    detachments,
    units: [],
    glossary: [],
  }
}

describe('mergeStratagems – token-subset matching fallback', () => {
  // Regression: Agents of Imperium's ordo detachments. BSData stores
  // "Alien Hunters (Ordo Xenos)", Wahapedia's stratagem groups use "Alien Hunters"
  // (stripQualifier match), but the page heading inverts to "Ordo Xenos Alien
  // Hunters" — no exact or stripQualifier match. Token-subset bridges them so
  // both the stratagems and any Upgrade flag land on the same detachment.
  it('routes stratagem groups with inverted-order qualifiers to the real BSData detachment', () => {
    const artifact = makeArtifact([
      {
        id: 'det-alien',
        name: 'Alien Hunters (Ordo Xenos)',
        rules: [{ id: 'rule-1', name: 'Some Rule', timing: '', effect: '...', source: 'Test' }],
        stratagems: [],
        enhancements: [{ name: 'Enh A', timing: '', effect: '', source: 'Test' }],
      },
    ])
    const stratagemGroups: DetachmentStratagems[] = [
      {
        name: 'Alien Hunters',
        stratagems: [{ name: 'Strat A', timing: '', cp: 1, effect: '', source: 'Test' }],
      },
    ]
    const realDetachmentNames = new Set(['Ordo Xenos Alien Hunters'])
    const enhancementKindGroups: DetachmentEnhancementKinds[] = [
      { name: 'Ordo Xenos Alien Hunters', upgradeNames: ['Enh A'] },
    ]

    mergeStratagems(artifact, stratagemGroups, realDetachmentNames, enhancementKindGroups, /* allowSynthesis */ true)

    expect(artifact.detachments).toHaveLength(1)
    expect(artifact.detachments[0].stratagems).toHaveLength(1)
    expect(artifact.detachments[0].enhancements?.[0].kind).toBe('upgrade')
  })
})

describe('mergeStratagems – synthesis gating', () => {
  // Stratagem groups whose name carries no Detachment Points badge (the structural
  // signal for a real 11e detachment) are alt-game-mode listings (Boarding Action,
  // Crusade, …) and must not be synthesized as shells.
  it('does not synthesize a stratagem-only group with no matching real-detachment name', () => {
    const artifact = makeArtifact([])
    const stratagemGroups: DetachmentStratagems[] = [
      {
        name: 'Boarding Action',
        stratagems: [{ name: 'Boarding Strat', timing: '', cp: 1, effect: '', source: 'Test' }],
      },
    ]
    mergeStratagems(artifact, stratagemGroups, /* no real detachment names */ new Set(), [], true)
    expect(artifact.detachments).toHaveLength(0)
  })

  it('synthesizes a new detachment when its name carries a Detachment Points badge', () => {
    const artifact = makeArtifact([])
    const stratagemGroups: DetachmentStratagems[] = [
      {
        name: 'New Detachment',
        stratagems: [{ name: 'Strat', timing: '', cp: 1, effect: '', source: 'Test' }],
      },
    ]
    mergeStratagems(artifact, stratagemGroups, new Set(['New Detachment']), [], true)
    expect(artifact.detachments).toHaveLength(1)
    expect(artifact.detachments[0].name).toBe('New Detachment')
    expect(artifact.detachments[0].stratagems).toHaveLength(1)
    // Rules stay empty — the BSData ingest will fill them on the next run that
    // includes this detachment.
    expect(artifact.detachments[0].rules).toEqual([])
  })
})

describe('mergeStratagems – enhancement Upgrade-subtype flagging', () => {
  it('flags a matching BSData enhancement without replacing the enhancements array', () => {
    const artifact = makeArtifact([
      {
        id: 'det-1',
        name: 'Awakened Dynasty',
        rules: [{ id: 'rule-1', name: 'R', timing: '', effect: '', source: 'Test' }],
        stratagems: [],
        enhancements: [
          { name: 'Veil of Darkness', timing: '', effect: '', source: 'Test' },
          { name: 'Phasal Subjugator', timing: '', effect: '', source: 'Test' },
        ],
      },
    ])
    const enhancementKindGroups: DetachmentEnhancementKinds[] = [
      // "(Aura)" qualifier mirrors the live Wahapedia/BSData naming mismatch.
      { name: 'Awakened Dynasty', upgradeNames: ['Phasal Subjugator (Aura)'] },
    ]
    mergeStratagems(artifact, [], new Set(), enhancementKindGroups, true)
    const enh = artifact.detachments[0].enhancements!
    expect(enh).toHaveLength(2)
    expect(enh.find((e) => e.name === 'Phasal Subjugator')?.kind).toBe('upgrade')
    expect(enh.find((e) => e.name === 'Veil of Darkness')?.kind).toBeUndefined()
  })

  it('never creates a detachment purely from an enhancement-kind group', () => {
    const artifact = makeArtifact([])
    const enhancementKindGroups: DetachmentEnhancementKinds[] = [
      { name: 'Unknown Detachment', upgradeNames: ['Some Enhancement'] },
    ]
    mergeStratagems(artifact, [], new Set(), enhancementKindGroups, true)
    expect(artifact.detachments).toHaveLength(0)
  })
})

describe('mergeStratagems – pre-prune of legacy shells', () => {
  // Rules-empty detachments left over from previous runs are dropped before
  // matching. Without this, the byName index would lock those shells in front
  // of the real BSData detachments and the token-subset fallback would never
  // get a chance to route stratagems to the correct home.
  it('drops rules-empty detachments before indexing', () => {
    const artifact = makeArtifact([
      {
        id: 'det-real',
        name: 'Alien Hunters (Ordo Xenos)',
        rules: [{ id: 'rule-1', name: 'R', timing: '', effect: '', source: 'Test' }],
        stratagems: [],
      },
      {
        // Stale prior-run shell — should be dropped at the start of merge.
        id: 'det-stale',
        name: 'Ordo Xenos Alien Hunters',
        rules: [],
        stratagems: [{ name: 'Old Strat', timing: '', cp: 1, effect: '', source: 'Test' }],
      },
    ])
    mergeStratagems(artifact, [], new Set(), [], true)
    expect(artifact.detachments).toHaveLength(1)
    expect(artifact.detachments[0].name).toBe('Alien Hunters (Ordo Xenos)')
  })
})
