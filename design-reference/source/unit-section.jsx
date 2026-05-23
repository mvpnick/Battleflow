/* global React, WeaponProfileRow, RuleItem, StratagemItem, ReminderRow, SubSection, ModifierBadge */
// Battleflow · UnitPhaseSection + DetailDrawer

const { useState: useState2, useEffect: useEffect2 } = React;

/* ─────────────────────────────────────────────────────────────
   UnitPhaseSection — collapsible unit card
   ───────────────────────────────────────────────────────────── */

function UnitPhaseSection({ unit, defaultOpen = false, onOpenDetail }) {
  const [open, setOpen] = useState2(defaultOpen);

  const counts = {
    weapons: unit.weapons?.length || 0,
    rules: unit.abilities?.length || 0,
    strat: unit.stratagems?.length || 0,
  };

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border-faint)',
      borderRadius: 'var(--r-4)',
      margin: '0 12px 10px',
      overflow: 'hidden',
      boxShadow: 'var(--elev-1)',
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        className="bf-press"
        style={{
          padding: '12px 14px 12px',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 6,
          position: 'relative',
        }}
      >
        {/* row 1: caret + name + tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 14, height: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-mute)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .15s ease',
            flexShrink: 0,
          }}>
            <svg width="8" height="10" viewBox="0 0 8 10">
              <path d="M1 1l5 4-5 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div style={{
            fontSize: 'var(--t-lg)',
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.015em',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{unit.name}</div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {unit.tags.slice(0, 2).map(t => (
              <span key={t} style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.1em',
                color: 'var(--fg-mute)',
                padding: '2px 5px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-faint)',
                borderRadius: 2,
                lineHeight: 1.1,
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* row 2: role + counts */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingLeft: 22,
          fontSize: 12,
          color: 'var(--fg-mute)',
        }}>
          <span style={{ color: 'var(--fg-soft)' }}>{unit.role}</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>
            <span style={{ color: 'var(--fg)' }}>{unit.models}</span>
            <span style={{ marginLeft: 2, color: 'var(--fg-dim)' }}>mdl</span>
          </span>
        </div>

        {/* row 3: signal summary (collapsed only) */}
        {!open && (
          <div style={{
            paddingLeft: 22,
            display: 'flex', alignItems: 'center', gap: 6,
            flexWrap: 'wrap',
          }}>
            <CountChip n={counts.weapons} label="weapons" tone="ranged" />
            <CountChip n={counts.rules}   label="rules" />
            {counts.strat > 0 && (
              <CountChip n={counts.strat} label="strat" tone="signal" />
            )}
            {unit.hot?.map((h, i) => (
              <span key={i} style={{
                fontFamily: 'var(--f-ui)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--modifier)',
                background: 'var(--modifier-dim)',
                border: '1px solid var(--modifier-line)',
                borderRadius: 2,
                padding: '2px 5px',
                lineHeight: 1.1,
              }}>{h}</span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-faint)', background: 'var(--surface-1)' }}>
          {/* Weapons */}
          {unit.weapons?.length > 0 && (
            <SubSection label="Weapons" count={unit.weapons.length}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {unit.weapons.map((w, i) => (
                  <div key={w.name} style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-faint)',
                  }}>
                    <WeaponProfileRow
                      weapon={w}
                      onOpen={() => onOpenDetail?.({ kind: 'weapon', data: w, unit })}
                    />
                  </div>
                ))}
              </div>
            </SubSection>
          )}

          {/* Abilities */}
          {unit.abilities?.length > 0 && (
            <>
              <hr className="bf-rule" />
              <SubSection label="Abilities" count={unit.abilities.length}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {unit.abilities.map((r, i) => (
                    <div key={r.name} style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-faint)',
                    }}>
                      <RuleItem
                        rule={r}
                        onOpen={() => onOpenDetail?.({ kind: 'ability', data: r, unit })}
                      />
                    </div>
                  ))}
                </div>
              </SubSection>
            </>
          )}

          {/* Stratagems */}
          {unit.stratagems?.length > 0 && (
            <>
              <hr className="bf-rule" />
              <SubSection label="Stratagems" count={unit.stratagems.length}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {unit.stratagems.map((s, i) => (
                    <div key={s.name} style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-faint)',
                    }}>
                      <StratagemItem
                        strat={s}
                        onOpen={() => onOpenDetail?.({ kind: 'stratagem', data: s, unit })}
                      />
                    </div>
                  ))}
                </div>
              </SubSection>
            </>
          )}

          {/* Reminders */}
          {unit.reminders?.length > 0 && (
            <>
              <hr className="bf-rule" />
              <SubSection label="Reminders">
                {unit.reminders.map((r, i) => (
                  <ReminderRow key={i} text={r.text} />
                ))}
              </SubSection>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CountChip({ n, label, tone }) {
  const color = tone === 'ranged' ? 'var(--fg)'
    : tone === 'signal' ? 'var(--signal)'
    : 'var(--fg)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 3,
      fontFamily: 'var(--f-mono)',
      fontSize: 11,
      color: 'var(--fg-mute)',
      letterSpacing: '0.01em',
      lineHeight: 1.1,
    }}>
      <span style={{ color, fontWeight: 600 }}>{n}</span>
      <span style={{ fontSize: 10 }}>{label}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   DetailDrawer — bottom sheet
   ───────────────────────────────────────────────────────────── */

function DetailDrawer({ open, payload, onClose }) {
  if (!open || !payload) return null;
  const { kind, data, unit } = payload;

  return (
    <>
      {/* scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--overlay)',
          backdropFilter: 'blur(2px)',
          zIndex: 50,
          animation: 'bfFadeIn .15s ease',
        }}
      />
      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--surface-1)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        boxShadow: 'var(--elev-drawer)',
        borderTop: '1px solid var(--border)',
        zIndex: 51,
        maxHeight: '76%',
        display: 'flex', flexDirection: 'column',
        animation: 'bfSlideUp .22s cubic-bezier(.2,.85,.25,1)',
      }}>
        {/* grabber */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '10px 0 6px',
        }}>
          <div style={{
            width: 44, height: 4,
            background: 'var(--border-strong)',
            borderRadius: 4,
          }} />
        </div>

        {/* header */}
        <div style={{
          padding: '6px 18px 14px',
          borderBottom: '1px solid var(--border-faint)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 6,
          }}>
            <span style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-dim)',
            }}>
              {labelForKind(kind)} · {unit?.name}
            </span>
            <button onClick={onClose} style={{
              appearance: 'none', border: 0, background: 'transparent',
              color: 'var(--fg-mute)', cursor: 'pointer',
              fontFamily: 'var(--f-mono)', fontSize: 11,
              padding: 4,
            }}>✕</button>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {kind === 'stratagem' && <CPCost n={data.cp} />}
            <h2 style={{
              fontFamily: 'var(--f-display)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              color: 'var(--fg)',
              margin: 0,
              letterSpacing: '-0.015em',
              lineHeight: 1.1,
            }}>{data.name}</h2>
          </div>
        </div>

        {/* body */}
        <div style={{
          padding: '14px 18px 24px',
          overflow: 'auto',
          flex: 1,
        }}>
          {kind === 'weapon' && (
            <>
              <DrawerField label="Profile">
                <StatRow stats={data.stats} />
              </DrawerField>
              <DrawerField label="Keywords">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {data.tags.map(t => (
                    <span key={t} style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      color: 'var(--fg-soft)',
                      textTransform: 'uppercase',
                      padding: '3px 7px',
                      border: '1px solid var(--border)',
                      borderRadius: 2,
                    }}>{t}</span>
                  ))}
                </div>
              </DrawerField>
              {data.mods?.length > 0 && (
                <DrawerField label="Active Modifiers">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.mods.map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-faint)',
                        borderRadius: 'var(--r-2)',
                      }}>
                        <ModifierBadge label={m.label} />
                        <span style={{
                          fontSize: 12, color: 'var(--fg-mute)', fontStyle: 'italic',
                        }}>{m.cond}</span>
                      </div>
                    ))}
                  </div>
                </DrawerField>
              )}
            </>
          )}

          {(kind === 'ability' || kind === 'stratagem') && (
            <>
              <DrawerField label="Effect">
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--fg-soft)',
                }}>{data.effect}</p>
              </DrawerField>
              <DrawerField label="Timing">
                <span style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  color: 'var(--fg)',
                }}>{data.timing}</span>
              </DrawerField>
              <DrawerField label="Conditions">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {data.cond && <ConditionPill kind="cond">{data.cond}</ConditionPill>}
                  {data.once === 'battle' && <ConditionPill kind="once">Once / battle</ConditionPill>}
                  {data.once === 'phase' && <ConditionPill kind="once">Once / phase</ConditionPill>}
                  {kind === 'stratagem' && <ConditionPill kind="cp">Requires {data.cp} CP</ConditionPill>}
                </div>
              </DrawerField>
              <DrawerField label="Affected">
                <span style={{
                  fontSize: 13,
                  color: 'var(--fg-soft)',
                }}>{unit?.name}</span>
              </DrawerField>
              <DrawerField label="Source">
                <span style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-mute)',
                }}>{data.source}</span>
              </DrawerField>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="bf-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function labelForKind(k) {
  if (k === 'weapon') return 'Weapon';
  if (k === 'ability') return 'Ability';
  if (k === 'stratagem') return 'Stratagem';
  if (k === 'modifier') return 'Modifier';
  return '';
}

// keyframes injected once
if (typeof document !== 'undefined' && !document.getElementById('bf-anim')) {
  const s = document.createElement('style');
  s.id = 'bf-anim';
  s.textContent = `
    @keyframes bfFadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes bfSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { UnitPhaseSection, DetailDrawer, CountChip, DrawerField });
