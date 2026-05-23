/* global React */
// Battleflow · Core components
// Atomic pieces shared by every screen.

const { useState, useEffect, useRef } = React;

/* ─────────────────────────────────────────────────────────────
   PhaseNav — sticky horizontal segmented control
   ───────────────────────────────────────────────────────────── */

function PhaseNav({ phases, activeId, onChange, compact = false }) {
  return (
    <div style={{
      background: 'rgba(14,16,20,0.92)',
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      borderBottom: '1px solid var(--border-faint)',
      padding: '10px 12px 12px',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2px 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="bf-eyebrow">Phase</span>
          <span style={{
            fontFamily: 'var(--f-display)',
            fontStyle: 'italic',
            fontSize: 'var(--t-xl)',
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            {phases.find(p => p.id === activeId)?.name}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 'var(--t-xs)',
          color: 'var(--fg-dim)',
          letterSpacing: '0.04em',
        }}>
          {phases.find(p => p.id === activeId)?.n}/6
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${phases.length}, 1fr)`,
        gap: 4,
        background: 'var(--surface-1)',
        border: '1px solid var(--border-faint)',
        borderRadius: 'var(--r-3)',
        padding: 3,
      }}>
        {phases.map(p => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onChange?.(p.id)}
              className="bf-press"
              style={{
                appearance: 'none',
                border: 0,
                background: active ? 'var(--signal-dim)' : 'transparent',
                color: active ? 'var(--signal)' : 'var(--fg-mute)',
                borderRadius: 'var(--r-2)',
                padding: '8px 0 7px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2,
                minHeight: 44,
                position: 'relative',
                fontFamily: 'var(--f-ui)',
                boxShadow: active ? 'inset 0 0 0 1px var(--signal-line)' : 'none',
                transition: 'background-color .15s, color .15s',
              }}
            >
              <span style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.06em',
                opacity: 0.7,
                marginBottom: 1,
              }}>{p.n.toString().padStart(2, '0')}</span>
              <span style={{
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>{p.abbr}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ModifierBadge — visually distinct modifier pill
   ───────────────────────────────────────────────────────────── */

function ModifierBadge({ label, tone = 'modifier', dense = false }) {
  // tone: modifier (steel cyan), signal (amber), warn (rust), good
  const colorVar = `var(--${tone})`;
  const dimVar   = `var(--${tone}-dim)`;
  const lineVar  = `var(--${tone}-line)`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--f-ui)',
      fontSize: dense ? 10 : 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: colorVar,
      background: dimVar,
      border: `1px solid ${lineVar}`,
      borderRadius: 'var(--r-1)',
      padding: dense ? '2px 5px' : '3px 7px',
      lineHeight: 1.1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: 1,
        background: colorVar,
        flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   ConditionPill — small dashed pill for conditional availability
   ───────────────────────────────────────────────────────────── */

function ConditionPill({ children, kind = 'cond' }) {
  // kind: cond (neutral dashed) | once (rust solid) | cp (amber)
  let bg, border, color, prefix;
  if (kind === 'once') {
    bg = 'var(--warn-dim)';
    border = '1px solid var(--warn-line)';
    color = 'var(--warn)';
    prefix = '⊘';
  } else if (kind === 'cp') {
    bg = 'var(--signal-dim)';
    border = '1px solid var(--signal-line)';
    color = 'var(--signal)';
    prefix = null;
  } else {
    bg = 'transparent';
    border = '1px dashed var(--border-strong)';
    color = 'var(--fg-soft)';
    prefix = 'if';
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--f-ui)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.01em',
      color,
      background: bg,
      border,
      borderRadius: 999,
      padding: '2px 8px',
      lineHeight: 1.3,
      whiteSpace: 'nowrap',
    }}>
      {prefix && kind === 'once' && (
        <span style={{ fontSize: 10, opacity: 0.9 }}>{prefix}</span>
      )}
      {prefix && kind === 'cond' && (
        <span style={{
          fontFamily: 'var(--f-display)', fontStyle: 'italic',
          fontSize: 12, opacity: 0.65, marginRight: -1,
        }}>{prefix}</span>
      )}
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   CPCost — chunky amber CP token
   ───────────────────────────────────────────────────────────── */

function CPCost({ n }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: 'var(--f-mono)',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--signal)',
      background: 'var(--signal-dim)',
      border: '1px solid var(--signal-line)',
      borderRadius: 'var(--r-1)',
      padding: '3px 6px',
      letterSpacing: '0.04em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontWeight: 800, fontSize: 12 }}>{n}</span>
      <span style={{ opacity: 0.75, fontSize: 9, fontWeight: 600 }}>CP</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   KindTag — MELEE / RANGED indicator
   ───────────────────────────────────────────────────────────── */

function KindTag({ kind }) {
  const isMelee = kind === 'melee';
  const color = isMelee ? 'var(--melee)' : 'var(--ranged)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--f-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color,
      lineHeight: 1,
    }}>
      <span style={{
        width: 6, height: 6,
        background: color,
        transform: isMelee ? 'rotate(45deg)' : 'none',
        borderRadius: isMelee ? 1 : '50%',
        flexShrink: 0,
      }} />
      {isMelee ? 'Melee' : 'Ranged'}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   StatRow — dot-separated mono stat strip for a weapon
   ───────────────────────────────────────────────────────────── */

function StatRow({ stats }) {
  const entries = Object.entries(stats);
  return (
    <div className="bf-stat" style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
      rowGap: 2,
    }}>
      {entries.map(([k, v], i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="dot">·</span>}
          <span>
            <span className="lbl">{k}</span>
            <span style={{ color: 'var(--fg)', fontWeight: 600, marginLeft: 3 }}>{v}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WeaponProfileRow — dense weapon block
   ───────────────────────────────────────────────────────────── */

function WeaponProfileRow({ weapon, onOpen }) {
  return (
    <div
      onClick={onOpen}
      className="bf-press"
      style={{
        padding: '10px 14px 12px',
        cursor: onOpen ? 'pointer' : 'default',
      }}
    >
      {/* name + kind */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <div style={{
          fontFamily: 'var(--f-ui)',
          fontSize: 'var(--t-md)',
          fontWeight: 600,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
        }}>{weapon.name}</div>
        <KindTag kind={weapon.kind} />
      </div>

      {/* stat strip */}
      <StatRow stats={weapon.stats} />

      {/* weapon tags */}
      {weapon.tags?.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          marginTop: 6,
        }}>
          {weapon.tags.map(t => (
            <span key={t} style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'var(--fg-mute)',
              textTransform: 'uppercase',
              padding: '2px 6px',
              border: '1px solid var(--border-faint)',
              borderRadius: 2,
              lineHeight: 1.2,
            }}>{t}</span>
          ))}
        </div>
      )}

      {/* applied modifiers */}
      {weapon.mods?.length > 0 && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px dashed var(--border-faint)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {weapon.mods.map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              flexWrap: 'wrap',
            }}>
              <ModifierBadge label={m.label} dense />
              {m.cond && (
                <span style={{
                  fontFamily: 'var(--f-ui)',
                  fontSize: 11,
                  color: 'var(--fg-mute)',
                  fontStyle: 'italic',
                }}>{m.cond}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RuleItem — compact rule/ability row
   ───────────────────────────────────────────────────────────── */

function RuleItem({ rule, onOpen }) {
  return (
    <div
      onClick={onOpen}
      className="bf-press"
      style={{
        padding: '10px 14px',
        cursor: onOpen ? 'pointer' : 'default',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8, marginBottom: 3,
      }}>
        <div style={{
          fontSize: 'var(--t-md)',
          fontWeight: 600,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}>{rule.name}</div>
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--fg-dim)',
          flexShrink: 0,
        }}>{rule.source}</span>
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--fg-soft)',
        lineHeight: 1.4,
        marginBottom: 6,
      }}>{rule.effect}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {rule.cond && <ConditionPill kind="cond">{rule.cond}</ConditionPill>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   StratagemItem — CP cost prominent
   ───────────────────────────────────────────────────────────── */

function StratagemItem({ strat, onOpen }) {
  return (
    <div
      onClick={onOpen}
      className="bf-press"
      style={{
        padding: '10px 14px',
        cursor: onOpen ? 'pointer' : 'default',
        background: 'linear-gradient(to right, var(--signal-dim), transparent 35%)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CPCost n={strat.cp} />
          <div style={{
            fontSize: 'var(--t-md)',
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{strat.name}</div>
        </div>
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--fg-dim)',
          flexShrink: 0,
        }}>{strat.source}</span>
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--fg-soft)',
        lineHeight: 1.4,
        marginBottom: 6,
        paddingLeft: 2,
      }}>{strat.effect}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 2 }}>
        {strat.cond && <ConditionPill kind="cond">{strat.cond}</ConditionPill>}
        {strat.once === 'battle' && <ConditionPill kind="once">Once / battle</ConditionPill>}
        {strat.once === 'phase' && <ConditionPill kind="once">Once / phase</ConditionPill>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ReminderRow — tactical reminder
   ───────────────────────────────────────────────────────────── */

function ReminderRow({ text }) {
  return (
    <div style={{
      display: 'flex', gap: 8,
      padding: '8px 14px 10px',
      color: 'var(--fg-mute)',
      fontSize: 12,
      lineHeight: 1.4,
      fontStyle: 'italic',
    }}>
      <span style={{
        color: 'var(--fg-dim)',
        fontFamily: 'var(--f-mono)',
        fontStyle: 'normal',
        flexShrink: 0,
      }}>※</span>
      <span>{text}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SectionHeader — small caps label inside a unit card
   ───────────────────────────────────────────────────────────── */

function SubSection({ label, count, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 6,
        padding: '10px 14px 4px',
      }}>
        <span className="bf-eyebrow">{label}</span>
        {count != null && (
          <span style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--fg-dim)',
          }}>· {count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, {
  PhaseNav, ModifierBadge, ConditionPill, CPCost, KindTag, StatRow,
  WeaponProfileRow, RuleItem, StratagemItem, ReminderRow, SubSection,
});
