/* global React, ModifierBadge, ConditionPill, CPCost, KindTag, WeaponProfileRow, RuleItem, StratagemItem, UnitPhaseSection, PhaseNav, PHASES, ROSTER */
// Battleflow · Design-system showcase pieces (tokens / components in isolation)

/* ─────────────────────────────────────────────────────────────
   ColorSwatch grid
   ───────────────────────────────────────────────────────────── */

function ColorSwatch({ name, varName, hex, note }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        width: '100%', aspectRatio: '1.6',
        background: `var(${varName})`,
        borderRadius: 'var(--r-3)',
        border: '1px solid var(--border-faint)',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{name}</span>
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: 10,
          color: 'var(--fg-dim)', letterSpacing: '0.02em',
        }}>{varName}</span>
        {note && (
          <span style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>{note}</span>
        )}
      </div>
    </div>
  );
}

function ColorTokensCard() {
  const groups = [
    {
      label: 'Surface',
      colors: [
        { name: 'Canvas',   varName: '--bg-canvas',  note: 'outside any panel' },
        { name: 'App',      varName: '--bg-app',     note: 'phone background' },
        { name: 'Surface 1',varName: '--surface-1',  note: 'unit card' },
        { name: 'Surface 2',varName: '--surface-2',  note: 'nested rows' },
        { name: 'Surface 3',varName: '--surface-3',  note: 'pressed' },
      ],
    },
    {
      label: 'Signal',
      colors: [
        { name: 'Signal',   varName: '--signal',     note: 'amber · CP, active' },
        { name: 'Modifier', varName: '--modifier',   note: 'steel · modifiers' },
        { name: 'Warn',     varName: '--warn',       note: 'rust · once/battle' },
        { name: 'Good',     varName: '--good',       note: 'cool green · buff' },
      ],
    },
    {
      label: 'Text & Lines',
      colors: [
        { name: 'Foreground', varName: '--fg',           note: 'primary text' },
        { name: 'FG Soft',    varName: '--fg-soft',      note: 'body copy' },
        { name: 'FG Mute',    varName: '--fg-mute',      note: 'secondary' },
        { name: 'FG Dim',     varName: '--fg-dim',       note: 'eyebrow, mono' },
        { name: 'Border',     varName: '--border',       note: 'panel edge' },
      ],
    },
  ];

  return (
    <div style={{
      background: 'var(--bg-app)',
      color: 'var(--fg)',
      fontFamily: 'var(--f-ui)',
      padding: '24px 28px',
      height: '100%', boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <Eyebrow>Color · OKLCH-aligned</Eyebrow>
      <DisplayTitle>Signal palette</DisplayTitle>
      <p style={{
        margin: '4px 0 24px',
        fontSize: 12, color: 'var(--fg-mute)',
        lineHeight: 1.5, maxWidth: 460,
      }}>
        Three signal hues share matched chroma & lightness so they sit at the same
        visual weight. Surfaces tilt cool to push interactive moments forward.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {groups.map(g => (
          <div key={g.label}>
            <Eyebrow style={{ marginBottom: 8 }}>{g.label}</Eyebrow>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
            }}>
              {g.colors.map(c => (
                <ColorSwatch key={c.varName} {...c} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Type specimen
   ───────────────────────────────────────────────────────────── */

function TypeSpecimenCard() {
  return (
    <div style={{
      background: 'var(--bg-app)',
      color: 'var(--fg)',
      fontFamily: 'var(--f-ui)',
      padding: '28px 32px',
      height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 18,
      overflow: 'hidden',
    }}>
      <div>
        <Eyebrow>Type system</Eyebrow>
        <DisplayTitle>Three voices</DisplayTitle>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SpecRow
          family="Instrument Serif"
          role="Display · italic"
          sample="Fight phase"
          style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 40, lineHeight: 1 }}
        />
        <SpecRow
          family="Geist"
          role="UI · body & headers"
          sample="Assault Veterans"
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}
        />
      </div>

      <SpecRow
        family="JetBrains Mono"
        role="Stats · keywords · meta"
        sample="A 4 · WS 3+ · S 5 · AP −2 · D 1"
        style={{ fontFamily: 'var(--f-mono)', fontSize: 16, color: 'var(--fg-stat)', letterSpacing: '0.02em' }}
      />

      <div style={{ borderTop: '1px solid var(--border-faint)', paddingTop: 14 }}>
        <Eyebrow style={{ marginBottom: 10 }}>Scale</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <ScaleRow size="28" label="Phase display" font="serif" />
          <ScaleRow size="22" label="Nav title" font="serif" />
          <ScaleRow size="17" label="Unit name" font="ui" weight={600} />
          <ScaleRow size="15" label="Row title" font="ui" weight={600} />
          <ScaleRow size="14" label="Body" font="ui" />
          <ScaleRow size="13" label="Effect" font="ui" />
          <ScaleRow size="12" label="Stats" font="mono" />
          <ScaleRow size="11" label="Pills" font="ui" />
          <ScaleRow size="10" label="Eyebrow" font="ui" caps />
        </div>
      </div>
    </div>
  );
}

function SpecRow({ family, role, sample, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: 10,
          color: 'var(--fg-dim)', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>{role}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-mute)' }}>{family}</span>
      </div>
      <div style={{ color: 'var(--fg)', ...style }}>{sample}</div>
    </div>
  );
}

function ScaleRow({ size, label, font, weight, caps }) {
  const f = font === 'serif' ? 'var(--f-display)' : font === 'mono' ? 'var(--f-mono)' : 'var(--f-ui)';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--f-mono)', fontSize: 10,
        color: 'var(--fg-dim)', minWidth: 22,
      }}>{size}</span>
      <span style={{
        fontFamily: f,
        fontSize: parseInt(size),
        fontWeight: weight,
        letterSpacing: caps ? '0.12em' : undefined,
        textTransform: caps ? 'uppercase' : undefined,
        color: 'var(--fg-soft)',
        lineHeight: 1.1,
      }}>{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Component variants card
   ───────────────────────────────────────────────────────────── */

function ComponentVariantsCard() {
  return (
    <div style={{
      background: 'var(--bg-app)',
      color: 'var(--fg)',
      fontFamily: 'var(--f-ui)',
      padding: '24px 28px',
      height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 18,
      overflow: 'hidden',
    }}>
      <div>
        <Eyebrow>Atoms</Eyebrow>
        <DisplayTitle>Badges & pills</DisplayTitle>
      </div>

      <Block label="Modifier badges">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <ModifierBadge label="+1 Hit" />
          <ModifierBadge label="+1 Wound" />
          <ModifierBadge label="Reroll Hit" />
          <ModifierBadge label="Reroll Wound" />
          <ModifierBadge label="Lethal Hits" />
          <ModifierBadge label="Sustained Hits" />
          <ModifierBadge label="Dev Wounds" tone="warn" />
          <ModifierBadge label="Fights First" tone="signal" />
          <ModifierBadge label="Fight on Death" tone="signal" />
          <ModifierBadge label="Heal D3" tone="good" />
        </div>
      </Block>

      <Block label="Condition pills">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <ConditionPill kind="cond">charged</ConditionPill>
          <ConditionPill kind="cond">target is Vehicle</ConditionPill>
          <ConditionPill kind="cond">below half-strength</ConditionPill>
          <ConditionPill kind="cond">Leader attached</ConditionPill>
          <ConditionPill kind="once">Once / battle</ConditionPill>
          <ConditionPill kind="once">Once / phase</ConditionPill>
          <ConditionPill kind="cp">Requires 2 CP</ConditionPill>
        </div>
      </Block>

      <Block label="CP token · Kind tag">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <CPCost n={1} />
          <CPCost n={2} />
          <CPCost n={3} />
          <span style={{ width: 1, height: 16, background: 'var(--border-faint)' }} />
          <KindTag kind="melee" />
          <KindTag kind="ranged" />
        </div>
      </Block>

      <Block label="Phase nav · active state">
        <div style={{ background: 'var(--bg-app)' }}>
          <PhaseNav
            phases={PHASES}
            activeId="fight"
            onChange={() => {}}
          />
        </div>
      </Block>
    </div>
  );
}

function Block({ label, children }) {
  return (
    <div>
      <Eyebrow style={{ marginBottom: 10 }}>{label}</Eyebrow>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Row prototypes
   ───────────────────────────────────────────────────────────── */

function RowPrototypesCard() {
  const weapon = ROSTER.fight[0].weapons[0];
  const ability = ROSTER.fight[0].abilities[0];
  const strat = ROSTER.fight[0].stratagems[0];

  return (
    <div style={{
      background: 'var(--bg-app)',
      color: 'var(--fg)',
      fontFamily: 'var(--f-ui)',
      padding: '24px 28px',
      height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 22,
      overflow: 'auto',
    }}>
      <div>
        <Eyebrow>Molecules</Eyebrow>
        <DisplayTitle>Row types</DisplayTitle>
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 8 }}>WeaponProfileRow</Eyebrow>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-faint)', borderRadius: 'var(--r-4)' }}>
          <WeaponProfileRow weapon={weapon} />
        </div>
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 8 }}>RuleItem</Eyebrow>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-faint)', borderRadius: 'var(--r-4)' }}>
          <RuleItem rule={ability} />
        </div>
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 8 }}>StratagemItem</Eyebrow>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-faint)', borderRadius: 'var(--r-4)', overflow: 'hidden' }}>
          <StratagemItem strat={strat} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Unit states card — collapsed vs expanded
   ───────────────────────────────────────────────────────────── */

