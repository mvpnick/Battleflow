# Unit Abilities — Phase 2: Presentation

**Overall Progress:** `100%` ✅ — Core strip, nested-group expanders, and the Damaged row
shipped in `UnitPhaseSection`; structured abilities + `damaged` plumbed through `buildRoster`
to the UI `Unit`. `tsc` clean, 115/115 tests green, production build passes, reference units
(Be'lakor, Magnus, Silent King, Angron) verified against the committed data.

> Depends on [`unit-abilities-model-plan.md`](./unit-abilities-model-plan.md) (Phase 1)
> being shipped: the structured `category` / `group` / `damaged` fields must already
> exist on every unit before this phase consumes them.

## TLDR
Phase 1 made the ability data structured but kept rendering it flat. This phase turns
that structure into the UX win: **demote Core to a compact strip**, **nest themed
sub-ability groups** under a single expandable chip, and **promote Damaged to its own
row** — cutting Be'lakor from 13 equal-weight chips to a readable hierarchy. No data or
ingest changes here; presentation only, in `UnitPhaseSection.tsx`.

## Critical Decisions
- **Core → compact dim strip.** Core/universal abilities (Deep Strike, Stealth, …)
  render as a single muted keyword strip; tapping a keyword opens its (inline) text.
  Unique Datasheet abilities stay prominent chips.
- **Faction army-rule not shown per-unit.** It remains in the army-level reference
  section only (already enforced in Phase 1's flatten).
- **Themed groups nest.** A group renders as one chip (its name) that expands to its
  child abilities; the parent blurb, when present, heads the expansion.
- **Damaged → its own special row,** parallel to how Invuln folds into the stat line.
- **Resolved:** the Core strip **keeps today's phase-filter behaviour** — Core abilities
  flow through `abilityPhasesFor` exactly like datasheet abilities (passive ones surface on
  every tab, phase-worded ones bucket to their phase). Chosen for consistency with the rest of
  the decision menu, which is phase-filtered end to end; carving out a special always-on rule
  for Core would be a surprise.

## Tasks

- [x] ✅ **Step 1: Render decision in `UnitPhaseSection`**
  - [x] ✅ The UI `Unit` now carries the structured `abilities: UnitAbility[]` plus a
        separated `damaged?: Rule` (`lib/types.ts`); `buildRoster` stops flattening
        (`selectUnitAbilities` keeps category/group, drops only the army-level `faction`
        rule) and surfaces `damaged` as its own field on both the unit and its `full` copy.
        `findPlainInvulnSave` / `stripPlainInvulnSave` are now generic so they preserve the
        `UnitAbility` shape through invuln folding.
  - [x] ✅ `partitionAbilities` splits the (phase-filtered) list into three buckets rendered
        in order **Datasheet chips → group chips → Core strip**.

- [x] ✅ **Step 2: Compact Core strip**
  - [x] ✅ `CoreStrip` renders Core abilities as one muted, underlined keyword strip
        (`.coreStrip` / `.coreKeyword`) — visually subordinate to the filled Datasheet chips.
  - [x] ✅ Each keyword is a button opening the existing ability drawer with its inline text.
  - [x] ✅ Kept today's phase-filter behaviour (see resolved open question above).

- [x] ✅ **Step 3: Nested themed groups**
  - [x] ✅ `AbilityGroupChip` renders each group as one chip (name + child count + caret).
  - [x] ✅ Expanding reveals the parent blurb (when present) then each child as its own
        tappable `AbilityChip`; expansion state is local per chip.
  - [x] ✅ Mirrors the weapon "(choose one)" multi-group shape (header chip + indented,
        rule-bordered child column).
  - [x] ✅ **Group cohesion fix:** a themed group is one block, so the per-phase ability
        filter in `buildRoster` now pools each group's members' phases — a member is kept in
        a phase whenever *any* member of its group is relevant there. Without this the filter
        fragmented groups across tabs (Magnus's "Crimson King" showed 2 of 3: one member is a
        Shooting-phase ability, another a Movement-phase one). Covered by new regression tests
        in `buildRoster.test.ts`.

- [x] ✅ **Step 4: Damaged row**
  - [x] ✅ `full.damaged` renders as a dedicated "Damaged" `SubSection` in the expanded
        datasheet, placed next to the Profile it degrades (parallel to the invuln fold).
  - [x] ✅ Phase-1's interim carry-through is gone — `buildRoster` no longer folds Damaged
        into the ability stream; it rides on its own field.

- [x] ✅ **Step 5: Verify against the reference units**
  - [x] ✅ Confirmed against the committed data: Be'lakor (4 datasheet chips + 1 "Shadow
        Form" group w/ blurb + 3-keyword Core strip + Damaged row, down from 11 flat),
        Magnus ("Crimson King" ×3), Silent King ("Triarch Abilities" ×3), Angron ("Wrathful
        Presence" ×3 w/ blurb); Cultist Mob (no groups, no Damaged) stays clean.
  - [x] ✅ No army-rule duplication — `faction` is dropped in `buildRoster` and guarded again
        in `partitionAbilities`; all chips/keywords/Damaged route through the same drawer.
        `tsc` clean, 115/115 tests green, production build passes.
