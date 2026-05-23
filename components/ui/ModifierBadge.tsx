import styles from './ModifierBadge.module.css'

type Tone = 'modifier' | 'signal' | 'warn' | 'good'

interface Props {
  label: string
  tone?: Tone
  dense?: boolean
}

export function ModifierBadge({ label, tone = 'modifier', dense = false }: Props) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${dense ? styles.dense : ''}`}>
      <span className={styles.dot} />
      {label}
    </span>
  )
}
