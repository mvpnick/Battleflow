'use client'

import { useState } from 'react'
import { Strat } from '@/lib/types'
import { CPCost } from '@/components/ui/CPCost'
import { ConditionPill } from '@/components/ui/ConditionPill'
import styles from './PhaseStratagemSection.module.css'

interface Props {
  stratagems: Strat[]
}

export function PhaseStratagemSection({ stratagems }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  if (stratagems.length === 0) return null

  function toggleOpen(name: string) {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={`bf-press ${styles.sectionHeader}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <span className={styles.sectionLabel}>
          Stratagems
          <span className={styles.count}>{stratagems.length}</span>
        </span>
        <span className={`${styles.chevron} ${collapsed ? styles.chevronDown : ''}`}>
          ▲
        </span>
      </button>

      {!collapsed && (
        <div className={styles.list}>
          {stratagems.map((strat) => {
            const isOpen = openIds.has(strat.name)
            return (
              <div key={`${strat.source}-${strat.name}`} className={styles.itemWrap}>
                <button
                  type="button"
                  className={`bf-press ${styles.card}`}
                  onClick={() => toggleOpen(strat.name)}
                >
                  <div className={styles.cardTop}>
                    <CPCost n={strat.cp} />
                    <span className={styles.name}>{strat.name}</span>
                    <span className={styles.expand}>{isOpen ? '−' : '+'}</span>
                  </div>
                  {strat.summary && !isOpen && (
                    <p className={styles.summary}>{strat.summary}</p>
                  )}
                  {isOpen && (
                    <div className={styles.expanded}>
                      {strat.timing && (
                        <p className={styles.timing}>{strat.timing}</p>
                      )}
                      <p className={styles.effect}>{strat.effect}</p>
                      <div className={styles.pills}>
                        {strat.cond && <ConditionPill kind="cond">{strat.cond}</ConditionPill>}
                        {strat.once === 'battle' && <ConditionPill kind="once">Once / battle</ConditionPill>}
                        {strat.once === 'phase' && <ConditionPill kind="once">Once / phase</ConditionPill>}
                      </div>
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
