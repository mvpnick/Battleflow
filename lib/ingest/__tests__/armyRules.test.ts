import { describe, it, expect } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ARMY_RULES, flagArmyRules } from '../armyRules'
import { norm } from '../../roster/normalize'
import type { FactionArtifact } from '../../schemas'

/**
 * Coverage guard for the curated army-rule allowlist.
 *
 * These tests read the *committed* faction artifacts so a glossary rename or a typo in
 * `ARMY_RULES` fails CI rather than silently shipping a faction with no army rule. They
 * exercise the same `norm`-based matching `flagArmyRules` uses, so the assertions track
 * the real flagging behaviour.
 */

const FACTIONS_DIR = join(process.cwd(), 'public', 'data', 'factions')

async function readArtifact(factionId: string): Promise<FactionArtifact> {
  const raw = await readFile(join(FACTIONS_DIR, `${factionId}.json`), 'utf8')
  return JSON.parse(raw) as FactionArtifact
}

describe('ARMY_RULES allowlist', () => {
  it('keys every allowlisted faction to an existing committed artifact', async () => {
    const files = new Set((await readdir(FACTIONS_DIR)).filter(f => f.endsWith('.json')))
    for (const factionId of Object.keys(ARMY_RULES)) {
      expect(files.has(`${factionId}.json`), `missing artifact for ${factionId}`).toBe(true)
    }
  })

  it('resolves every allowlisted rule name to a glossary entry', async () => {
    for (const [factionId, names] of Object.entries(ARMY_RULES)) {
      const artifact = await readArtifact(factionId)
      const glossaryNames = new Set(artifact.glossary.map(g => norm(g.name)))
      for (const name of names) {
        expect(
          glossaryNames.has(norm(name)),
          `${factionId}: "${name}" not found in glossary`,
        ).toBe(true)
      }
    }
  })

  it('flags at least one glossary entry for every allowlisted faction', async () => {
    for (const factionId of Object.keys(ARMY_RULES)) {
      const artifact = await readArtifact(factionId)
      // Strip any committed flags first so we test flagArmyRules from a clean slate.
      for (const g of artifact.glossary) delete g.armyRule
      flagArmyRules(artifact)
      const flagged = artifact.glossary.filter(g => g.armyRule)
      expect(flagged.length, `${factionId}: no glossary entry flagged`).toBeGreaterThanOrEqual(1)
      // Exactly the allowlisted names get flagged — nothing more.
      expect(flagged.map(g => norm(g.name)).sort()).toEqual(
        ARMY_RULES[factionId].map(norm).sort(),
      )
    }
  })

  it('is a no-op for a faction absent from the allowlist', () => {
    const artifact = {
      factionId: 'not-a-real-faction',
      glossary: [{ id: 'x', name: 'Oath of Moment', timing: '', effect: '', source: '' }],
    } as unknown as FactionArtifact
    flagArmyRules(artifact)
    expect(artifact.glossary[0].armyRule).toBeUndefined()
  })
})
