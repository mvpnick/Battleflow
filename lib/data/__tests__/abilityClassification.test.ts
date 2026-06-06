import { describe, it, expect } from 'vitest'
import { FactionArtifactSchema } from '../../ingest/normalize'
import type { FactionArtifact, PreparedUnit } from '../../dataModel'

import daemonsRaw from '../../../public/data/factions/chaos-daemons.json'
import tsonsRaw from '../../../public/data/factions/thousand-sons.json'
import necronsRaw from '../../../public/data/factions/necrons.json'
import csmRaw from '../../../public/data/factions/chaos-space-marines.json'

/**
 * Classification guard for the four reference units that drove the structured-abilities
 * work (schema v2). These read the *committed* artifacts, so a regression in the ingest
 * classifier — a Core ability mis-tagged, the army rule leaking back onto the unit, a
 * themed group lost, or the Damaged profile no longer separated — fails CI.
 */

function unit(raw: unknown, match: RegExp): PreparedUnit {
  const artifact = FactionArtifactSchema.parse(raw) as FactionArtifact
  const u = artifact.units.find((x) => match.test(x.name))
  if (!u) throw new Error(`No unit matching ${match} in ${artifact.factionId}`)
  return u
}

const names = (u: PreparedUnit, category: string) =>
  u.abilities.filter((a) => a.category === category).map((a) => a.name)

describe('Be’lakor (Chaos Daemons)', () => {
  const u = unit(daemonsRaw, /^Be.?lakor$/)

  it('tags GST-defined abilities as Core', () => {
    expect(names(u, 'core')).toEqual(expect.arrayContaining(['Deep Strike', 'Stealth']))
  })

  it('classifies the army rule as faction (and keeps it off the datasheet stream)', () => {
    expect(names(u, 'faction')).toContain('The Shadow of Chaos')
    expect(names(u, 'datasheet')).not.toContain('The Shadow of Chaos')
  })

  it('preserves the "Shadow Form" themed group with its parent blurb (stored once)', () => {
    const grouped = u.abilities.filter((a) => a.group === 'Shadow Form')
    expect(grouped.length).toBeGreaterThanOrEqual(3)
    expect(grouped.every((a) => a.category === 'datasheet')).toBe(true)
    // The blurb rides on the group's first child only — not repeated on every member.
    expect(grouped.filter((a) => a.groupBlurb !== undefined)).toHaveLength(1)
    expect(grouped[0].groupBlurb).toBeTruthy()
  })

  it('separates the Damaged profile out of the ability stream', () => {
    expect(u.damaged?.name).toMatch(/^Damaged:/)
    expect(u.abilities.some((a) => /^Damaged:/.test(a.name))).toBe(false)
  })
})

describe('Magnus the Red (Thousand Sons)', () => {
  const u = unit(tsonsRaw, /^Magnus the Red$/)

  it('classifies the army rule as faction', () => {
    expect(names(u, 'faction')).toContain('Cabal of Sorcerers')
  })

  it('preserves the "Crimson King" themed group (no parent blurb exists)', () => {
    const grouped = u.abilities.filter((a) => a.group === 'Crimson King')
    expect(grouped.length).toBeGreaterThanOrEqual(3)
    expect(grouped.every((a) => a.groupBlurb === undefined)).toBe(true)
  })

  it('separates the Damaged profile', () => {
    expect(u.damaged?.name).toMatch(/^Damaged:/)
  })
})

describe('The Silent King (Necrons)', () => {
  const u = unit(necronsRaw, /^The Silent King$/)

  it('classifies Reanimation Protocols as the faction rule', () => {
    expect(names(u, 'faction')).toContain('Reanimation Protocols')
  })

  it('preserves the "Triarch Abilities" themed group', () => {
    const grouped = u.abilities.filter((a) => a.group === 'Triarch Abilities')
    expect(grouped.length).toBeGreaterThanOrEqual(3)
  })

  it('separates the Damaged profile', () => {
    expect(u.damaged?.name).toMatch(/^Damaged:/)
  })
})

describe('Cultist Firebrand (Chaos Space Marines)', () => {
  const u = unit(csmRaw, /^Cultist Firebrand$/)

  it('tags Leader as Core and Dark Pacts as faction', () => {
    expect(names(u, 'core')).toContain('Leader')
    expect(names(u, 'faction')).toContain('Dark Pacts')
  })

  it('has no themed groups and no Damaged profile (a simple unit)', () => {
    expect(u.abilities.every((a) => a.group === undefined)).toBe(true)
    expect(u.damaged).toBeUndefined()
  })
})
