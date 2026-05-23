# Handoff: Battleflow — Tabletop Companion Reference Sheet

## Overview

Battleflow is a mobile-first companion web app for a tabletop wargame. The user selects a **game phase** (Command / Movement / Shooting / Charge / Fight / Battleshock) and the app surfaces every roster-relevant weapon profile, modifier, ability, stratagem, and reminder for that phase — grouped by unit, in a dense scannable layout.

It is **not** a battlefield simulator. It does not track positions, charges, wounds, or model state. It is a **phase-filtered reference sheet** for what the player's army list is capable of doing at any given time.

## About the Design Files

The files in `source/` are **design references created in plain HTML + React-via-Babel** — prototypes that demonstrate the intended look, hierarchy, and interactions. They are NOT production code to copy directly.

The task is to **recreate these designs in the target codebase's existing environment** (e.g. React + Tailwind/Emotion/Vanilla Extract, React Native, SwiftUI, etc.) using whatever component primitives, styling system, and build tooling that project already uses. If the project has no existing environment yet, choose the most appropriate framework for the target platforms (phone-primary).

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, borders, and component states are all specified below. Recreate the UI pixel-faithfully in the target codebase's styling system.

## Screens / Views

### 1. Phase Reference Screen (mobile · primary)

**Purpose:** The screen the player looks at constantly during a turn. Shows every phase-relevant option for every unit on the roster, in collapsible cards.

**Layout** (top to bottom, full viewport):

1. **TopBar** — 44px tall, padding `10px 14px 4px`. Roster name + points on the left, CP meter + settings cog on the right. Background: `var(--bg-app)`.
2. **PhaseNav** — sticky. Two-row block:
   - **Eyebrow row** (~32px): small caps label "PHASE" + italic display name of the active phase + monospace "N/6" counter on the right.
   - **Segmented control** (44px tap target): six equal-width segments. Each segment stacks a two-digit ordinal (e.g. `01`) above the 3-letter abbreviation (`CMD`, `MOV`, `SHO`, `CHG`, `FGT`, `BSK`). Active segment fills with `--signal-dim`, inset `1px` ring in `--signal-line`, text in `--signal`.
   - Backdrop-filter blurred `rgba(14,16,20,0.92)` with bottom border `--border-faint`.
3. **PhaseSummary strip** — 1 row, 4 stat blocks (units / weapons / rules / strat). Each block is a vertical pair: large mono number above a 9px caps label. The "strat" stat is amber when > 0. Right side has an outline "EXPAND ALL" button.
4. **Scrollable unit list** — vertical stack of `UnitPhaseSection` cards, 10px gap, 12px horizontal margin.

**Components on this screen:**

- `TopBar` — see component spec below
- `PhaseNav` — see component spec below
- `PhaseSummary` — see component spec below
- `UnitPhaseSection` (repeating) — see component spec below
- `DetailDrawer` (modal) — opens over the whole screen when any row is tapped

### 2. Phase Reference Screen (tablet · adaptation)

**Purpose:** Same screen, wider viewport. Same visual language — does NOT become an admin dashboard.

**Changes from mobile:**

- **Header bar** is taller (~62px) with the brand mark + italic "Battleflow" wordmark + roster meta on the left, CP meter + outline button on the right.
- **Phase nav** is a full-width 6-segment row. Each tab is now larger: ordinal above the *full* phase name ("COMMAND" not "CMD"), 56px tall, with a 2px amber underline on the active tab.
- **Unit cards** lay out in a **two-column CSS grid** (`1fr 1fr`, no column gap — cards retain their own margins). On the widest desktop sizes consider three columns.
- **DetailDrawer** continues to be a bottom sheet (right-rail panel is an alternate not used here, but can be substituted).

### 3. Detail Drawer (bottom sheet)

**Purpose:** Tapping any weapon / ability / stratagem / modifier opens this. Should NOT navigate the user away from their phase context — the drawer overlays it.

