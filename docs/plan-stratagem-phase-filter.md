# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Restore stratagem phase filtering across the roster view. Detachment stratagems show only on phase tabs they apply to (phase-specific first, "any phase" ones last). Per-unit stratagems inside unit cards are filtered the same way. The `PhaseSummary` count automatically reflects the filtered total.

## Critical Decisions
- **Shared utility in `lib/stratagems.ts`**: `stratagemMatchesPhase` is needed in two places (`PhaseReferenceScreen` and `UnitPhaseSection`), so it lives in a shared module rather than being duplicated.
- **Keyword heuristic, not a structured phase field**: `Strat.timing` is Wahapedia prose with no dedicated phase field. Keyword-matching (`t.includes('fight')`, etc.) is the established approach per `AGENTS.md` and handles the full real-world timing corpus correctly.
- **Sorting in `PhaseReferenceScreen`, not in `PhaseStratagemSection`**: The sort (phase-specific first, any-phase last) is a caller concern; `PhaseStratagemSection` stays a pure renderer.
- **`PhaseSummary` count needs no change**: it already receives `stratagemCount={phaseStratagems.length}` — once the filtered array is passed, the count is automatically correct.

---

## Tasks

- [x] ✅ **Step 1: Create shared `stratagemMatchesPhase` utility**
  - [x] ✅ Create `lib/stratagems.ts` with `PHASE_KEYWORDS: Record<PhaseId, string>` and `stratagemMatchesPhase(timing, phase): boolean` — no phase keyword in timing → `true` (show everywhere); phase keyword present → `true` only if it includes the active phase's keyword

- [x] ✅ **Step 2: Restore phase filter + sort in `PhaseReferenceScreen`**
  - [x] ✅ Import `stratagemMatchesPhase` and replace the current no-op `const phaseStratagems = effectiveStratagems` with a filtered + sorted list: phase-specific stratagems first, "any phase" stratagems last
  - [x] ✅ Pass `phase` as a new prop to each `UnitPhaseSection` render

- [x] ✅ **Step 3: Filter unit stratagems inside `UnitPhaseSection`**
  - [x] ✅ Add `phase: PhaseId` to the component's `Props` interface
  - [x] ✅ Derive `visibleStratagems = unit.stratagems.filter(s => stratagemMatchesPhase(s.timing, phase))` and use it in place of `unit.stratagems` for both the count chip and the rendered list
