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
  weapons: Weapon[]
  abilities: Rule[]
  stratagems: Strat[]
  reminders: { text: string }[]
}

export type Roster = Partial<Record<PhaseId, Unit[]>>

export type DrawerPayload = {
  kind: 'weapon' | 'ability' | 'stratagem'
  data: Weapon | Rule | Strat
  unit: Unit
} | null
