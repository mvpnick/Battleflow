import Link from 'next/link'

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 24,
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
      <Link
        href="/roster"
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
        View Sample Roster →
      </Link>
    </main>
  )
}