**Layout:**

- Scrim: `var(--overlay)` with 2px backdrop blur, fades in over 150ms.
- Sheet: pinned bottom, max-height 76% of viewport, slides up over 220ms with `cubic-bezier(.2,.85,.25,1)`. Radius 20px top corners, top border `--border`, shadow `--elev-drawer`.
- **Grabber**: 44×4px rounded bar, centered, 10px top padding.
- **Header**: 
  - Eyebrow line: monospace caps `[KIND] · [UNIT NAME]` on the left, close button `✕` on the right.
  - Title line: optional CPCost token + Instrument Serif italic 26px title.
- **Body**: stack of `DrawerField` blocks (eyebrow label above content). Fields vary by payload:
  - **Weapon**: Profile (stat row), Keywords (mono pill row), Active Modifiers (each mod = surface-2 row with badge + italic condition).
  - **Ability / Stratagem**: Effect (paragraph), Timing (mono), Conditions (pill cluster including "Once / battle", "Once / phase", "Requires N CP"), Affected (unit name), Source (mono caps).

## Core Components

### `PhaseNav`

Sticky horizontal segmented control. 6 segments equal-width on mobile.

- Container: `padding: 10px 12px 12px`, background blurred dark, bottom border.
- Header row: eyebrow + display italic phase name + mono `N/6` counter.
- Segmented control: `grid-template-columns: repeat(6, 1fr)`, gap 4px, background `--surface-1`, border `--border-faint`, radius `--r-3`, padding 3px.
- Segment (button):
  - Inactive: transparent bg, color `--fg-mute`.
  - Active: `--signal-dim` bg, color `--signal`, inset 1px ring `--signal-line`.
  - Stacks 9px mono ordinal `01–06` above 11px uppercase 0.06em-tracked label.
  - Min-height 44px (tap target).
  - 150ms transitions on background/color.

### `UnitPhaseSection`

Collapsible unit card. Background `--surface-1`, border `--border-faint`, radius `--r-4`, shadow `--elev-1`.

**Collapsed header (always visible):**

- Row 1: 14×14 caret chevron (rotates 90° when open) → unit name (17px / weight 600 / -0.015em tracking) → up to 2 mono "TAG" chips on the right (`--surface-2` bg, faint border, 9px / 0.1em letter-spacing, 2×5px padding).
- Row 2 (indent 22px): unit role + `·` divider + mono `N mdl` count.
- Row 3 (collapsed only, indent 22px): horizontal cluster of `CountChip`s — `N weapons`, `N rules`, optional `N strat` (amber). Followed by any "hot" modifier highlights as small steel-cyan filled chips.

**Expanded body** (top border `--border-faint`):

- `SubSection` blocks separated by `bf-rule` hairlines:
  - **Weapons** — each `WeaponProfileRow` separated by 1px `--border-faint` lines.
  - **Abilities** — each `RuleItem` separated by 1px lines.
  - **Stratagems** — each `StratagemItem` (subtle left-to-right amber gradient bg).
  - **Reminders** — italic muted text rows prefixed with `※` symbol.
- Each SubSection has a small-caps eyebrow label with mono `· N` count.

### `WeaponProfileRow`

Dense weapon block. Padding `10px 14px 12px`.

- Top row: weapon name (15px / weight 600) + `KindTag` (small diamond for melee / circle for ranged + "Melee"/"Ranged" label) on the right.
- Stat row: dot-separated mono spec. Each pair is `LABEL` (`--fg-dim`, 12px mono) + value (`--fg`, weight 600). Separator: `·` in `--border-strong`.
- Keyword tags (if any): mono 9px uppercase tags in faint borders.
- **Active modifiers** (if any): dashed top border, then for each modifier: `ModifierBadge` + italic 11px condition text in `--fg-mute`.

### `RuleItem`

Ability / faction-rule row. Padding `10px 14px`.

