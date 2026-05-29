/**
 * UI-layer types for Battleflow.
 *
 * Types whose shapes are governed by Zod schemas (`Stats`, `Modifier`, `Weapon`,
 * `Rule`, `Strat`) are re-exported from `lib/schemas.ts` — they live there as the
 * single source of truth and are derived via `z.infer<>`. UI components keep this
 * file as their stable import path; nothing downstream needs to change.
 *
 * Types that are purely UI concerns (`Phase`, `Unit`, `Roster`, `DrawerPayload`)
 * remain defined here.
 */

// Leaf types governed by Zod schemas — imported so we can use them locally and
// re-exported so UI consumers keep `import ... from '@/lib/types'` unchanged.
import type { Stats, Modifier, Weapon, Rule, Strat } from './schemas'
export type { Stats, Modifier, Weapon, Rule, Strat }

// ---------------------------------------------------------------------------
// Phase types
// ---------------------------------------------------------------------------

export type PhaseId = 'command' | 'movement' | 'shooting' | 'charge' | 'fight' | 'battleshock'

export type Phase = {
  id: PhaseId
  n: number
  abbr: string
  name: string
}

// ---------------------------------------------------------------------------
// Roster / unit types (UI layer)
// ---------------------------------------------------------------------------

export type Unit = {
  id: string
  name: string
  role: string
  models: number
  stats?: Stats
  tags: string[]
  hot: string[]
  /**
   * Detachment enhancements applied to this unit from the army-list bullets,
   * resolved against the matched detachment's enhancement rules so the chip
   * can open a drawer with the full effect text. Names that don't match a
   * known enhancement stay in `hot` as static chips instead.
   */
  enhancements: Rule[]
  weapons: Weapon[]
  abilities: Rule[]
  stratagems: Strat[]
  reminders: { text: string }[]
  /**
   * Unfiltered "full datasheet" copy of the phase-sensitive fields.
   *
   * `buildRoster` produces six per-phase copies of each unit, with `stats` /
   * `weapons` / `abilities` already filtered down to what's relevant in that
   * phase. The collapsed card uses those filtered top-level fields as its
   * decision menu; the expanded card flips the card over and needs the
   * complete datasheet regardless of phase — that's what `full` provides.
   *
   * Only the three fields that get phase-filtered are repeated here; the
   * rest (tags, hot, stratagems, reminders, …) are already at full
   * granularity at the top level. Optional so hand-crafted rosters (e.g.
   * `SAMPLE_ROSTER`) can omit it — the component falls back to the
   * top-level fields, which for an unfiltered demo unit are equivalent.
   */
  full?: {
    stats?: Stats
    weapons: Weapon[]
    abilities: Rule[]
  }
}

export type Roster = Partial<Record<PhaseId, Unit[]>>

export type DrawerPayload = {
  kind: 'weapon' | 'ability' | 'stratagem' | 'enhancement'
  data: Weapon | Rule | Strat
  unit: Unit
} | null
