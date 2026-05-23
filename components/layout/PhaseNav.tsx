import { Phase, PhaseId } from '@/lib/types'
import styles from './PhaseNav.module.css'

interface Props {
  phases: Phase[]
  activeId: PhaseId
  onChange: (id: PhaseId) => void
}

export function PhaseNav({ phases, activeId, onChange }: Props) {
  const active = phases.find(p => p.id === activeId)

  return (
    <div className={styles.nav}>
      <div className={styles.eyebrowRow}>
        <div className={styles.phaseDisplay}>
          <span className="bf-eyebrow">Phase</span>
          <span className={styles.phaseName}>{active?.name}</span>
        </div>
        <span className={styles.counter}>{active?.n}/6</span>
      </div>

      <div className={styles.segments}>
        {phases.map(p => {
          const isActive = p.id === activeId
          return (
            <button
              key={p.id}
              className={`bf-press ${styles.segment} ${isActive ? styles.active : ''}`}
              onClick={() => onChange(p.id)}
            >
              <span className={styles.ordinal}>{p.n.toString().padStart(2, '0')}</span>
              <span className={styles.abbr}>{p.abbr}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