function UnitStatesCard() {
  const u1 = ROSTER.fight[1]; // Ironclad Walker
  const u2 = ROSTER.fight[0]; // Assault Veterans

  return (
    <div style={{
      background: 'var(--bg-app)',
      color: 'var(--fg)',
      fontFamily: 'var(--f-ui)',
      padding: '24px 0 24px',
      height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 18,
      overflow: 'auto',
    }}>
      <div style={{ padding: '0 28px' }}>
        <Eyebrow>UnitPhaseSection</Eyebrow>
        <DisplayTitle>Collapsed & expanded</DisplayTitle>
      </div>

      <div>
        <div style={{ padding: '0 28px', marginBottom: 6 }}>
          <Eyebrow>Collapsed</Eyebrow>
        </div>
        <UnitPhaseSection unit={u1} defaultOpen={false} />
        <UnitPhaseSection unit={ROSTER.fight[2]} defaultOpen={false} />
      </div>

      <div>
        <div style={{ padding: '0 28px', marginBottom: 6 }}>
          <Eyebrow>Expanded</Eyebrow>
        </div>
        <UnitPhaseSection unit={u2} defaultOpen={true} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function Eyebrow({ children, style }) {
  return (
    <div className="bf-eyebrow" style={style}>{children}</div>
  );
}

function DisplayTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: 'var(--f-display)',
      fontStyle: 'italic',
      fontWeight: 400,
      fontSize: 30,
      letterSpacing: '-0.015em',
      lineHeight: 1.05,
      margin: '2px 0 0',
      color: 'var(--fg)',
    }}>{children}</h2>
  );
}

Object.assign(window, {
  ColorTokensCard, TypeSpecimenCard, ComponentVariantsCard,
  RowPrototypesCard, UnitStatesCard,
});
