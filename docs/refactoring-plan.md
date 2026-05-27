# Refactoring Plan

**Overall Progress:** `100%` ✅

## TLDR
Five targeted refactors across the data model, ingest pipeline, and UI layer. The two red items (schema/type duplication + the loader layer violation) are tackled as one combined step since they're tightly coupled. The three yellow items are independent and low-risk.

## Critical Decisions

- **Schemas live in `lib/schemas.ts` (new file), types derived via `z.infer<>`** — Keeps Zod out of `lib/dataModel.ts` (which stays as the TypeScript-only contract), gives the runtime loader a clean import target that's not inside `ingest/`, and makes `ingest/normalize.ts` a consumer of the schema file rather than the source of truth for both.
- **`ingest/normalize.ts` re-exports from `lib/schemas.ts`** — Ingest code that currently imports schemas from `normalize.ts` (e.g., `emit.ts`, tests) keeps working without path changes; only `loader.ts` changes its import target.
- **`PhaseReferenceScreen` stays one component** — A single `resolved` object replaces the 6 `effective*` vars. No new file needed; the dual-mode behaviour is correct, just expressed awkwardly.
- **`openIds` key is a composite string `${source}::${name}`** — Matches the existing React `key` pattern (`${strat.source}-${strat.name}`) to ensure uniqueness across detachments.

---

## Tasks

- [x] 🟩 **Step 1: Unify Zod schemas and TypeScript types (Red #1 + #2)** ✅
  - [x] 🟩 Create `lib/schemas.ts`: all Zod schemas + `z.infer<>` derived types
  - [x] 🟩 `lib/types.ts`: re-exports schema-derived leaf types; UI types stay inline
  - [x] 🟩 `lib/dataModel.ts`: thin re-export hub (no more duplicate definitions)
  - [x] 🟩 `lib/data/loader.ts`: imports schemas from `../schemas` (not ingest layer)
  - [x] 🟩 `lib/ingest/normalize.ts`: imports from `../schemas`, re-exports 4 public schemas, keeps only `toFactionArtifact()`
  - [x] 🟩 `emit.ts` + `artifacts.test.ts`: no path changes needed (re-exports cover them) — 25 tests pass, build clean

- [x] 🟩 **Step 2: Fix stratagem open-state key collision (Yellow #5)** ✅
  - [x] 🟩 `openIds` uses composite `${strat.source}::${strat.name}`; helper `openKey()` centralises the formula; matches the React card `key`

- [x] 🟩 **Step 3: Simplify `PhaseReferenceScreen` dual-mode (Yellow #4)** ✅
  - [x] 🟩 Single `resolved` object replaces 6 `effective*` vars; `isDemo` eliminated; all JSX uses `resolved.*`

- [x] 🟩 **Step 4: Extract `deriveFactionKeywords` from `cli.ts` (Yellow #3)** ✅
  - [x] 🟩 `lib/ingest/keywords.ts` — pure `deriveFactionKeywords(chain, units, slug, index)` + exported `ChainEntry` type
  - [x] 🟩 `lib/ingest/cli.ts` — imports `ChainEntry` + `deriveFactionKeywords` from `keywords.ts`; 50-line inline block replaced with one call
  - [x] 🟩 `lib/ingest/__tests__/keywords.test.ts` — 4 tests: single-match, tie-break by unit count, sub-keyword inclusion, sub-keyword exclusion — all pass
