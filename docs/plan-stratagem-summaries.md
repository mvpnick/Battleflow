# Stratagem Mechanical Summary Generation Plan

**Overall Progress:** `97%` — bug fixes applied + manifest repaired; Step 5 (review & commit) is all that remains

## TLDR
Replace the current roleplay-fluff `summary` fields on all stratagem entries with ultra-terse mechanical descriptions, so collapsed stratagem cards convey gameplay impact at a glance. A one-off Claude API script processes the ~965 unique effect texts, deduplicates work, asks for human guidance when compression is ambiguous, then writes results back to all faction and shared JSON files.

## Critical Decisions
- **Terse over verbose:** Summaries should be as short as possible while remaining unambiguous — "-1 to AP" not "Worsen AP of all incoming attacks by 1". When in doubt, compress further.
- **Preserve game-term capitalisation:** Keywords like `[LETHAL HITS]`, `INFANTRY`, `Battle-shocked`, `Engagement Range` stay capitalised exactly as they appear in the effect text.
- **Core stratagems untouched:** `lib/data/coreStratagems.ts` already has hand-written mechanical summaries — the script skips them entirely.
- **Deduplicate before calling the API:** Build a map of unique effect texts first; generate one summary per unique effect, then fan out to all duplicate entries. Avoids paying for the same generation ~335 times.
- **Human-in-the-loop for ambiguous cases:** When the script cannot confidently compress an effect to a single short phrase, it pauses and shows the user 2–3 candidate phrasings and asks which to use (or to supply their own). This keeps the output consistent with the project's voice.
- **In-place JSON rewrite:** Update `summary` fields directly in the existing faction and shared JSON files — no new files, no schema changes.

## Tasks

- [x] ✅ **Step 1: Build the deduplication map**
  - [x] ✅ Walk all `public/data/factions/*.json` and `public/data/shared/*.json`
  - [x] ✅ Build a `Map<effectHash, { name, effect, locations: [{filePath, detIndex, stratIndex}] }>` of the ~965 unique effects
  - [x] ✅ Skip any entry whose name matches a core stratagem (from `coreStratagems.ts`)

- [x] ✅ **Step 2: Write the generation script**
  - [x] ✅ New file: `lib/ingest/summariseCli.ts` (follows pattern of existing CLI scripts)
  - [x] ✅ System prompt instructs Claude to output only the terse summary — no explanation, no punctuation beyond what the mechanic needs
  - [x] ✅ Include in the prompt: the stratagem name, effect text, and a few worked examples showing the target style:
    - `"Until the attacking unit has finished making its attacks, each time an attack targets your unit, worsen the Armour Penetration characteristic of that attack by 1."` → `"-1 to AP on all incoming attacks"`
    - `"Until the end of the phase, weapons equipped by models in your unit have the [LETHAL HITS] ability."` → `"Grant [LETHAL HITS] to unit's weapons"`
    - `"That unit can attempt to Fall Back, and when doing so its models can move through models from enemy units … That unit can then act normally this turn."` → `"Fall Back through enemies; act normally this turn"`
  - [x] ✅ Added `npm run ingest:summarise` script to `package.json`

- [x] ✅ **Step 3: Implement human-in-the-loop prompting**
  - [x] ✅ After each API response, if the generated summary is over 60 chars or contains hedging phrases ("may", "depending on", parenthetical clauses), surface it to the user interactively
  - [x] ✅ Accepted / user-supplied answers are written to `docs/summary-overrides.json` so re-runs don't re-ask; persisted after each entry so progress survives interruption
  - [x] ✅ `--dry-run` flag (preview output without writing files); `--no-interactive` to skip human review

- [x] ✅ **Step 4: Write results back to JSON files**
  - [x] ✅ For each unique effect, update `summary` on every location in the deduplication map
  - [x] ✅ Each file is read once, all targeted stratagems patched in memory, then written back (atomic, no partial corruption)
  - [x] ✅ Logs: X files updated, Y stratagems rewritten, Z generated, W from cache, V human-reviewed

- [x] ✅ **Bug fix A: `summariseCli.ts` must update `manifest.json` after rewriting faction files**
  - [x] ✅ `applyResults` now returns `fileHashes: Map<path, {sha256, bytes}>` for every file written
  - [x] ✅ `main()` reads the manifest, patches every affected faction + shared-set entry, and writes it back
  - [x] ✅ Without this, `?v=<sha256>` cache-bust URLs stay stale; browsers/CDN serve old files forever

- [x] ✅ **Bug fix B: detachment stratagems must not be filtered by phase**
  - [x] ✅ Removed `PHASE_WORDS` / `stratagemMatchesPhase` prose heuristic from `PhaseReferenceScreen`
  - [x] ✅ All detachment stratagems now show on every phase — no faction stratagems hidden behind phase filter

- [ ] 🟥 **Step 5: Review and commit**
  - [ ] 🟥 `git diff public/data/` — spot-check a handful of factions to confirm summaries look right
  - [ ] 🟥 Verify collapsed cards in the UI show the new summaries (`npm run dev`)
  - [ ] 🟥 Commit updated JSON files and the new script
