export type PhaseId = 'command' | 'movement' | 'shooting' | 'charge' | 'fight' | 'battleshock'

export type Phase = {
  id: PhaseId
  n: number
  abbr: string
  name: string
}

export type Stats = Record<string, string>

export type Modifier = {
  label: string
  cond?: string
}

export type Weapon = {
  name: string
  kind: 'melee' | 'ranged'
  stats: Stats
  tags: string[]
  mods: Modifier[]
}

export type Rule = {
  name: string
  timing: string
  cond?: string
  effect: string
  source: string
}

export type Strat = Rule & {
  cp: number
  once?: 'battle' | 'phase' | false
}

export type Unit = {
  id: string
  name: string
  role: string
  models: number
  tags: string[]
  hot: string[]
  weapons: Weapon[]
  abilities: Rule[]
  stratagems: Strat[]
  reminders: { text: string }[]
}

export type Roster = Partial<Record<PhaseId, Unit[]>>

export type DrawerPayload = {
  kind: 'weapon' | 'ability' | 'stratagem' | 'modifier'
  data: Weapon | Rule | Strat
  unit: Unit
} | null
