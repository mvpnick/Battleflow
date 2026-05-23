import styles from './CPCost.module.css'

export function CPCost({ n }: { n: number }) {
  return (
    <span className={styles.token}>
      <span className={styles.n}>{n}</span>
      <span className={styles.label}>CP</span>
    </span>
  )
}
