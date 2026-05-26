# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Fix missing stratagems when importing New Recruit / BattleScribe format army lists. Three targeted changes: teach the parser to read the `+ KEY: value` header format, fix detachment matching to tolerate parenthetical suffixes, and add `factionName` as a keyword-matching fallback so the faction auto-resolves without the manual picker.

## Critical Decisions
- **Support both formats simultaneously** — detect New Recruit vs. GW My Army by presence of `+ FACTION KEYWORD:` / `+ DETACHMENT:` lines; no format flag needed, just try both patterns.
- **Strip parentheticals in the matcher, not the parser** — `buildRoster.ts` strips `(Warp Rifts)` during comparison only; the raw detachment string (`parsed.detachment`) is preserved as-is for display.
- **factionName fallback in RosterImport** — after keyword-array matching fails, check if any `factionName` normalizes to the parsed keyword; keeps existing keyword-array logic untouched as Tier 1.

## Tasks

- [x] ✅ **Step 1: Extend `parseGwText` to handle New Recruit format**
  - [x] ✅ Detect `+ FACTION KEYWORD: X` line and extract as `factionKeyword`
  - [x] ✅ Detect `+ DETACHMENT: X` line and extract as `detachment`
  - [x] ✅ Detect `+ TOTAL ARMY POINTS: Npts` line and extract as `totalPoints`
  - [x] ✅ Ensure existing `+++`/`[BRACKET]`/`==` patterns still work (both formats coexist)

- [x] ✅ **Step 2: Fix detachment matching to tolerate parenthetical suffixes**
  - [x] ✅ In `buildRoster.ts`, after exact `norm()` match fails, retry with the `(…)` suffix stripped from `parsed.detachment`

- [x] ✅ **Step 3: Add `factionName` as keyword-matching fallback in `RosterImport`**
  - [x] ✅ After keyword-array tiers produce no match, check `norm(f.factionName) === kwNorm`
  - [x] ✅ Slot this as Tier 3 before falling back to the manual picker

- [x] ✅ **Step 4: Add/update tests**
  - [x] ✅ Add a `parseGwText` test for New Recruit format input (asserts `factionKeyword`, `detachment`, `totalPoints`, and at least one unit)
  - [x] ✅ Add a `buildRoster` / detachment-matching test for `"Daemonic Incursion (Warp Rifts)"` → resolves to `"Daemonic Incursion"` stratagems
