/**
 * Universal stratagems available to every army in Warhammer 40,000 10th edition.
 * Maintained manually — BSData does not model stratagems as machine-readable profiles.
 * Source: Core Rules (Leviathan edition, updated for 10.6).
 */
import type { Strat } from '../types'

export const CORE_STRATAGEMS: Strat[] = [
  {
    name: 'Command Re-roll',
    cp: 1,
    timing: 'Any phase',
    effect:
      'WHEN: In any phase, just after you have made a Hit roll, a Wound roll, a Damage roll, a Saving Throw, an Advance roll or a Charge roll for a unit in your army.\nEFFECT: Re-roll that roll.',
    summary: 'Re-roll any single dice result immediately after making it.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Counter-offensive',
    cp: 2,
    timing: 'Fight phase',
    effect:
      'WHEN: In the Fight phase, after an enemy unit has fought.\nEFFECT: Select one unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase. That unit fights next.',
    summary: 'A friendly unit fights immediately after an enemy unit fights.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Desperate Breakout',
    cp: 2,
    timing: 'Movement phase',
    effect:
      'WHEN: In your Movement phase, when a unit from your army that is within Engagement Range of one or more enemy units is selected to move.\nEFFECT: That unit can attempt to Fall Back, and when doing so its models can move through models from enemy units. If it does, after it moves, roll one D6 for each model in that unit: for each result of 1, one model in that unit is destroyed (your choice). That unit can then act normally this turn.',
    summary: 'Fall back through enemy models, then act normally this turn.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Fire Overwatch',
    cp: 1,
    timing: 'Charge phase',
    effect:
      'WHEN: In your opponent\'s Charge phase, when an enemy unit declares a charge.\nEFFECT: One unit from your army that is within 24" of that enemy unit can shoot at it as if it were your Shooting phase. Each model may only shoot with one weapon, and if it has the [TORRENT] ability it can shoot even if it Advanced.',
    summary: 'Shoot at an enemy unit as it charges.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Go to Ground',
    cp: 1,
    timing: 'Any phase',
    effect:
      'WHEN: In any phase, just after an enemy unit has selected its targets.\nEFFECT: Select one INFANTRY unit from your army that was selected as a target. Until the end of the phase, all models in that unit have a 6+ invulnerable save and the Benefit of Cover.',
    summary: 'Give an Infantry unit a 6+ invulnerable save and cover against this attack.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Grenade',
    cp: 1,
    timing: 'Shooting phase',
    effect:
      'WHEN: In your Shooting phase.\nEFFECT: Select one unit from your army that has not been selected to shoot this phase, and select one GRENADE weapon that model is equipped with. That unit can shoot that weapon this phase, even if it Advanced or Fell Back this turn, but it can only make one attack with that weapon, and you can only use this Stratagem once per turn.',
    summary: 'Shoot a grenade even after Advancing or Falling Back.',
    source: 'Core Rules',
    once: 'phase',
  },
  {
    name: 'Heroic Intervention',
    cp: 1,
    timing: 'Charge phase',
    effect:
      'WHEN: In your opponent\'s Charge phase, after the enemy has resolved all charge moves.\nEFFECT: Select one unit from your army that is not within Engagement Range of any enemy units. That unit can move up to 3".',
    summary: 'Move a unit up to 3" to intercept a charge.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Insane Bravery',
    cp: 1,
    timing: 'Battleshock phase',
    effect:
      'WHEN: In the Battleshock phase, just after a Battle-shock test has been failed for a unit from your army.\nEFFECT: That unit is no longer Battle-shocked. You can only use this Stratagem once per battle.',
    summary: 'Remove Battle-shocked status from a friendly unit.',
    source: 'Core Rules',
    once: 'battle',
  },
  {
    name: 'Rapid Ingress',
    cp: 1,
    timing: 'Movement phase',
    effect:
      'WHEN: In your opponent\'s Movement phase, after your opponent has finished making all moves.\nEFFECT: Select one unit from your army that is in Reserves. That unit can arrive on the battlefield as if it were the Reinforcements step of your Movement phase.',
    summary: 'Deploy a Reserves unit at the end of your opponent\'s Movement phase.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Smokescreen',
    cp: 1,
    timing: 'Any phase',
    effect:
      'WHEN: In any phase, just after an enemy unit has selected its targets.\nEFFECT: Select one SMOKE unit from your army that was selected as a target. Until the end of the phase, all models in that unit have the Benefit of Cover and the Stealth ability.',
    summary: 'Give a Smoke unit cover and Stealth against the current attacker.',
    source: 'Core Rules',
    once: false,
  },
  {
    name: 'Tank Shock',
    cp: 1,
    timing: 'Charge phase',
    effect:
      'WHEN: In your Charge phase, after a VEHICLE unit from your army ends a Charge move.\nEFFECT: Select one enemy unit within Engagement Range of that VEHICLE. Roll a number of D6 equal to that VEHICLE unit\'s current Toughness characteristic; for each result that equals or exceeds that enemy unit\'s current Toughness, it suffers 1 mortal wound (to a maximum of 6 mortal wounds).',
    summary: 'Roll dice equal to your Vehicle\'s Toughness after charging — each roll ≥ enemy T deals 1 MW.',
    source: 'Core Rules',
    once: false,
  },
]
