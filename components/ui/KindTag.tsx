import styles from './KindTag.module.css'

export function KindTag({ kind }: { kind: 'melee' | 'ranged' }) {
  const isMelee = kind === 'melee'
  return (
    <span className={`${styles.tag} ${isMelee ? styles.melee : styles.ranged}`}>
      <span className={styles.icon} />
      {isMelee ? 'Melee' : 'Ranged'}
    </span>
  )
}