- Top row: rule name (15px / weight 600) + source label on the right (mono 9px uppercase caps in `--fg-dim`).
- Effect (13px / `--fg-soft` / 1.4 line-height) — keep to 1–2 lines on mobile.
- `ConditionPill` cluster below.

### `StratagemItem`

Same shape as `RuleItem` with a subtle `linear-gradient(to right, var(--signal-dim), transparent 35%)` background. Always shows a `CPCost` token to the left of the name. Pills below include the standard condition + `Once / battle` or `Once / phase` if applicable.

### `ModifierBadge`

Distinct visual treatment for modifiers (+1 Hit, Reroll Wound, Lethal Hits, Dev Wounds, Fights First, etc.).

- Pill with 4×4 colored square dot + uppercase label.
- Color tones:
  - `modifier` (steel cyan) — default / numeric modifiers
  - `signal` (amber) — fight-first / fight-on-death
  - `warn` (rust) — Dev Wounds, dangerous keywords
  - `good` (cool green) — healing / positive buffs

Spec: 11px / weight 600 / 0.04em caps / `tone-dim` bg / 1px `tone-line` border / 3×7px padding / radius 4px.

### `ConditionPill`

Indicates conditional availability. Three kinds:

- `cond` (default) — dashed border `--border-strong`, transparent bg, color `--fg-soft`. Prefixed with italic serif "if".
- `once` — solid `--warn` palette, prefixed with `⊘` symbol. Labels: `Once / battle`, `Once / phase`.
- `cp` — solid amber `--signal` palette. Label: `Requires N CP`.

Spec: 11px / weight 500 / radius 999 / 2×8px padding.

### `CPCost`

Chunky amber CP token. `12px / weight 800` digit + small 9px "CP" label, both monospace, amber-on-amber-dim, 1px amber-line border, radius `--r-1`, 3×6px padding.

### `KindTag`

Tiny inline indicator for weapon type. Mono 9px / 0.12em caps. 6×6 colored square (melee: rotated diamond, warm `--melee`) or circle (ranged: cool `--ranged`).

## Interactions & Behavior

- **Tap phase segment** → switches active phase, replaces the unit list with that phase's units, scroll resets to top. 150ms color cross-fade.
- **Tap unit card header** → expands/collapses card. Caret rotates 90° (150ms ease). No layout shift in the header — only the body opens below.
- **Tap weapon / ability / stratagem row** → opens `DetailDrawer`. Scrim fades in (150ms). Sheet slides up (220ms cubic-bezier(.2,.85,.25,1)).
- **Tap drawer scrim or ✕** → reverse animation, drawer closes.
- **Tap "Expand All"** → opens every unit card in the current phase (single state toggle; same button can flip to "Collapse All" — not implemented in mock but obvious extension).
- All buttons / pressable rows have `-webkit-tap-highlight-color: transparent` + a `:active` background of `--surface-3` (the `.bf-press` class in `tokens.css`).
- All transitions: 120–150ms ease for color/background, 150ms ease for transforms, 220ms cubic-bezier(.2,.85,.25,1) for the drawer.

## State Management

For the mobile screen:

```ts
phase: 'command' | 'movement' | 'shooting' | 'charge' | 'fight' | 'battleshock'
openUnitIds: Set<string>   // which unit cards are expanded
drawerPayload: null | {
  kind: 'weapon' | 'ability' | 'stratagem' | 'modifier'
  data: WeaponT | RuleT | StratT
  unit: UnitT
}
```

Roster data is read-only from the user's saved list. Phase data is computed by filtering the full roster down to "what surfaces in this phase" (see `data.js` for the shape).

There is **no** battlefield state, no charge tracking, no wound tracking. The app only reads the roster and the selected phase.

## Design Tokens

All tokens are defined in `source/tokens.css` as CSS custom properties on `:root`.

### Color

