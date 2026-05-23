import styles from './ConditionPill.module.css'

interface Props {
  children: React.ReactNode
  kind?: 'cond' | 'once' | 'cp'
}

export function ConditionPill({ children, kind = 'cond' }: Props) {
  return (
    <span className={`${styles.pill} ${styles[kind]}`}>
      {kind === 'once' && <span className={styles.prefix}>⊘</span>}
      {kind === 'cond' && (
        <span className={styles.ifPrefix}>if</span>
      )}
      {children}
    </span>
  )
}
