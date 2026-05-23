/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard,
   IOSDevice, PhaseReferenceScreen, TabletScreen,
   ColorTokensCard, TypeSpecimenCard, ComponentVariantsCard,
   RowPrototypesCard, UnitStatesCard, ROSTER */

// Battleflow · App — composes the design canvas

const { useState: useStateApp } = React;

/* ─────────────────────────────────────────────────────────────
   Phone artboard wrapper — slim chrome around the iOS frame
   ───────────────────────────────────────────────────────────── */

function PhoneFrame({ children, height = 780 }) {
  return (
    <div style={{
      width: 360, height,
      borderRadius: 44,
      overflow: 'hidden',
      position: 'relative',
      background: '#000',
      boxShadow: '0 30px 60px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.18)',
      fontFamily: 'var(--f-ui)',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 32, borderRadius: 22, background: '#000', zIndex: 50,
      }} />
      {/* status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 30,
        color: '#fff', pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: '-apple-system, "SF Pro", system-ui',
          fontWeight: 600, fontSize: 14, marginTop: 14,
        }}>9:41</span>
        <span style={{ marginTop: 14, display: 'flex', gap: 5, alignItems: 'center' }}>
          <svg width="16" height="10" viewBox="0 0 16 10">
            <rect x="0" y="6" width="2.6" height="4" rx="0.6" fill="#fff"/>
            <rect x="3.8" y="4" width="2.6" height="6" rx="0.6" fill="#fff"/>
            <rect x="7.6" y="2" width="2.6" height="8" rx="0.6" fill="#fff"/>
            <rect x="11.4" y="0" width="2.6" height="10" rx="0.6" fill="#fff"/>
          </svg>
          <svg width="22" height="10" viewBox="0 0 22 10">
            <rect x="0.4" y="0.4" width="18.5" height="9.2" rx="2.5" stroke="#fff" strokeOpacity="0.4" fill="none"/>
            <rect x="1.8" y="1.8" width="15.7" height="6.4" rx="1.5" fill="#fff"/>
          </svg>
        </span>
      </div>
      {/* content area */}
      <div style={{
        position: 'absolute', inset: 0,
        paddingTop: 0,
      }}>
        <div style={{ height: '100%', paddingTop: 44 }}>
          {children}
        </div>
      </div>
      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
        width: 115, height: 4, borderRadius: 4,
        background: 'rgba(255,255,255,0.7)',
        zIndex: 60, pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tablet frame
   ───────────────────────────────────────────────────────────── */

function TabletFrame({ children, width = 1020, height = 720 }) {
  return (
    <div style={{
      width, height,
      borderRadius: 22,
      overflow: 'hidden',
      background: '#000',
      boxShadow: '0 30px 60px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.18)',
      position: 'relative',
      padding: 10,
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--bg-app)',
        position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Intro / "junior designer notes" card
   ───────────────────────────────────────────────────────────── */

function IntroCard() {
  return (
    <div style={{
      width: 600, padding: '32px 36px',
      background: '#14151a',
      color: 'var(--fg)',
      fontFamily: 'var(--f-ui)',
      borderRadius: 'var(--r-5)',
      border: '1px solid var(--border-faint)',
      boxShadow: 'var(--elev-2)',
      lineHeight: 1.55,
    }}>
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--signal)',
        marginBottom: 8,
      }}>Battleflow · Design system</div>
      <h1 style={{
        fontFamily: 'var(--f-display)', fontStyle: 'italic',
        fontWeight: 400, fontSize: 44, margin: '0 0 16px',
        letterSpacing: '-0.02em', lineHeight: 1.02,
      }}>A reference sheet, not a dashboard.</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--fg-soft)', fontSize: 14 }}>
        Battleflow is a phase-filtered field manual for the player's army list.
        It never simulates the board — it just surfaces every weapon profile,
        modifier, ability, and stratagem the roster can use <em>this phase</em>,
        grouped by unit, in a dense and scannable layout.
      </p>
      <p style={{ margin: '0 0 22px', color: 'var(--fg-mute)', fontSize: 13 }}>
        Aesthetic direction: dark oil-black surfaces, JetBrains Mono for the stat
        spec, Geist for UI, Instrument Serif italic as the single editorial
        flourish. One signal hue (amber) drives the active state; modifiers ride
        steel-cyan and limitations ride rust-red. Original visual treatment — no
        IP from any tabletop publisher.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
        borderTop: '1px solid var(--border-faint)', paddingTop: 16,
      }}>
        {[
          ['01', 'Phase-first', 'A sticky 6-segment phase selector anchors every screen.'],
          ['02', 'Unit-grouped', 'All output is grouped under the unit it belongs to.'],
          ['03', 'Conditions shown', 'Conditional rules are never hidden — only marked.'],
          ['04', 'Mid-game tempo', 'Tap-to-expand units; tap-to-open detail drawer.'],
        ].map(([n, h, d]) => (
          <div key={n} style={{
            display: 'flex', gap: 10,
            padding: 10,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-faint)',
            borderRadius: 'var(--r-3)',
          }}>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 11,
              color: 'var(--signal)', fontWeight: 600,
              letterSpacing: '0.04em',
            }}>{n}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{h}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.45 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Pre-built drawer payload for the "detail open" screen
   ───────────────────────────────────────────────────────────── */

const DEMO_DRAWER = {
  kind: 'stratagem',
  data: ROSTER.fight[0].stratagems[0],
  unit: ROSTER.fight[0],
};

const WEAPON_DRAWER = {
  kind: 'weapon',
  data: ROSTER.fight[1].weapons[0],
  unit: ROSTER.fight[1],
};

/* ─────────────────────────────────────────────────────────────
   Tweaks (density, theme tone)
   ───────────────────────────────────────────────────────────── */

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 75,
  "density": "comfortable",
  "showDrawer": "stratagem"
}/*EDITMODE-END*/;

