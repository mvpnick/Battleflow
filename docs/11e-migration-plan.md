# Battleflow: Migrate from Warhammer 40k 10th Edition to 11th Edition

## Status (2026-08-25)

**Migration is fully complete and verified, but nothing is committed yet.** Phases 1–6
implemented; all of Phase 8 (steps 1–9) done for real against live 11e data (BSData commit
`46d8cc5`, Wahapedia scraped/merged, dedup run, summaries generated, tests/typecheck/UI smoke
test all clean). See the Rollout log at the bottom for the full detail.

**Next step: commit and ship.** `git status` currently shows ~63 changed files (code + all of
`public/data/`) sitting uncommitted against `62428ba` on `main` — this entire migration (Phases
1–6, all Phase 8 steps) is one big uncommitted working-tree change. Nothing further needs to be
built or run; what remains is packaging it into commit(s), a final `git diff` skim for anything
unintentional, and deciding whether to land it as one commit or split code vs. data. See the
"Next steps" prompt below for what to hand the next session.

## Context

Battleflow ingests Warhammer 40k faction data offline from two community sources — BSData
(`BSData/wh40k-10e`, BattleScribe XML catalogues) for datasheets/detachments/rules, and
Wahapedia (`wahapedia.ru/wh40k10ed/...`) for stratagems/enhancements — into committed JSON
artifacts under `public/data/`. Games Workshop shipped Warhammer 40,000 11th Edition in 2026
(launched ~July 2026), and both source repos have followed: `BSData/wh40k-11e` now holds the
current data, and Wahapedia has a parallel `wh40k11ed` faction-page namespace. The 10e sources
are no longer being maintained for new content, so this is a hard cutover, not a dual-support
effort — **per the user's decision, 11e fully replaces 10e**: no edition field, no dual-directory
split, no 10e archival. The ingest pipeline is simply re-pointed at the new sources and extended
for 11e's new rules concepts.

Two structural facts drive the whole plan:
1. **wh40k-11e ships JSON, not XML.** Same BattleScribe conceptual schema (categoryEntries,
   entryLinks, selectionEntries, profiles, characteristics, rules, costs, conditions, modifiers),
   just serialized differently — bare arrays instead of `{tag: [...]}` wrappers, native `$text`/
   booleans instead of XML's `#text`/string attributes. Field names and semantics are ~90%
   identical to the XML version otherwise.
2. **wh40k-11e has no GitHub Releases or tags** — the current `--tag vX.Y.Z` pinning model in
   `lib/ingest/fetch.ts` has nothing to pin to; must pin by commit SHA instead, with a
   self-upgrading fallback for whenever tagging eventually starts.

**Update (2026-08-25):** the spike confirmed BSData still has no structural stratagem data (see
Phase 1 findings) — Wahapedia stays the sole stratagem source — but it *does* now expose full
structured enhancement data (name, cost, rules text, owning detachment) that the current pipeline
silently discards. The plan below folds in migrating enhancement ingestion from Wahapedia to
BSData (Phase 4/6); stratagems are unaffected.

11e also introduces real new army-building concepts BSData won't structurally flag (Detachment
Points, force disposition, Enhancement "Upgrade" subtype) — these follow the exact curated-
allowlist pattern the codebase already uses for army rules (`lib/ingest/armyRules.ts`), which is
also the key lever for staying scalable as 11e content keeps evolving post-launch (new
detachments, FAQs, points updates). "Teams" (a new GW tournament pairing format — Initial
Skirmish/Main Engagement/Champion stages) is confirmed to be an event/pairing concept, not a
datasheet/army-building concept — it requires no ingest or schema changes now; the plan just
avoids baking in assumptions (single detachment per roster, single Leader per unit) that would
block adding it later.

## Phase 1 — Spike: confirm the unknowns first

Everything below branches on these answers, so resolve them before writing migration code:

1. Pull one full 11e catalogue JSON (e.g. `Imperium - Space Marines.json`) and one
   detachment-bearing JSON directly from `raw.githubusercontent.com/BSData/wh40k-11e/<sha>/...`
   and inspect: are `entryLinks`/`selectionEntries`/`profiles`/`costs`/`modifiers`/`conditions`
   still the same key names as XML? Is `characteristics` really a bare array? Is `hidden` a
   native boolean? How are **multiple detachments per army**, **Detachment Points**, and **force
   disposition** actually represented — a real `Cost`/field BSData exposes structurally, or
   nothing (i.e. needs full curation)?
2. Confirm the GST (`Warhammer 40,000.json`) still exposes `sharedRules`/`profileTypes`/
   `categoryEntries` the same way `collectGstRuleIds`/`collectGstProfileTypes` expect
   (`lib/ingest/resolve.ts`).
3. Confirm 11e's phase list/order (`command`/`movement`/`shooting`/`charge`/`fight`/
   `battleshock`) is unchanged — check the GST JSON or Warhammer Community's 11e core-rules
   summary, since `PHASE_IDS` in `lib/schemas.ts` is hardcoded and consumed throughout the UI.