**Surfaces** (cool-tinted near-black):
- `--bg-canvas: #0a0b0e`
- `--bg-app:    #0e1014`
- `--surface-1: #14171d`
- `--surface-2: #1a1e26`
- `--surface-3: #21262f`
- `--overlay:   rgba(8,10,14,0.72)`

**Borders:**
- `--border-faint:  #1d212a`
- `--border:        #262b36`
- `--border-strong: #3a4150`
- `--hairline:      rgba(255,255,255,0.06)`

**Text:**
- `--fg:      #ebecef` (primary)
- `--fg-soft: #c7cad1` (body)
- `--fg-mute: #8a8f9b` (secondary)
- `--fg-dim:  #5b6170` (eyebrow / mono captions)
- `--fg-stat: #b6bbc5` (stat values)

**Signal hues** (OKLCH, all sharing `0.79 lightness / 0.13 chroma` for matched weight, varying only hue):
- `--signal:   oklch(0.79 0.13 75)`  — amber, CP / active state
- `--modifier: oklch(0.78 0.07 220)` — steel cyan, modifiers
- `--warn:     oklch(0.71 0.16 30)`  — rust red, once-per-X
- `--good:     oklch(0.78 0.10 160)` — cool green, buffs
- `--melee:    oklch(0.78 0.07 30)`  — warm, melee weapon tag
- `--ranged:   oklch(0.78 0.08 250)` — cool, ranged weapon tag

Each signal hue has matched `-dim` (16% alpha) and `-line` (32% alpha) variants for fills and borders.

### Typography

Three families, loaded from Google Fonts:

| Var | Family | Weights | Role |
|---|---|---|---|
| `--f-display` | Instrument Serif | 400 italic | Editorial display — phase name in nav header, drawer titles, tablet wordmark |
| `--f-ui` | Geist | 400 / 500 / 600 / 700 | Body & UI |
| `--f-mono` | JetBrains Mono | 400 / 500 / 600 / 700 | Stats, ordinals, eyebrows, meta |

Substitutes in the target codebase are fine (e.g. `IBM Plex Sans` for Geist, `Source Serif Italic` for Instrument Serif) but pick characterful — do NOT swap in Inter / Roboto.

**Scale (mobile):**

| Token | Px | Use |
|---|---|---|
| `--t-2xl` | 28 | Phase display |
| `--t-xl` | 22 | Nav title (display italic) |
| `--t-lg` | 17 | Unit name |
| `--t-md` | 15 | Row title (weapon / rule / strat name) |
| `--t-base` | 14 | Body |
| `--t-sm` | 12 | Secondary copy, mono stats |
| `--t-xs` | 11 | Condition pills, meta |
| `--t-micro` | 10 | Small-caps eyebrow |

Eyebrow style: 10px / weight 600 / 0.14em tracking / uppercase / `--fg-dim`.

### Spacing

`--sp-1: 4` · `--sp-2: 6` · `--sp-3: 8` · `--sp-4: 10` · `--sp-5: 12` · `--sp-6: 16` · `--sp-7: 20` · `--sp-8: 24`

### Radius

`--r-1: 4` · `--r-2: 6` · `--r-3: 8` · `--r-4: 10` · `--r-5: 14` · `--r-6: 20`

Component-typical: pills use 999, buttons & chips use `--r-1`/`--r-2`, unit cards use `--r-4`, drawer uses 20px top.

### Elevation

- `--elev-1` — `inset 0 1px 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.3)` (unit cards)
- `--elev-2` — `inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.4)` (intro card)
- `--elev-drawer` — `0 -20px 40px rgba(0,0,0,0.5), inset 0 -1px 0 var(--border)` (drawer top edge)

## Assets

No image, icon, or font binaries. All visuals are drawn from:

- Three Google Fonts (Geist, JetBrains Mono, Instrument Serif).
- Inline SVG for the few glyphs (chevron, battery, signal bars, CP "!" — all simple primitives).

