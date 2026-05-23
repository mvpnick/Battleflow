import { Phase, Roster } from './types'

export const PHASES: Phase[] = [
  { id: 'command',     n: 1, abbr: 'CMD', name: 'Command' },
  { id: 'movement',    n: 2, abbr: 'MOV', name: 'Movement' },
  { id: 'shooting',    n: 3, abbr: 'SHO', name: 'Shooting' },
  { id: 'charge',      n: 4, abbr: 'CHG', name: 'Charge' },
  { id: 'fight',       n: 5, abbr: 'FGT', name: 'Fight' },
  { id: 'battleshock', n: 6, abbr: 'BSK', name: 'Battleshock' },
]

export const SAMPLE_ROSTER: Roster = {
  fight: [
    {
      id: 'assault-vets',
      name: 'Assault Veterans',
      role: 'Assault Infantry',
      models: 5,
      tags: ['MELEE', 'AURA'],
      hot: ['+1 Atk if charged'],
      weapons: [
        {
          name: 'Power Blades',
          kind: 'melee',
          stats: { A: '4', WS: '3+', S: '5', AP: '-2', D: '1' },
          tags: ['Melee', 'Extra Attacks'],
          mods: [
            { label: '+1 Attack', cond: 'if charged' },
            { label: 'Reroll Wounds', cond: 'from Leader' },
          ],
        },
        {
          name: 'Twin Sidearm',
          kind: 'melee',
          stats: { A: '3', WS: '3+', S: '4', AP: '0', D: '1' },
          tags: ['Melee'],
          mods: [],
        },
      ],
      abilities: [
        {
          name: 'Momentum Strike',
          timing: 'Fight phase',
          cond: 'If this unit charged',
          effect: 'Improve melee output this activation.',
          source: 'Unit Ability',
        },
        {
          name: 'Sworn Vow',
          timing: 'Activation',
          cond: 'Leader attached',
          effect: 'Reroll wound rolls of 1 against the chosen target.',
          source: 'Faction Rule',
        },
      ],
      stratagems: [
        {
          name: 'Counter-Offensive Drill',
          cp: 2,
          timing: 'After enemy unit fights',
          cond: 'Eligible unit',
          effect: 'Selected unit fights immediately.',
          source: 'Detachment',
          once: false,
        },
        {
          name: 'Final Stand',
          cp: 1,
          timing: 'Fight phase',
          cond: 'Below half-strength',
          effect: 'Lethal Hits on melee attacks this phase.',
          source: 'Core',
          once: 'battle',
        },
      ],
      reminders: [
        { text: 'Resolve activations alternating with opponent.' },
      ],
    },
    {
      id: 'ironclad',
      name: 'Ironclad Walker',
      role: 'Heavy Walker',
      models: 1,
      tags: ['MELEE', 'VEHICLE'],
      hot: ['Devastating Wounds'],
      weapons: [
        {
          name: 'Demolisher Fist',
          kind: 'melee',
          stats: { A: '5', WS: '3+', S: '12', AP: '-3', D: 'D6' },
          tags: ['Melee', 'Devastating Wounds'],
          mods: [
            { label: '+1 to Wound', cond: 'vs Monster/Vehicle' },
          ],
        },
        {
          name: 'Crushing Tread',
          kind: 'melee',
          stats: { A: '3', WS: '4+', S: '7', AP: '-1', D: '2' },
          tags: ['Melee'],
          mods: [],
        },
      ],
      abilities: [
        {
          name: 'Cogwork Endurance',
          timing: 'Any phase',
          cond: 'Always on',
          effect: 'Halve incoming damage from melee attacks (round up).',
          source: 'Unit Ability',
        },
      ],
      stratagems: [
        {
          name: 'Override Protocol',
          cp: 1,
          timing: 'Fight phase',
          cond: 'Targeting Vehicle',
          effect: 'Sustained Hits 2 on melee attacks this phase.',
          source: 'Detachment',
          once: 'phase',
        },
      ],
      reminders: [],
    },
    {
      id: 'battle-priest',
      name: 'Battle Priest',
      role: 'Character · Leader',
      models: 1,
      tags: ['MELEE', 'LEADER'],
      hot: ['+1 Atk aura'],
      weapons: [
        {
          name: 'Reliquary Maul',
          kind: 'melee',
          stats: { A: '4', WS: '2+', S: '6', AP: '-2', D: '2' },
          tags: ['Melee', 'Precision'],
          mods: [],
        },
      ],
      abilities: [
        {
          name: 'Litany of the First Strike',
          timing: 'Fight phase',
          cond: 'Aura · attached unit',
          effect: '+1 Attack to melee weapons.',
          source: 'Unit Ability',
        },
      ],
      stratagems: [],
      reminders: [
        { text: 'Aura applies before resolving any attacks this phase.' },
      ],
    },
  ],
  shooting: [
    {
      id: 'fireline-squad',
      name: 'Fireline Squad',
      role: 'Line Infantry',
      models: 10,
      tags: ['RANGED', 'HAZARDOUS'],
      hot: ['+1 Hit if stationary'],
      weapons: [
        {
          name: 'Plasma Rifle',
          kind: 'ranged',
          stats: { R: '24"', A: '2', BS: '3+', S: '8', AP: '-3', D: '2' },
          tags: ['Hazardous', 'Rapid Fire'],
          mods: [{ label: '+1 to Hit', cond: 'if remained stationary' }],
        },
        {
          name: 'Pulse Carbine ×8',
          kind: 'ranged',
          stats: { R: '18"', A: '2', BS: '4+', S: '4', AP: '0', D: '1' },
          tags: ['Assault'],
          mods: [],
        },
        {
          name: 'Heavy Lance',
          kind: 'ranged',
          stats: { R: '36"', A: '1', BS: '4+', S: '9', AP: '-3', D: 'D3+3' },
          tags: ['Heavy', 'Anti-Vehicle 4+'],
          mods: [{ label: 'Lethal Hits', cond: 'vs Vehicle' }],
        },
      ],
      abilities: [
        {
          name: 'Mark Target',
          timing: 'Shooting phase',
          cond: 'Once per phase',
          effect: 'Selected enemy unit suffers -1 to its next save.',
          source: 'Unit Ability',
        },
      ],
      stratagems: [
        {
          name: 'Calibrated Volley',
          cp: 1,
          timing: 'Shooting phase',
          cond: 'Unit did not move',
          effect: 'Sustained Hits 1 on ranged attacks this phase.',
          source: 'Detachment',
          once: false,
        },
      ],
      reminders: [
        { text: 'Hazardous: roll 1 → model destroyed after shooting.' },
      ],
    },
    {
      id: 'recon-drone',
      name: 'Recon Drone',
      role: 'Light Skimmer',
      models: 2,
      tags: ['RANGED', 'FAST'],
      hot: [],
      weapons: [
        {
          name: 'Burst Cannon',
          kind: 'ranged',
          stats: { R: '18"', A: '4', BS: '4+', S: '5', AP: '0', D: '1' },
          tags: ['Assault'],
          mods: [],
        },
      ],
      abilities: [
        {
          name: 'Spotter Array',
          timing: 'Shooting phase',
          cond: 'Visible target',
          effect: 'Friendly units ignore cover against the chosen target.',
          source: 'Unit Ability',
        },
      ],
      stratagems: [],
      reminders: [],
    },
  ],
}