4. Spot-check 2-3 `wahapedia.ru/wh40k11ed/factions/<slug>/` pages by hand in a browser: has the
   CSS class scheme changed (e.g. `.str10Wrap` → `.str11Wrap`)? Does the "detachment page always
   carries an enhancement table" heuristic in `lib/ingest/wahapediaCli.ts` still hold given
   Enhancements are now capped (2@1000pts/4@2000pts) rather than a fixed ~4-card table? Is there
   a visible marker distinguishing the new "Upgrade" enhancement subtype from ordinary
   Character-only enhancements?
5. Check wh40k-11e's default branch name and whether it force-pushes/rewrites history (matters
   for the `.bsdata-cache/<sha>/` on-disk cache's reproducibility guarantee).

Exit criterion: a short written note confirming these before Phase 2 starts.

### Spike findings so far (2026-08-25)

- Default branch: `main`. Last push: 2026-08-24 (actively maintained).
- Root file listing confirms the faction roster from research: all Imperium/Chaos/Xenos
  catalogues present, `Aeldari - Ynnari.json` absent (dropped), plus new library files
  (`Library - Astartes Heresy Legends.json`, `Library - Titans.json`, `Library - Tyranids.json`).
- `Warhammer 40,000.json` (GST) top-level: `{"gameSystem": {...}}` with keys `publications,
  costTypes, profileTypes, categoryEntries, forceEntries, entryLinks, sharedSelectionEntries,
  sharedRules, sharedProfiles, sharedSelectionEntryGroups, xmlns, id, name, revision,
  battleScribeVersion, type, readme` — same conceptual shape as the 10e XML GST assumed by
  `collectGstRuleIds`/`collectGstProfileTypes` in `lib/ingest/resolve.ts`.

**All remaining item-1/2/3/4 unknowns resolved (checked against `Necrons.json` + GST, and the
live `wahapedia.ru/wh40k11ed/factions/necrons/` page, 2026-08-25):**

- **`characteristics` and `profiles` are bare arrays**, confirmed on a real selectionEntry
  (`profiles: [{ characteristics: [{ name, typeId, $text }], name, typeId, typeName, hidden,
  id }]`) — matches Phase 2's assumed inverse-of-`ARRAY_ELEMENTS` re-wrap.
- **`hidden` is a native boolean** (`"hidden": false`, not the string `"false"`) — confirms
  Phase 2's parser-boundary coercion to `'true'`/`'false'` strings is required and sufficient.
- **Detachment Points is fully structural — no curation needed, revises Phase 4.** Every
  detachment-type `selectionEntry` (`type: "upgrade"`, matching the "Detachment" entryLink)
  carries a real `costs[]` entry `{ name: "Detachment Points", typeId: "82ae-1066-5107-6ae0",
  value: N }` with the actual per-detachment DP cost (verified Obeisance Phalanx = 2, The
  Phaeron's Armoury = 1, matching the live Wahapedia page's "2DP"/"1DP" badges exactly). Read it
  exactly like `pts` already is: `costs.cost.find(c => c.name === 'Detachment Points')`. The
  `"3DP Detachment"` categoryEntry seen on some detachments is a leftover baseline tag, not the
  cost source — ignore it. **Phase 4's `dpCost` field needs no curated allowlist**, just an extra
  `costs[]` lookup alongside the existing `pts` one.
- **Force Disposition is fully structural — no curation needed, revises Phase 4.** The GST
  defines a shared `Force Disposition` selectionEntryGroup with exactly 5 named entries —
  **Disruption, Priority Assets, Purge the Foe, Take and Hold, Reconnaissance** — matching the
  plan's "5 values" expectation exactly. Every detachment's `categoryLinks[]` includes exactly one
  of these 5 names directly (verified: Awakened Dynasty → "Take and Hold", Starshatter Arsenal →
  "Priority Assets", Obeisance Phalanx → "Disruption"). **Phase 4's `forceDisposition` field needs
  no curated allowlist**, just a categoryLinks membership check against this fixed 5-value set.
- **Phase list confirmed unchanged**: `Command phase`, `Movement phase`, `Shooting phase`,
  `Charge phase`, `Fight phase`, and `Battle-shock` (as a step name, not "...phase") all present
  verbatim in the GST text — `PHASE_IDS` needs no changes, only the doc-comment edition-name swap
  per Phase 3.
- **Wahapedia CSS scheme did change as anticipated**: 11e stratagem/rule classes now carry an
  `str11` prefix (`str11StratBg`, `str11Charge`, …) versus 10e's `str10*` — confirms Phase 6's
  selector-update work is real, not optional, before scraping at scale.
  `EnhancementsPts`/`EnhancementsPtsBottom` still wrap each enhancement card (`<name> <pts> pts`).
- **Enhancement "Upgrade" subtype IS flagged by Wahapedia — resolves Phase 4's fallback question.**
  A `<span class="EnhUpgrade">UPGRADE</span>` marker sits directly on upgrade-subtype enhancement
  cards (verified 5 instances on the Necrons page); ordinary Character enhancements carry no such
  span. **No curated allowlist needed for `EnhancementSchema.kind` either** — extract this marker
  during the (now stratagem-focused) Wahapedia scrape pass and match it onto the BSData-sourced
  enhancement by name, exactly as Phase 4 already proposed as its first-choice approach.

