import styles from './TopBar.module.css'

interface Props {
  rosterName: string
  points: number
  cp: number
  cpMax: number
}

export function TopBar({ rosterName, points, cp, cpMax }: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.icon}>◬</div>
        <div className={styles.meta}>
          <span className={styles.rosterLabel}>Roster</span>
          <span className={styles.rosterName}>{rosterName} · {points} pts</span>
        </div>
      </div>
      <div className={styles.right}>
        <CPMeter cp={cp} max={cpMax} />
        <button className={styles.settingsBtn} aria-label="Settings">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.5 2.5l1.5 1.5M10 10l1.5 1.5M2.5 11.5L4 10M10 4l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function CPMeter({ cp, max }: { cp: number; max: number }) {
  return (
    <div className={styles.cpMeter}>
      <div className={styles.cpIcon}>!</div>
      <div className={styles.cpValue}>
        <span className={styles.cpN}>{cp}</span>
        <span className={styles.cpMax}>/{max}</span>
        <span className={styles.cpLabel}>CP</span>
      </div>
    </div>
  )
}
