import { Strat, DrawerPayload, Unit } from '@/lib/types'
import { CPCost } from '@/components/ui/CPCost'
import { ConditionPill } from '@/components/ui/ConditionPill'
import styles from './StratagemItem.module.css'

interface Props {
  strat: Strat
  unit: Unit
  onOpen: (payload: DrawerPayload) => void
}

export function StratagemItem({ strat, unit, onOpen }: Props) {
  return (
    <div
      className={`bf-press ${styles.row}`}
      onClick={() => onOpen({ kind: 'stratagem', data: strat, unit })}
    >
      <div className={styles.header}>
        <div className={styles.left}>
          <CPCost n={strat.cp} />
          <span className={styles.name}>{strat.name}</span>
        </div>
        <span className={styles.source}>{strat.source}</span>
      </div>
      <p className={styles.effect}>{strat.effect}</p>
      <div className={styles.pills}>
        {strat.cond && <ConditionPill kind="cond">{strat.cond}</ConditionPill>}
        {strat.once === 'battle' && <ConditionPill kind="once">Once / battle</ConditionPill>}
        {strat.once === 'phase' && <ConditionPill kind="once">Once / phase</ConditionPill>}
      </div>
    </div>
  )
}