**Net effect on the plan:** all three "curated allowlist, `armyRules.ts`-style" fallbacks
speculatively proposed in Phase 4 (DP, force disposition, enhancement kind) turn out to be
unnecessary — BSData/Wahapedia expose all three structurally. Phase 4 and Phase 7's "core lever"
framing should be read as the fallback path that, per this spike, isn't needed for 11e's initial
launch content; it stays valuable as a safety net for any future GW concept that isn't
structurally flagged.

Exit criterion met — Phase 1 is complete. Proceeding to Phase 2 (`bsdata11.ts` parser).

**Stratagems vs Enhancements — can BSData replace Wahapedia? (checked against `Necrons.json`,
2026-08-25):**

- **Stratagems: no, BSData still has nothing structural.** No category entry, profile type, or
  selectionEntry named "Stratagem"/"Stratagems" exists anywhere in the catalogue. All 22 raw-text
  hits for "Stratagem" are incidental mentions inside unrelated ability/enhancement descriptions
  (e.g. "Each time you target this unit with a Stratagem, reduce that Stratagem's cost by 1CP").
  Same conclusion as the existing 10e note in [AGENTS.md](../AGENTS.md) ("BSData does not model
  stratagems as machine-readable profiles") — confirmed still true for 11e. **Wahapedia stays the
  only source for stratagems; Phase 6 is unchanged.**
- **Enhancements: yes, BSData now has full structured data — and the current pipeline already
  discards it.** Every faction catalogue carries one or more `sharedSelectionEntryGroups` named
  "Enhancements" (Necrons has two: 33 entries + 1 Legends entry), each a `selectionEntry` of
  `type: "upgrade"` with a real `pts` cost (`costs[]`), a rules-text profile (`profiles[].
  characteristics[].$text`, typeName "Abilities"), and — critically — a `comment` field holding
  the owning detachment's exact name (`"comment": "Awakened Dynasty"`, `"Canoptek Court"`, etc.,
  one per Necron detachment; 1 of 34 entries had `comment: null`, likely a Legends/unlisted
  detachment — needs a fallback). The groups themselves are shared/ungated (every eligible
  Character selectionEntry links to the same pool; detachment-scoping happens at roster-build time
  via `hidden` modifiers keyed on the selected detachment/force, not at the catalogue level) — so
  ingestion must group by `comment`, not by which unit links to the group.
  **This data is already reaching the ingest pipeline today and being thrown away**:
  `lib/ingest/resolve.ts`'s `isPrunedOption()` explicitly strips any option subtree named
  "Enhancements" / "\<X\> Enhancements" before `collectUnit` walks it (comment: "Enhancements get
  their own home once detachments are extracted" — that follow-up extraction was never built), and
  `lib/ingest/detachments.ts` never re-collects them from BSData. `DetachmentSchema.enhancements` is
  populated exclusively from `wahapedia.ts`'s `parseEnhancements()` HTML scrape today. **Revises
  Phase 4 below: enhancements should be extracted from BSData (reliable, structured, no scrape
  brittleness) instead of staying Wahapedia-sourced; Wahapedia's enhancement-card parsing can be
  dropped once the BSData extraction lands and is validated.** The "Upgrade" vs "Character"
  enhancement subtype is still not structurally flagged anywhere on these entries (no
  `categoryLinks`, no distinguishing field) — that part of Phase 4's plan (Wahapedia marker or
  curated allowlist) is unchanged.

## Phase 2 — Parser: `lib/parsers/bsdata11.ts`

Write a parallel JSON-native parser that normalizes 11e JSON into the **same** TypeScript
interfaces `lib/parsers/bsdata.ts` already exports (`Catalogue`, `GameSystem`, `SelectionEntry`,
`SelectionEntryGroup`, `EntryLink`, `Profile`, `Characteristic`, `RuleNode`, `Condition`,
`Modifier`, `ProfileType`, `CategoryEntry`, `CatalogueLink`, `Cost`, `InfoLink`) — import and
reuse those interfaces rather than forking a parallel type set. Concretely:

- `parseCatalogue11(json)` / `parseGameSystem11(json)` re-wrap bare JSON arrays into the
  `{ tagName: [...] }` shape `lib/ingest/resolve.ts`, `lib/ingest/detachments.ts`, and
  `lib/ingest/normalize.ts` already consume (e.g. `profiles.profile[]`,
  `characteristics.characteristic[]`) — this is the inverse of what `bsdata.ts`'s `ARRAY_ELEMENTS`
  /`isArray` allowlist does for XML today, covering the same conceptual tag list.
- Coerce `hidden` from native boolean to the `'true'`/`'false'` strings the rest of the pipeline
  expects (e.g. `gatingChildIds()` in `detachments.ts` does a string compare) **at the parser
  boundary**, so `resolve.ts`/`detachments.ts` need zero changes for this.
- Extend the shared `textOf()` helper in `bsdata.ts` (used by both parsers) to also check a
  `$text` key if Phase 1 shows it's used anywhere, rather than forking it.
- If Phase 1 shows DP/force-disposition are genuinely new structural fields with no XML analog,
  add them as additional **optional** fields on the shared `Catalogue`/`SelectionEntry`/`Profile`/
  `Cost` interfaces in `bsdata.ts` — one interface set for both parsers, not a parallel model.

This keeps `resolve.ts`, `detachments.ts`, `normalize.ts` (~930 lines) untouched except for the
specific mismatches Phase 1 surfaces, since those files only depend on object shape, never on XML
syntax directly.

