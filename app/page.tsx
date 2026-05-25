import Link from 'next/link'
import { RosterImport } from '@/components/landing/RosterImport'

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 32,
      padding: '40px 20px',
      fontFamily: 'var(--f-ui)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--f-display)',
          fontStyle: 'italic',
          fontSize: 40,
          fontWeight: 400,
          color: 'var(--fg)',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}>Battleflow</h1>
        <p style={{ color: 'var(--fg-mute)', fontSize: 14, margin: 0 }}>
          Phase-filtered wargame reference
        </p>
      </div>

      <RosterImport />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <Link
          href="/factions"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--signal)',
            background: 'var(--signal-dim)',
            border: '1px solid var(--signal-line)',
            borderRadius: 'var(--r-2)',
            padding: '10px 20px',
            textDecoration: 'none',
          }}
        >
          Browse Factions →
        </Link>
        <Link
          href="/roster"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--fg-mute)',
            textDecoration: 'none',
          }}
        >
          View sample roster
        </Link>
      </div>
    </main>
  )
}
