/**
 * Universal stratagems available to every army in Warhammer 40,000 11th edition.
 * Maintained manually — BSData does not model stratagems as machine-readable profiles, and
 * these are excluded from Wahapedia's per-faction scrape (`SKIP_GROUPS` in `wahapediaCli.ts`),
 * so there's no automated source for them either.
 *
 * Re-authored 2026-08-25 against the live Core Rules page (wahapedia.ru/wh40k11ed/the-rules/
 * core-rules/, numbered 15.02–15.12) for the 11e cutover — the whole list changed from 10e:
 * Desperate Breakout, Go to Ground, Grenade, and Tank Shock are gone; Epic Challenge,
 * Explosives, and Crushing Impact are new; Fire Overwatch and Heroic Intervention now trigger
 * at the end of a phase rather than reactively mid-phase. "Snap Shooting" (15.09) is a
 * referenced rules mechanic, not a purchasable stratagem, and is intentionally not listed here.
 */
import type { Strat } from '../types'

export const CORE_STRATAGEMS: Strat[] = [
  {
    name: 'Command Re-roll',
    cp: 1,
    timing: 'Any phase',
    effect:
      'WHEN: In any phase, just after you make an Advance, Charge, Damage, Hazard, Hit, Save or Wound roll (or a roll to determine the number of attacks made with a weapon) for a friendly unit or model.\nEFFECT: Re-roll that roll. If more than one dice were rolled together, select one of them to re-roll — except a Charge roll, which must be re-rolled in full.',
    summary: 'Re-roll any single dice result immediately after making it; Charge rolls reroll in full.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Epic Challenge',
    cp: 1,
    timing: 'Fight phase',
    effect:
      'WHEN: In the Fight phase, just after a friendly Character unit is selected to fight.\nEFFECT: Select one Character model in that unit. Until the end of the phase, that model’s melee weapons have the [PRECISION] ability.',
    summary: 'Give one Character model’s melee weapons the Precision ability for the phase.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Insane Bravery',
    cp: 1,
    timing: 'Battle-shock step',
    effect:
      'WHEN: In the Battle-shock step of your Command phase, just before you make a Battle-shock test for a friendly unit.\nEFFECT: That Battle-shock test is automatically successful.\nRESTRICTIONS: You cannot use this Stratagem more than once per battle.',
    summary: 'Automatically pass a Battle-shock test.',
    source: 'Core Rules',
    once: 'battle',
  },
  {
    name: 'Explosives',
    cp: 1,
    timing: 'Shooting phase',
    effect:
      'WHEN: Your Shooting phase.\nEFFECT: Select one unengaged Explosives/Grenades unit from your army that is eligible to shoot and did not make an Advance move this turn, then select one Explosives/Grenades model in that unit and one unengaged, visible enemy unit within 8" of it. Roll six D6: for each result of 4+, that enemy unit suffers 1 mortal wound.',
    summary: 'Roll 6D6 at a visible enemy within 8" — each 4+ deals 1 mortal wound.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Crushing Impact',
    cp: 1,
    timing: 'Charge phase',
    effect:
      'WHEN: Your Charge phase, just after a friendly Monster/Vehicle unit ends a Charge move.\nEFFECT: Select one enemy unit engaged with that unit and one model in your unit engaged with it. Roll a number of D6 equal to that model’s Toughness characteristic: for each result of 1, your unit suffers 1 mortal wound; for each result of 5+, the enemy unit suffers 1 mortal wound (to a maximum of 6 mortal wounds).',
    summary: 'A charging Monster/Vehicle rolls D6 equal to its Toughness — 5+ deals a mortal wound to the enemy, 1s hurt your own unit.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Rapid Ingress',
    cp: 1,
    timing: 'Movement phase',
    effect:
      'WHEN: End of your opponent’s Movement phase.\nEFFECT: Select one friendly unit in Strategic Reserves (excluding Aircraft). That unit makes an ingress move.\nRESTRICTIONS: You cannot use this Stratagem during the first battle round.',
    summary: 'Bring a Reserves unit onto the battlefield at the end of your opponent’s Movement phase.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Fire Overwatch',
    cp: 1,
    timing: 'Movement phase',
    effect:
      'WHEN: End of your opponent’s Movement phase.\nEFFECT: Select one friendly unengaged unit (excluding Titanic units). That unit shoots using snap shooting (hits only on an unmodified 6, no re-rolls, one visible target within 24").',
    summary: 'Shoot at an enemy at reduced accuracy at the end of your opponent’s Movement phase.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Smokescreen',
    cp: 1,
    timing: 'Shooting phase',
    effect:
      'WHEN: Start of your opponent’s Shooting phase.\nEFFECT: Select one friendly Smoke unit. Until the end of the phase, any attack that targets that unit — or a unit not fully visible to the attacker because of it — gives the target the benefit of cover.',
    summary: 'Give a Smoke unit (and anything it obscures) the benefit of cover for the phase.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Heroic Intervention',
    cp: 1,
    timing: 'Charge phase',
    effect:
      'WHEN: End of your opponent’s Charge phase.\nEFFECT: Select one friendly unengaged unit within 12" of one or more enemy units (a Vehicle may only be selected if it is a Character or Walker) and resolve a charge with it. Before making the charge roll, choose one mode: Leap to Defend (targets are limited to enemy units that made a charge move this phase); or, for +1CP, Into the Fray (charge rolls greater than 6 count as 6, and you may target any enemy unit within 6" and the maximum distance).',
    summary: 'Charge in reaction to an enemy charge; pay +1CP for a longer, more reliable intercept.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Counteroffensive',
    cp: 2,
    timing: 'Fight phase',
    effect:
      'WHEN: Fight step of your opponent’s Fight phase, just after an enemy unit has resolved its attacks.\nEFFECT: Select one friendly unit that is eligible to fight. Until the end of the phase, that unit has the Fights First ability and must be the next unit selected to fight.',
    summary: 'A friendly unit fights next, with Fights First, right after an enemy unit finishes fighting.',
    source: 'Core Rules',
    once: false,
  },
]