## Phase 3 — Cutover (no dual-edition support)

Per the "fully replace" decision: no `gameEdition` field, no directory split. Simpler swap:

- `lib/ingest/fetch.ts`: change `const REPO = 'BSData/wh40k-10e'` → `'BSData/wh40k-11e'`.
- Bump `DATA_SCHEMA_VERSION` in `lib/schemas.ts` to `3` (doc-comment: "11e cutover — adds
  Detachment Points / force disposition / enhancement kind; drops 10e-specific assumptions"),
  batching all of Phase 4's new fields into this one version bump per the project's existing
  convention (schema-version bumps force `FactionArtifactSchema.parse()` to reject
  stale-shaped artifacts at both ingest and runtime load — keep that invariant).
- `public/data/factions/*.json` / `public/data/shared/*.json` / `public/data/manifest.json` are
  fully regenerated from wh40k-11e and overwrite the 10e content in place (no archival directory).
- Verify `PHASE_IDS` in `lib/schemas.ts` against Phase 1's findings; update the doc comment off
  "10th edition" wording once confirmed (or update the actual phase list if it changed).

## Phase 4 — Schema additions for 11e rules changes

All land in `lib/schemas.ts` under the `v3` bump.

**Detachment Points.** `dpCost: z.number().optional()` on `DetachmentSchema`. **Confirmed
structural in the spike** — every detachment-type `selectionEntry` carries a real `costs[]` entry
named `"Detachment Points"` with the actual per-detachment value (verified against live Wahapedia
DP badges). Read it exactly like `pts` already is: `costs.cost.find(c => c.name === 'Detachment
Points')` in `resolve.ts`/`detachments.ts`. **No curated allowlist needed.**

**Force disposition.** `forceDisposition: z.enum([...]).optional()` on `DetachmentSchema`.
**Confirmed structural in the spike** — the GST's shared `Force Disposition` selectionEntryGroup
defines exactly 5 values (`Disruption`, `Priority Assets`, `Purge the Foe`, `Take and Hold`,
`Reconnaissance`), and every detachment's `categoryLinks[]` includes exactly one of these 5 names
directly. Extract it in `detachments.ts` as a categoryLinks membership check against this fixed
5-value set. **No curated allowlist needed.** Unlike army rules (where absence is legitimate for
some factions), **every** 11e detachment should match one of the 5 — warn loudly (not silently
no-op) if a detachment's `categoryLinks` contain none of them, since that would indicate the GST's
Force Disposition group changed shape.

**Enhancements move from Wahapedia to BSData.** Spike finding above confirms every faction
catalogue carries `sharedSelectionEntryGroups` named "Enhancements" with full structured data
(name, `pts` cost, rules-text profile, and a `comment` field naming the owning detachment). Add
`extractEnhancements(catalogue)` to `lib/ingest/detachments.ts`, run alongside
`extractDetachments`: walk every `selectionEntryGroup` named "Enhancements" (bare or
"\<X\> Enhancements", mirroring `isPrunedOption`'s match in `resolve.ts`) across the owned
catalogues (same `selectOwnedCatalogues` scoping already used for detachments), group entries by
`comment` (normalized the same way detachment-name matching already is elsewhere), and attach each
group's enhancements to the matching `Detachment.enhancements`. Handle `comment: null` /
unmatched-comment entries by logging and skipping (Legends/unlisted content), not by silently
dropping or misattributing them. Once validated end-to-end (Phase 8 step 3), delete
`wahapedia.ts`'s `parseEnhancementCard`/`parseEnhancements` and drop `enhancementGroups`/
`mergeStratagems`'s enhancement-handling branch from `wahapediaCli.ts` — Wahapedia's role narrows
to stratagems only (confirmed still BSData-absent, see Phase 1 finding). Stratagems remain
name-matched against BSData detachments exactly as today.

**Enhancement "Upgrade" subtype.** Promote `DetachmentSchema.enhancements` from bare
`RuleSchema[]` to `EnhancementSchema = RuleSchema.extend({ kind: z.enum(['character',
'upgrade']).optional() })`. Not structurally flagged on the BSData enhancement entries (no
`categoryLinks`, no distinguishing field — checked in the spike), but **confirmed flagged by
Wahapedia**: a `<span class="EnhUpgrade">UPGRADE</span>` marker sits on upgrade-subtype
enhancement cards and is absent on ordinary Character ones. Extract this marker during the
(now stratagem-focused) Wahapedia scrape pass and match it onto the BSData-sourced enhancement by
name. **No curated allowlist needed.**

**Per-phase-per-unit stratagem cap and dual Leader+Support attachment**: both are
army-building/roster-legality rules, not per-unit or per-detachment data facts — **no schema
field for either**. The stratagem cap is a cross-cutting usage constraint (like the existing CP
pool) that belongs in a future roster-builder validation layer. Leader+Support: check in Phase 1
whether it surfaces as a new core-rule id (e.g. `Support` alongside the existing `Leader`) — if
so it flows through `UnitAbilitySchema` automatically via `collectGstRuleIds()`, no schema change
needed; the actual dual-attachment logic belongs in `lib/roster/buildRoster.ts`, out of scope for
this ingest migration.

## Phase 5 — Fetch/pinning without releases (`lib/ingest/fetch.ts`)

- Replace `getLatestReleaseTag()`'s sole reliance on the Releases API with
  `getLatestRef()`: try the releases API first (self-upgrading for whenever wh40k-11e eventually
  tags a release), fall back to `GET /repos/BSData/wh40k-11e/commits/<defaultBranch>` on 404,
  using the returned commit sha directly.
- `cli.ts`'s `--tag vX.Y.Z` flag becomes `--ref <tag-or-sha-or-branch>`; `resolveRef()` already
  documents accepting "release tag (or branch/sha)" so its signature doesn't need to change —
  only remove the release-only fast path from the call site.
- `DataManifestSchema.bsDataTag` keeps its existing field name/shape but stores a commit sha (or
  `main@<sha>`) rather than a version tag; add a doc comment clarifying the dual meaning.
- `listDataFiles()`'s `.gst`/`.cat` extension filter becomes `.json` filtering — match the GST by
  its known exact filename (`Warhammer 40,000.json`) since `.json` alone isn't discriminating,
  everything else ending in `.json` is a catalogue (per Phase 1 confirming the same
  `<Faction Name>.json` convention, minus `Aeldari - Ynnari.json` which no longer exists).

## Phase 6 — Wahapedia re-pointing, narrowed to stratagems (`lib/ingest/wahapedia.ts`, `wahapediaCli.ts`)

Per the spike finding above, enhancements move to BSData (Phase 4) — Wahapedia's remit shrinks to
stratagems (still the only source, confirmed structurally absent from BSData) plus, if it turns
out to flag the Upgrade/Character split visually, enhancement `kind` only.

- Change the scrape base URL to `wahapedia.ru/wh40k11ed/factions/`.
- **Do not run at scale until Phase 1's spot-check (item 4) is done.** Update CSS selectors and
  the alt-game-mode exclusion list (`SKIP_GROUPS`) to match 11e's actual page structure. The old
  "enhancement-table-presence" synthesis-gating heuristic (`requireEnhancementGroup` in
  `mergeStratagems`) needs a replacement signal now that enhancements no longer come from this
  scrape — re-derive "real detachment vs alt-game-mode shell" from the BSData-sourced
  `detachment.enhancements` (populated by Phase 4) instead, since that's now the structural
  ground truth.
- `lib/ingest/wahapediaFactions.ts`'s 37-faction slug map: spot-check before trusting wholesale;
  drop the Ynnari entry (no longer a BSData catalogue, and worth checking whether Wahapedia's
  Ynnari page still exists standalone or folds fully into Aeldari for 11e).
- `lib/data/coreStratagems.ts` (11 hand-transcribed universal 10e stratagems): re-author against
  the 11e Core Rules text — no scrape source exists for these, same as before.
- Recommended validation: `--dry-run --factions <2-3 slugs>` first, manually diff against the
  live Wahapedia pages in a browser, before running `--factions all`.

## Phase 7 — Scalability for ongoing 11e content churn

- **Idempotent reruns already work this way** — `cli.ts` fully regenerates each artifact from a
  pinned sha every run; preserve this.
- **Curated-allowlist-with-warn-on-miss is the core lever.** Every new 11e concern that isn't
  structurally flagged by BSData/Wahapedia (force disposition, possibly DP, possibly enhancement
  kind) follows `armyRules.ts`'s exact shape: flat `Record`, `norm()`-insensitive matcher,
  `flagX()` mutator, dedicated back-fill CLI (mirroring `armyRulesCli.ts`). Add a **miss-detection
  warning** to each `flagX()` — log any detachment/faction with no allowlist entry, so new 11e
  detachments surface immediately as "needs curation" instead of silently shipping with
  `undefined` fields. This matters more for 11e than 10e did, since post-launch content will churn
  faster.
- **Suggested cadence**: on any GW FAQ/points-update/new-detachment announcement, run
  `npm run ingest -- --ref main` dry-run first, diff `unitCount`/detachment counts per faction
  against the last committed manifest before committing for real, then run the same five-stage
  chain as today (`ingest` → `ingest:wahapedia` → `ingest:dedup` → `ingest:summarise` → curated
  back-fill CLIs). Since there's no tag to anchor "known good," `bsDataCommit` in the manifest is
  the reproducibility anchor — `git diff public/data/` between runs is the primary regression
  check, standing in for automated visual regression.
- **Teams stays fully out of scope for ingest** — it's an event/pairing format layered on top of
  already-built rosters. This migration just avoids hardcoding single-detachment-per-roster or
  single-Leader-per-unit assumptions (Phase 4 already keeps `dpCost`/`forceDisposition`
  per-detachment, and treats Leader+Support as a roster-builder concern), so a future Teams
  feature isn't blocked by anything done here.

## Phase 8 — Rollout sequencing

1. ✅ Spike (Phase 1) — written confirmation, no code.
2. ✅ Parser (`bsdata11.ts`) — test against the raw JSON pulled in the spike.
3. ✅ Single-faction smoke test — run `resolve.ts`/`detachments.ts`/`normalize.ts` against one
   structurally simple faction's 11e parse output in a scratch script; manually diff the resulting
   `FactionArtifact` against the faction's real datasheet. Avoid a multi-pattern faction (Space
   Marines) for this first pass.
4. ✅ Full ingest across all factions — dry-run first, then commit. Spot-check unit/detachment counts
   per faction against GW's published 11e datasheet/detachment lists.
5. ✅ Wahapedia — smoke-test 2-3 factions before running at scale (Phase 6).
6. ✅ Dedup — confirm shared-set output is sane.
7. ✅ Summarise — ran end to end against all 36 factions.
8. ✅ Curated-flag CLIs (force disposition, DP, enhancement kind) — DP/force-disposition/army-rules
   ran during the Phase 8 step 4 BSData ingest (structural, no curation needed per the Phase 1
   spike); enhancement `kind` (Upgrade subtype) ran during this session's Wahapedia step.
9. ✅ Runtime wiring — confirmed `lib/data/loader.ts` and the UI work end-to-end against the new
   data (manual roster-import smoke test via `npm run dev`).

**Highest-risk unknowns to resolve first:** (1) actual 11e JSON structure for a full
multi-detachment catalogue — this is the single biggest assumption the "reuse resolve/
detachments/normalize almost unchanged" thesis rests on; (2) how Detachment Points and force
disposition are represented in the data (structural vs. fully curated); (3) wh40k-11e's default
branch stability for commit-sha pinning; (4) Wahapedia's actual 11e CSS/page structure.

## Verification

- `lib/ingest/__tests__/` — extend with unit tests for `bsdata11.ts` against real sample JSON
  pulled from wh40k-11e (per the existing test pattern for `bsdata.ts`).
- `npm run ingest -- --ref <sha> --factions <slug> --dry-run` for the single-faction smoke test
  in Phase 8 step 3, then without `--dry-run` for the full run in step 4.
- Manual cross-check: open the running app (`npm run dev`) after a full ingest, browse 3-5
  factions across phases, and compare unit stat lines / detachment stratagem lists against the
  live Wahapedia 11e pages and BSData source for accuracy — there's no automated visual
  regression system, so this manual pass is the primary correctness gate at each rollout stage.
- `git diff public/data/` after each ingest stage — reviewable, and the main tool for catching
  unexpected structural drift between runs going forward (per Phase 7's cadence).

## Rollout log

**2026-08-25 — Phases 2–5 + Phase 4 implemented, Phase 8 steps 1–4 done for BSData (not yet Wahapedia):**

- **Phase 2** (`lib/parsers/bsdata11.ts`): JSON-native parser reusing `bsdata.ts`'s interfaces
  unchanged, per plan. Unit-tested (`lib/parsers/__tests__/bsdata11.test.ts`).
- **Phase 3/5** (`lib/ingest/fetch.ts`, `cli.ts`, `armyRuleOptionsCli.ts`): repointed to
  `BSData/wh40k-11e`; `getLatestRef()` (releases-API-first, default-branch fallback since
  `wh40k-11e` ships no releases) replaces `getLatestReleaseTag()`; `--tag` → `--ref`; `.json`
  extension handling with the GST matched by exact filename.
- **Phase 4** (`lib/schemas.ts`, `lib/ingest/detachments.ts`): `DATA_SCHEMA_VERSION` bumped to
  3. `dpCost` and `forceDisposition` read directly off BSData structural fields (`costs[]` /
  `categoryLinks[]`) — no curated allowlist needed, confirming the spike finding.
  **Enhancement extraction from BSData surfaced a second structural pattern the spike's
  single-example inspection missed**: BSData uses the "comment"-disambiguated shared pool
  (Necrons-style) for some factions, but a "\<Detachment\> Enhancements"-named group per
  detachment (Space Marines/Custodes-style, entries carry no `comment` at all) for others.
  `extractEnhancements` now falls back to the group name when `comment` is absent.
  Cross-detachment name matching (`matchEnhancementGroups`) also needed to be diacritic-folding
  (Leagues of Votann's "Needgaârd" vs the plain-ASCII comment "Needgaard") and token-subset-based
  rather than exact-string (comments are often a short keyword, e.g. "Zealots" for "Pactbound
  Zealots") — done globally across a faction's detachments, not first-match, so a single-token
  comment ambiguous between two detachments (Chaos Space Marines' "Raiders" vs both "Renegade
  Raiders" and "Murdertalon Raiders") is logged and skipped rather than misattributed.
  Enhancement `kind` (Upgrade subtype) is deliberately NOT set here — it's a Wahapedia-sourced
  field per Phase 4/6, still pending.
- **Phase 8 steps 1–4 (BSData layer only)**: ran `npm run ingest -- --ref main --factions all`
  for real against the live `wh40k-11e` repo (commit `46d8cc5`). All 36 factions regenerated
  (`Aeldari - Ynnari.json` no longer exists upstream, matching the spike finding — its stale
  `public/data/factions/ynnari.json` and the now-orphaned 10e shared-detachment set were
  deleted, since nothing in 11e regenerates or references them). Spot-checked Necrons: DP/
  disposition/enhancement counts match the live Wahapedia page exactly. 14/36 factions produced
  zero enhancement-matching warnings; the rest have a small number of expected edge cases
  (single-enhancement Legends-only shell detachments with no other content, the one genuine
  "Raiders" collision above, one orphaned "Crusade"-commented entry) — all logged, none
  misattributed.
- **Explicitly NOT done yet**: Phase 6 (Wahapedia re-pointed to `wh40k11ed`, still scraping the
  old `wh40k10ed` pages / not run against 11e at all) — so committed artifacts currently have
  BSData datasheets/detachments/DP/disposition/BSData-enhancements but **no stratagems** and no
  `summary` fields. `lib/data/__tests__/artifacts.test.ts`'s two dedup-dependent assertions
  (`sharedDetachments`, chapter detachment counts) fail as a result — expected, not a regression;
  they'll pass once Phase 6 → dedup (Phase 8 steps 5–6) run. `ingest:summarise` (step 7) is also
  blocked locally — no `ANTHROPIC_API_KEY` in this environment.
- **Next**: Phase 6 code (CSS selector rework for `str11*` classes, replace the
  enhancement-table-presence synthesis gate with the now-structural `detachment.enhancements`
  signal, re-author `coreStratagems.ts`), then Phase 8 steps 5–9.

**2026-08-25 — Phase 6 implemented; Phase 8 steps 5–9 done:**

- **Live-page verification** (`wahapedia.ru/wh40k11ed/...`, browsed directly): confirmed the
  `str10*` → `str11*` class rename (`str11Wrap`/`str11Name`/`str11Type`/`str11CP`/`str11Text`);
  found three structural changes the plan hadn't anticipated:
  1. Core-rules-referenced stratagem cards (e.g. "Command Re-roll" as it appears embedded on a
     faction page) carry a `<span class="h_number">` rule-reference number fused onto the name
     (`"COMMAND RE-ROLL15.02"`) — stripped at parse time (`textWithoutTrailingMarker`).
  2. Not every detachment's `.str11Type` line has the 10e "\<Name\> – \<Category\> Stratagem"
     dash format — single-category detachments (and the universal "Core Stratagem" marker)
     render as bare "\<Name\> Stratagem" with no dash. `parseGroupName` now falls back to
     stripping a trailing "Stratagem(s)" word when no dash is present.
  3. 11e stratagem bodies introduce granular sub-headers beyond WHEN/TARGET/EFFECT/RESTRICTIONS
     (`ELIGIBLE IF`, `BEFORE/WHILE/AFTER MOVING`, `MAXIMUM DISTANCE`, `WHILE/AFTER SHOOTING`, …)
     on movement/shooting-styled stratagems. Rather than hardcode the expanded label set,
     `splitSections` now treats WHEN/TARGET/RESTRICTION(S) specially and folds every other bold
     label into `effect` (prefixed with its own label), so no future label is silently dropped.
  Also found (and worked around) that `wahapedia.ru/wh40k11ed/factions/space-marines` (no
  trailing slash) server-renders the codex-only "No supplements" view — chapter-specific
  detachments are absent from the HTML entirely unless the URL has a trailing slash (or a
  chapter-code query state) selecting "No filter". `fetchFactionPage`'s existing
  `${slug}/`-with-trailing-slash construction already produces the right URL; documented in
  `wahapediaFactions.ts` so it isn't "fixed" into a regression later.
- **Enhancement Upgrade-subtype marker**: `parseEnhancementKinds` (replacing
  `parseEnhancements`) extracts only the `<span class="EnhUpgrade">` marker + enhancement name,
  grouped by detachment — no rules text (BSData owns that now). `wahapediaCli.ts` matches each
  Upgrade-flagged name onto the detachment's *existing* BSData-sourced `enhancements` entry
  (name/qualifier-stripped/token-subset matching, reusing the same helpers as detachment-name
  matching) and sets `kind: 'upgrade'` in place — it no longer creates or replaces the
  `enhancements` array.
- **Synthesis gating replaced**: the old "does a same-name enhancement table exist on the page"
  heuristic (`requireEnhancementGroup`) is gone (enhancement text isn't scraped anymore). New
  signal — `parseRealDetachmentNames` — reads every genuine detachment's Detachment Points badge
  (`<h2 class="outline_header">…<span class="dpPts">N DP</span></h2>`); alt-game-mode listings
  (Boarding Action, Crusade) render as plain `h2.outline_header` with no `dpPts` span, so they're
  excluded automatically with no maintained name list. Verified against Necrons' four
  Boarding-Action-only groups (Tomb Ship Complement, Deranged Outcasts, Canoptek Harvesters,
  Harbinger Cabal) — none synthesized.
- **Final-prune invariant updated**: since shells are no longer given an `enhancements` array,
  the post-merge prune condition changed from `rules.length > 0 || enhancements.length > 0` to
  `rules.length > 0 || stratagems.length > 0` — still correct, since a synthesized shell is only
  ever created together with stratagems now.
- **`wahapediaFactions.ts`**: spot-checked the full 11e nav (24 factions). Added
  `emperor-s-children: 'emperor-s-children'` (new standalone 11e faction, identity slug). Dropped
  the `ynnari: null` entry — its BSData catalogue and artifact are already gone (Phase 8 step 4).
  `adeptus-titanicus` / `titanicus-traitoris` stay `null` — the former has a live 11e page but no
  detachments (separate ruleset, "Army Rules" only), the latter has no page at all.
- **`coreStratagems.ts`**: fully re-authored against the live Core Rules page
  (`the-rules/core-rules/#Stratagems`, numbered 15.02–15.12). The universal list changed
  completely: Desperate Breakout / Go to Ground / Grenade / Tank Shock are gone; Epic Challenge /
  Explosives / Crushing Impact are new; Fire Overwatch and Heroic Intervention now trigger at the
  *end* of a phase rather than reactively mid-phase (Fire Overwatch moved from the Charge phase
  to the Movement phase — a real mechanical change, not a naming one). "Snap Shooting" (15.09) is
  a referenced rules mechanic with no CP cost, not a purchasable stratagem — intentionally
  excluded.
- **Deleted** `scripts/audit-enhancements.ts` — a one-shot 10e-era debug script whose entire
  premise (auditing Wahapedia-sourced enhancement coverage) no longer applies now that
  enhancements are BSData-sourced; not referenced anywhere else.
- **Phase 8 steps 5–6 (Wahapedia + dedup) run for real**: `npm run ingest:wahapedia` across all
  34 mapped factions (`--dry-run` first, diffed against live pages, then for real), followed by
  `npm run ingest:dedup`. No synthesized/new detachments anywhere — BSData's pinned `main`
  commit already covers every real detachment the Wahapedia pages list. ~10 Upgrade-marker
  matching misses logged across ~34 factions (e.g. Necrons' "Mortality Shroud (Aura)"), all
  clearly warned rather than silently dropped — consistent with the existing enhancement-matching
  gap rate from the Phase 8 BSData step.
- **Phase 8 steps 7–8 (summarise, curated-flag CLIs)**: still blocked/not needed here —
  `ingest:summarise` needs `ANTHROPIC_API_KEY` (not available in this environment, same as
  before); `armyrules`/force-disposition/DP already ran during the BSData step and are untouched
  by this phase.
- **Phase 8 step 9 (runtime check)**: `npm run dev`, imported the Chaos Daemons sample roster
  (`docs/sample-list.txt`) end-to-end through the real UI. Confirmed: detachment/enhancements/
  units/abilities all resolve correctly; the Command-phase stratagem list shows the re-authored
  "Command Re-roll" with its new summary; the Movement-phase list correctly shows "Fire
  Overwatch" and "Rapid Ingress" (the phase-filter heuristic picks up the new 11e timing text
  with no code changes, since it's pure keyword-matching over `Strat.timing`).
- **Tests**: rewrote `lib/ingest/__tests__/wahapedia.test.ts` and `wahapediaCli.test.ts` for the
  new function signatures/behavior (20 tests). Updated two stale `lib/data/__tests__/
  artifacts.test.ts` assertions that assumed 10e's "divisio chapters have zero detachments of
  their own" — 11e gives every codex-compliant chapter one flavoured variant detachment (e.g.
  Iron Hands' "Hammer of Avernii") in addition to the shared Codex pool, a genuine ruleset change
  confirmed across six sampled chapters, not a matching bug. Full suite (131 tests) and
  `tsc --noEmit` both clean.
- **Migration is now feature-complete**: `git diff public/data/` covers datasheets, detachments,
  DP, force disposition, BSData enhancements, stratagems, and Upgrade-subtype flags all sourced
  from live 11e data.

**2026-08-25 — Phase 8 step 7 (`ingest:summarise`) run, closing out the migration:**

- `ANTHROPIC_API_KEY` became available in this environment. Treated
  `docs/summary-overrides.json` as a cold cache per the plan's own caution — confirmed correct:
  of 157 unique effects across the first 3-faction batch (necrons, space-marines, chaos-daemons),
  only 30 were actual cache misses needing fresh generation, the rest hit the cache from prior
  10e-era summarise runs on effect text that happened to still match (11e's *core* stratagems
  changed completely, but plenty of faction-specific stratagem effect text is unchanged from 10e).
  Spot-checked several generated summaries (e.g. Necrons' "Protocol of the Eternal Revenant") for
  accuracy against the full effect text — correct.
- Ran `--no-interactive` (required in this non-TTY environment; the default interactive
  confirmation flow fails with "readline was closed" here) first against
  `--factions necrons,space-marines,chaos-daemons`, then `--factions all`. Final run: 34 files
  updated (Ynnari/Adeptus Titanicus/Titanicus Traitoris have no stratagems, per known
  limitations), 1427 stratagems rewritten total across both runs (181 newly generated in the
  `all` run, the rest cache hits), 0 human-reviewed (non-interactive mode auto-accepts
  ambiguous cases rather than prompting).
- `npx vitest run` (131 tests) and `npx tsc --noEmit` both clean afterward, matching the
  pre-step-7 baseline.
- UI smoke test: `npm run dev`, imported the Chaos Daemons sample roster
  (`docs/sample-list.txt`, Version 2). Confirmed stratagem cards now render their collapsed-view
  summary line correctly across phases (Command: "Command Re-roll" — "Re-roll any single dice
  result immediately after making it; Charge rolls reroll in full."; Shooting: 4 stratagems
  including "Incorporeal Terrors", "Explosives", "Smokescreen", all summarized) — the
  previously-empty summary line every card was missing at the start of this session now
  populates as intended.
- **This closes out the 11e migration.** All 9 Phase 8 steps are done for real against live data;
  no further environment blockers remain.