Icons throughout (KindTag squares/circles, ModifierBadge dots, ⊘, ※) are CSS-only geometry or single unicode characters — no icon set required. If the target codebase has an icon library and they prefer it for the chevron / close glyphs, swap freely; the geometric badge shapes (rotated diamond for melee, circle for ranged) are part of the visual language and should stay.

Sample content in `source/data.js` is **fictional** — generic fantasy/sci-fi flavor that follows the rule SHAPE of the game without copying any copyrighted text. Replace with real roster data on the consuming side.

## Sample Content

See `source/data.js` for the canonical shape of `PHASES`, `ROSTER[phase]`, and the unit / weapon / ability / stratagem objects. The expected fields per type are summarized below; the developer should treat this as a starting type contract and refine for the real data source.

```ts
type Phase = { id: string; n: number; abbr: string; name: string }
type Stats = Record<string, string>  // e.g. { R: '24"', A: '2', BS: '3+', S: '8', AP: '-3', D: '2' }
type Weapon = { name: string; kind: 'melee' | 'ranged'; stats: Stats; tags: string[]; mods: { label: string; cond?: string }[] }
type Rule  = { name: string; timing: string; cond?: string; effect: string; source: string }
type Strat = Rule & { cp: number; once?: 'battle' | 'phase' | false }
type Unit  = { id: string; name: string; role: string; models: number; tags: string[]; hot: string[]; weapons: Weapon[]; abilities: Rule[]; stratagems: Strat[]; reminders: { text: string }[] }
```

## Files in this bundle

All in `source/`:

| File | Purpose |
|---|---|
| `index.html` | Entry — loads fonts, tokens, then all scripts in order |
| `tokens.css` | All design tokens + primitive utility classes (`.bf-app`, `.bf-scroll`, `.bf-eyebrow`, `.bf-stat`, `.bf-rule`, `.bf-press`) |
| `data.js` | Sample roster: phases + fight / shooting content |
| `components.jsx` | Atoms + molecules: `PhaseNav`, `ModifierBadge`, `ConditionPill`, `CPCost`, `KindTag`, `StatRow`, `WeaponProfileRow`, `RuleItem`, `StratagemItem`, `ReminderRow`, `SubSection` |
| `unit-section.jsx` | `UnitPhaseSection` (collapsible card) + `DetailDrawer` (bottom sheet) |
| `screen.jsx` | Mobile `PhaseReferenceScreen` composing all of the above |
| `tablet.jsx` | Tablet adaptation `TabletScreen` |
| `system-cards.jsx` | Showcase / token-display cards (not part of the product; design-system documentation) |
| `app.jsx` | Design canvas that lays out all artboards |

Open `source/index.html` in any modern browser to view the design.

## Recreating in the target codebase — recommended approach

1. **Port tokens first.** Move every `--*` custom property from `tokens.css` into the codebase's token system (CSS variables, Tailwind theme config, SwiftUI Color extensions, etc.). The OKLCH signal-hue convention is the most important thing to preserve: all three accents share lightness/chroma so they sit at the same visual weight.
2. **Port atoms next.** `ModifierBadge`, `ConditionPill`, `CPCost`, `KindTag` — small, isolated, no dependencies. Get them rendering and visually matching before moving on.
3. **Then molecules.** `WeaponProfileRow`, `RuleItem`, `StratagemItem`. Each is a single function of its data.
4. **Then the organism.** `UnitPhaseSection` composes the molecules + manages its own open/closed state.
5. **Then the screen.** `PhaseReferenceScreen` wires phase state + drawer state at the top and renders the list.
6. **Then the drawer.** `DetailDrawer` as a portal/modal in the target framework.
7. **Then the tablet variant** — same components, different layout root.

The starter source uses inline `style={{...}}` heavily because the prototype was hand-authored. **Translate inline styles to whatever styling system the target codebase uses** — Tailwind classes, CSS Modules, vanilla-extract, styled-components, SwiftUI modifiers, etc. The values are accurate; just rehome them.
