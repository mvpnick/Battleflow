/* global React, PhaseNav, UnitPhaseSection, DetailDrawer, ROSTER, PHASES */
// Battleflow · PhaseReferenceScreen — the main mobile screen

const { useState: useStateScr } = React;

/* ─────────────────────────────────────────────────────────────
   TopBar — list selector / context
   ───────────────────────────────────────────────────────────── */

function TopBar() {
  return (
    <div style={{
      padding: '10px 14px 4px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--bg-app)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{
          width: 22, height: 22,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          color: 'var(--signal)',
          fontWeight: 700,
          letterSpacing: 0,
        }}>◬</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <span style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
          }}>Roster</span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>Strike Cadre · 1995 pts</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CPMeter cp={6} max={12} />
        <button style={{
          width: 30, height: 30,
          background: 'var(--surface-1)',
          border: '1px solid var(--border-faint)',
          borderRadius: 'var(--r-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--fg-soft)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.5 2.5l1.5 1.5M10 10l1.5 1.5M2.5 11.5L4 10M10 4l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function CPMeter({ cp, max }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 8px 4px 6px',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-faint)',
      borderRadius: 'var(--r-2)',
    }}>
      <div style={{
        width: 16, height: 16,
        borderRadius: '50%',
        background: 'var(--signal-dim)',
        border: '1.5px solid var(--signal)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-mono)',
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--signal)',
      }}>!</div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 2,
        fontFamily: 'var(--f-mono)',
        fontSize: 12,
      }}>
        <span style={{ color: 'var(--signal)', fontWeight: 700 }}>{cp}</span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}>/{max}</span>
        <span style={{ color: 'var(--fg-mute)', fontSize: 9, marginLeft: 3, letterSpacing: '0.08em' }}>CP</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PhaseReferenceScreen — mobile primary
   ───────────────────────────────────────────────────────────── */

function PhaseReferenceScreen({
  initialPhase = 'fight',
  initialOpenUnitIds = ['assault-vets'],
  drawerPayload = null,
  forceDrawer = false,
}) {
  const [phase, setPhase] = useStateScr(initialPhase);
  const [openUnits, setOpenUnits] = useStateScr(new Set(initialOpenUnitIds));
  const [drawer, setDrawer] = useStateScr(drawerPayload);

  const units = ROSTER[phase] || [];
  const drawerOpen = forceDrawer || !!drawer;
  const drawerData = drawer || drawerPayload;

  return (
    <div className="bf-app">
      <TopBar />
      <PhaseNav
        phases={PHASES}
        activeId={phase}
        onChange={setPhase}
      />

      <div className="bf-scroll" style={{ height: 'calc(100% - 158px)', paddingTop: 12, paddingBottom: 40 }}>
        {/* phase summary strip */}
        <PhaseSummary phase={phase} units={units} />

        {units.map(u => (
          <UnitPhaseSection
            key={u.id}
            unit={u}
            defaultOpen={openUnits.has(u.id)}
            onOpenDetail={setDrawer}
          />
        ))}

        {units.length === 0 && (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
            color: 'var(--fg-mute)',
            fontSize: 13,
          }}>
            No phase-specific rules surface this phase.
          </div>
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        payload={drawerData}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}

function PhaseSummary({ phase, units }) {
  const totalWeapons = units.reduce((n, u) => n + (u.weapons?.length || 0), 0);
  const totalStrats = units.reduce((n, u) => n + (u.stratagems?.length || 0), 0);
  const totalRules = units.reduce((n, u) => n + (u.abilities?.length || 0), 0);
  return (
    <div style={{
      margin: '0 12px 12px',
      padding: '10px 14px',
      background: 'linear-gradient(180deg, var(--surface-1), transparent)',
      borderTop: '1px solid var(--border-faint)',
      borderBottom: '1px solid var(--border-faint)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <SummaryStat n={units.length} label="units" />
        <SummaryStat n={totalWeapons} label="weapons" />
        <SummaryStat n={totalRules} label="rules" />
        <SummaryStat n={totalStrats} label="strat" highlight />
      </div>
      <button style={{
        appearance: 'none', border: '1px solid var(--border-faint)',
        background: 'var(--surface-1)',
        borderRadius: 'var(--r-2)',
        color: 'var(--fg-soft)',
        padding: '5px 9px',
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}>Expand All</button>
    </div>
  );
}

function SummaryStat({ n, label, highlight }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', lineHeight: 1,
    }}>
      <span style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 16,
        fontWeight: 600,
        color: highlight ? 'var(--signal)' : 'var(--fg)',
        letterSpacing: '-0.01em',
      }}>{n}</span>
      <span style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 9,
        marginTop: 4,
        color: 'var(--fg-dim)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>{label}</span>
    </div>
  );
}

Object.assign(window, { PhaseReferenceScreen, TopBar, CPMeter, PhaseSummary });
