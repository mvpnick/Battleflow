import { describe, it, expect } from 'vitest'
import { toRoster } from '../adapter'
import { FactionArtifactSchema } from '../../ingest/normalize'

// These fixtures are the committed ingest artifacts — a failure here means
// the ingest regressed and dropped a unit that must always be present.

import dwArtifactRaw from '../../../public/data/factions/deathwatch.json'
import csmArtifactRaw from '../../../public/data/factions/chaos-space-marines.json'
import ironHandsArtifactRaw from '../../../public/data/factions/iron-hands.json'

describe('Deathwatch artifact', () => {
  const artifact = FactionArtifactSchema.parse(dwArtifactRaw)

  it('contains Deathwatch Terminator Squad', () => {
    const names = artifact.units.map((u) => u.name)
    expect(names).toContain('Deathwatch Terminator Squad')
  })

  it('surfaces Deathwatch Terminator Squad in every roster phase', () => {
    const roster = toRoster(artifact)
    for (const phase of Object.values(roster)) {
      const names = phase.map((u) => u.name)
      expect(names).toContain('Deathwatch Terminator Squad')
    }
  })
})

describe('Chaos Space Marines artifact', () => {
  const artifact = FactionArtifactSchema.parse(csmArtifactRaw)

  it('contains Fabius Bile', () => {
    const names = artifact.units.map((u) => u.name)
    expect(names).toContain('Fabius Bile')
  })

  it('surfaces Fabius Bile in every roster phase', () => {
    const roster = toRoster(artifact)
    for (const phase of Object.values(roster)) {
      const names = phase.map((u) => u.name)
      expect(names).toContain('Fabius Bile')
    }
  })
})

describe('Iron Hands artifact', () => {
  const artifact = FactionArtifactSchema.parse(ironHandsArtifactRaw)

  // Chapter factions should include the full generic Space Marines pool, not just
  // the handful of chapter-specific characters. If this drops below ~100 it means
  // the ingest reverted to catalogue-membership filtering instead of keyword filtering.
  it('includes the generic Space Marines pool (>100 units)', () => {
    expect(artifact.units.length).toBeGreaterThan(100)
  })

  it('contains Iron Father Feirros', () => {
    const names = artifact.units.map((u) => u.name)
    expect(names).toContain('Iron Father Feirros')
  })
})