/* ─────────────────────────────────────────────────────────────
   App
   ───────────────────────────────────────────────────────────── */

function App() {
  // Apply tweak-driven theme overrides via inline style
  const accentHue = DEFAULTS.accentHue;
  // (kept simple — tweak panel could wire these up later)

  return (
    <div style={{
      // Override accent hue at the root if tweaked
      '--signal':      `oklch(0.79 0.13 ${accentHue})`,
      '--signal-dim':  `oklch(0.79 0.13 ${accentHue} / 0.16)`,
      '--signal-line': `oklch(0.79 0.13 ${accentHue} / 0.32)`,
    }}>
      <DesignCanvas>
        <DCSection
          id="intro"
          title="Battleflow"
          subtitle="A mobile-first reference sheet for tabletop army lists"
        >
          <DCArtboard id="intro-card" label="Brief" width={600} height={500}>
            <IntroCard />
          </DCArtboard>
        </DCSection>

        <DCSection
          id="mobile"
          title="Mobile · Primary screen"
          subtitle="Phase-filtered, unit-grouped, dense by design"
        >
          <DCArtboard id="fight-collapsed" label="Fight · all collapsed" width={360} height={780}>
            <PhoneFrame>
              <PhaseReferenceScreen
                initialPhase="fight"
                initialOpenUnitIds={[]}
              />
            </PhoneFrame>
          </DCArtboard>

          <DCArtboard id="fight-expanded" label="Fight · Assault Veterans expanded" width={360} height={780}>
            <PhoneFrame>
              <PhaseReferenceScreen
                initialPhase="fight"
                initialOpenUnitIds={['assault-vets']}
              />
            </PhoneFrame>
          </DCArtboard>

          <DCArtboard id="shooting-expanded" label="Shooting · Fireline Squad expanded" width={360} height={780}>
            <PhoneFrame>
              <PhaseReferenceScreen
                initialPhase="shooting"
                initialOpenUnitIds={['fireline-squad']}
              />
            </PhoneFrame>
          </DCArtboard>

          <DCArtboard id="drawer-stratagem" label="Detail drawer · Stratagem" width={360} height={780}>
            <PhoneFrame>
              <PhaseReferenceScreen
                initialPhase="fight"
                initialOpenUnitIds={['assault-vets']}
                drawerPayload={DEMO_DRAWER}
                forceDrawer={true}
              />
            </PhoneFrame>
          </DCArtboard>

          <DCArtboard id="drawer-weapon" label="Detail drawer · Weapon" width={360} height={780}>
            <PhoneFrame>
              <PhaseReferenceScreen
                initialPhase="fight"
                initialOpenUnitIds={['ironclad']}
                drawerPayload={WEAPON_DRAWER}
                forceDrawer={true}
              />
            </PhoneFrame>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="tablet"
          title="Tablet · Two-column adaptation"
          subtitle="Same vocabulary, more room"
        >
          <DCArtboard id="tablet-fight" label="Fight phase · iPad" width={1020} height={720}>
            <TabletFrame>
              <TabletScreen initialPhase="fight" />
            </TabletFrame>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="states"
          title="UnitPhaseSection · States"
          subtitle="Collapsed signals + expanded grouping"
        >
          <DCArtboard id="unit-states" label="Card states" width={420} height={760}>
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--bg-app)', overflow: 'hidden',
              borderRadius: 'var(--r-5)',
              border: '1px solid var(--border-faint)',
            }}>
              <UnitStatesCard />
            </div>
          </DCArtboard>

          <DCArtboard id="rows" label="Row prototypes" width={420} height={760}>
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--bg-app)', overflow: 'hidden',
              borderRadius: 'var(--r-5)',
              border: '1px solid var(--border-faint)',
            }}>
              <RowPrototypesCard />
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="atoms"
          title="Atoms · Badges, pills, tags"
          subtitle="The smallest distinguishable units"
        >
          <DCArtboard id="atoms-card" label="Badge & pill library" width={640} height={620}>
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--bg-app)', overflow: 'hidden',
              borderRadius: 'var(--r-5)',
              border: '1px solid var(--border-faint)',
            }}>
              <ComponentVariantsCard />
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="tokens"
          title="Design tokens"
          subtitle="Color · type · scale"
        >
          <DCArtboard id="colors" label="Color tokens" width={760} height={620}>
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--bg-app)', overflow: 'hidden',
              borderRadius: 'var(--r-5)',
              border: '1px solid var(--border-faint)',
            }}>
              <ColorTokensCard />
            </div>
          </DCArtboard>
          <DCArtboard id="type" label="Type specimen" width={720} height={620}>
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--bg-app)', overflow: 'hidden',
              borderRadius: 'var(--r-5)',
              border: '1px solid var(--border-faint)',
            }}>
              <TypeSpecimenCard />
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
