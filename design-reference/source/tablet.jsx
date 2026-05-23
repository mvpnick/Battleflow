/* global React, PhaseNav, UnitPhaseSection, DetailDrawer, ROSTER, PHASES, TopBar, PhaseSummary */
// Battleflow · TabletScreen — responsive adaptation

const { useState: useStateT } = React;

function TabletScreen({ initialPhase = 'fight' }) {
  const [phase, setPhase] = useStateT(initialPhase);
  const [drawer, setDrawer] = useStateT(null);
  const units = ROSTER[phase] || [];

  return (
    <div className="bf-app" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 12px',
        borderBottom: '1px solid var(--border-faint)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-mono)',
            fontSize: 14, color: 'var(--signal)', fontWeight: 700,
          }}>◬</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--f-display)',
              fontStyle: 'italic',
              fontSize: 22, color: 'var(--fg)',
              letterSpacing: '-0.015em', lineHeight: 1,
            }}>Battleflow</span>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--fg-dim)', marginTop: 2,
            }}>Strike Cadre · 1995 pts · Turn 3</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CPMeter cp={6} max={12} />
          <button style={{
            padding: '6px 12px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-faint)',
            borderRadius: 'var(--r-2)',
            color: 'var(--fg-soft)',
            fontFamily: 'var(--f-mono)', fontSize: 10,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Roster</button>
        </div>
      </div>

      {/* Phase nav */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-faint)',
        background: 'var(--bg-app)',
      }}>
        {PHASES.map(p => {
          const active = p.id === phase;
          return (
            <button
              key={p.id}
              onClick={() => setPhase(p.id)}
              style={{
                flex: 1, minHeight: 56,
                appearance: 'none', border: 0,
                background: active ? 'var(--surface-1)' : 'transparent',
                color: active ? 'var(--signal)' : 'var(--fg-mute)',
                borderBottom: active ? '2px solid var(--signal)' : '2px solid transparent',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                fontFamily: 'var(--f-ui)',
                transition: 'background-color .15s, color .15s',
              }}
            >
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: 10,
                letterSpacing: '0.08em', opacity: 0.7,
              }}>{p.n.toString().padStart(2, '0')}</span>
              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 500,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Phase summary strip */}
      <div style={{ padding: '12px 20px 0' }}>
        <PhaseSummary phase={phase} units={units} />
      </div>

      {/* Two-column unit grid */}
      <div className="bf-scroll" style={{
        flex: 1,
        padding: '0 8px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
        }}>
          {units.map((u, i) => (
            <UnitPhaseSection
              key={u.id}
              unit={u}
              defaultOpen={i < 2}
              onOpenDetail={setDrawer}
            />
          ))}
        </div>
      </div>

      {drawer && (
        <DetailDrawer
          open={true}
          payload={drawer}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function CPMeter({ cp, max }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 9px 5px 7px',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-faint)',
      borderRadius: 'var(--r-2)',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: 'var(--signal-dim)',
        border: '1.5px solid var(--signal)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 700,
        color: 'var(--signal)',
      }}>!</div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 2,
        fontFamily: 'var(--f-mono)', fontSize: 13,
      }}>
        <span style={{ color: 'var(--signal)', fontWeight: 700 }}>{cp}</span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}>/{max}</span>
        <span style={{ color: 'var(--fg-mute)', fontSize: 9, marginLeft: 3, letterSpacing: '0.08em' }}>CP</span>
      </div>
    </div>
  );
}

Object.assign(window, { TabletScreen });
