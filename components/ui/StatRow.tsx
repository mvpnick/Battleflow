import { Stats } from '@/lib/types'

export function StatRow({ stats }: { stats: Stats }) {
  const entries = Object.entries(stats)
  return (
    <div className="bf-stat" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', rowGap: 2 }}>
      {entries.map(([k, v], i) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          {i > 0 && <span className="dot">·</span>}
          <span className="lbl">{k}</span>
          <span style={{ color: 'var(--fg)', fontWeight: 600, marginLeft: 3 }}>{v}</span>
        </span>
      ))}
    </div>
  )
}
