import { Unit, DrawerPayload, PhaseId } from '@/lib/types'
import { stratagemMatchesPhase } from '@/lib/stratagems'
import { WeaponProfileRow } from './WeaponProfileRow'
import { RuleItem } from './RuleItem'
import { StratagemItem } from './StratagemItem'
import { StatRow } from '@/components/ui/StatRow'
import styles from './UnitPhaseSection.module.css'

interface Props {
  unit: Unit
  /** Active phase tab — used to filter unit stratagems to only those that apply. */
  phase: PhaseId
  open: boolean
  onToggle: () => void
  onOpenDetail: (payload: DrawerPayload) => void
}

function SubSection({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className={styles.subHeader}>
        <span className="bf-eyebrow">{label}</span>
        {count != null && <span className={styles.subCount}>· {count}</span>}
      </div>
      {children}
    </div>
  )
}

function CountChip({ n, label, tone }: { n: number; label: string; tone?: 'signal' }) {
  return (
    <span className={`${styles.countChip} ${tone === 'signal' ? styles.countSignal : ''}`}>
      <span className={styles.countN}>{n}</span>
      <span className={styles.countLabel}>{label}</span>
    </span>
  )
}

export function UnitPhaseSection({ unit, phase, open, onToggle, onOpenDetail }: Props) {
  // Filter unit-level stratagems to those that apply to the active phase.
  // Uses the same prose-keyword heuristic as the detachment stratagem section
  // so "any phase" stratagems (no phase keyword in timing) still appear here.
  const visibleStratagems = (unit.stratagems ?? []).filter(
    s => stratagemMatchesPhase(s.timing, phase)
  )

  const counts = {
    weapons: unit.weapons?.length ?? 0,
    rules: unit.abilities?.length ?? 0,
    strat: visibleStratagems.length,
  }

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={`bf-press ${styles.header}`}
        onClick={onToggle}
      >
        <div className={styles.row1}>
          <span className={styles.caret} style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <svg width="8" height="10" viewBox="0 0 8 10">
              <path d="M1 1l5 4-5 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className={styles.unitName}>{unit.name}</span>
          <div className={styles.tags}>
            {unit.tags.slice(0, 2).map(t => (
              <span key={t} className={styles.tag}>{t}</span>
            ))}
          </div>
        </div>

        <div className={styles.row2}>
          <span className={styles.role}>{unit.role}</span>
          <span className={styles.divider}>·</span>
          <span className={styles.models}>
            <span className={styles.modelN}>{unit.models}</span>
            <span className={styles.modelLabel}> mdl</span>
          </span>
        </div>

        {!open && (
          <div className={styles.row3}>
            <CountChip n={counts.weapons} label="weapons" />
            <CountChip n={counts.rules} label="rules" />
            {counts.strat > 0 && <CountChip n={counts.strat} label="strat" tone="signal" />}
            {unit.hot?.map(h => (
              <span key={h} className={styles.hotChip}>{h}</span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className={styles.body}>
          {unit.stats && Object.keys(unit.stats).length > 0 && (
            <SubSection label="Profile">
              <StatRow stats={unit.stats} />
            </SubSection>
          )}

          {unit.weapons?.length > 0 && (
            <>
              {unit.stats && Object.keys(unit.stats).length > 0 && <hr className="bf-rule" />}
              <SubSection label="Weapons" count={unit.weapons.length}>
                <div className={styles.itemList}>
                  {unit.weapons.map((w, i) => (
                    <div key={`${w.kind}-${w.name}-${i}`} className={i > 0 ? styles.itemSep : undefined}>
                      <WeaponProfileRow weapon={w} unit={unit} onOpen={onOpenDetail} />
                    </div>
                  ))}
                </div>
              </SubSection>
            </>
          )}

          {unit.abilities?.length > 0 && (
            <>
              <hr className="bf-rule" />
              <SubSection label="Abilities" count={unit.abilities.length}>
                <div className={styles.itemList}>
                  {unit.abilities.map((r, i) => (
                    <div key={`${r.name}-${i}`} className={i > 0 ? styles.itemSep : undefined}>
                      <RuleItem rule={r} unit={unit} onOpen={onOpenDetail} />
                    </div>
                  ))}
                </div>
              </SubSection>
            </>
          )}

          {visibleStratagems.length > 0 && (
            <>
              <hr className="bf-rule" />
              <SubSection label="Stratagems" count={visibleStratagems.length}>
                <div className={styles.itemList}>
                  {visibleStratagems.map((s, i) => (
                    <div key={`${s.name}-${i}`} className={i > 0 ? styles.itemSep : undefined}>
                      <StratagemItem strat={s} unit={unit} onOpen={onOpenDetail} />
                    </div>
                  ))}
                </div>
              </SubSection>
            </>
          )}

          {unit.reminders?.length > 0 && (
            <>
              <hr className="bf-rule" />
              <SubSection label="Reminders">
                {unit.reminders.map((r) => (
                  <div key={r.text} className={styles.reminder}>
                    <span className={styles.reminderIcon}>※</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </SubSection>
            </>
          )}
        </div>
      )}
    </div>
  )
}
