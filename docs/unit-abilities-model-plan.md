# Unit Abilities — Phase 1: Data Model + Ingest

**Overall Progress:** `100%` ✅ — schema v2 shipped, full re-ingest complete, 115/115 tests green.

> Phase 2 (presentation: compact Core strip, nested-group expander, Damaged row)
> is a separate document — see [`unit-abilities-ui-plan.md`](./unit-abilities-ui-plan.md).
> This phase ships the structured schema and a full re-ingest **without** any
> visible UI change (the roster keeps rendering a flat list).

## TLDR
Today every datasheet ability is flattened into one untyped `Rule[]`, so complex
characters (Be'lakor, Magnus, the Silent King) become an undifferentiated wall of
chips. BSData actually carries the structure we need — we just discard it at ingest.
This phase classifies each ability at ingest into **Core / Faction / Datasheet**,
preserves **themed sub-ability groups** (Be'lakor "Shadow Form", Magnus "Crimson
King", Silent King "Triarch Abilities"), and separates the **Damaged** profile —
all behind a schema-version bump and a full re-ingest. No user-visible change yet.

## Critical Decisions
- **Taxonomy = Core / Faction / Datasheet** (printed-card model). Invulnerable Save
  stays folded into the stat line exactly as today (`invulnSave.ts`).
- **Core signal = rule defined in `Warhammer 40,000.gst`.** Verified across all four
  reference units; the GST also defines weapon keywords but those are already filtered
  as weapon-scoped, so the remaining GST rule info-links are exactly the Core abilities.
- **Faction = the army rule**, matched via the existing `ARMY_RULES` allowlist.
  Classified on the unit for fidelity but **excluded from per-unit rendering** (it stays
  in the army-level section). This also fixes today's leak where it double-shows.
- **Themed groups keyed by BSData `profileType`.** Any ability profile whose type isn't
  the generic `Abilities` nests under a group named by that type; a same-named parent
  ability (when present) supplies the group blurb.
- **Damaged separated into its own field.** Promoted to a dedicated row in Phase 2;
  this phase only carves it out of the ability stream.
- **No visible regression this phase.** `buildRoster` flattens the new structure back to
  the flat list the current UI expects, minus the Faction army-rule (army-level only).
  Damaged stays in the flat render this phase so it doesn't vanish before Phase 2 builds
  its row.
- **Inline Core text (status quo).** Core ability text is repeated per unit, not deduped
  into a glossary — keeps the loader untouched.

## Tasks

- [x] ✅ **Step 1: Collect the GST core-rule id set**
  - [x] ✅ In `resolve.ts`, added `collectGstRuleIds` (mirroring `collectCrusadeIds`) that
        walks the parsed GST `sharedRules` and returns the set of rule node ids defined there
        (33 ids — exactly the edition Core abilities).
  - [x] ✅ In `cli.ts`, built that set once after parsing the GST and threaded it into
        `enumerateUnits` → `collectUnit`.

- [x] ✅ **Step 2: Carry classification signals through `ResolvedUnit`**
  - [x] ✅ Tagged each entry in `unitRules` with `core: boolean` (`true` when the target
        rule id is in the GST set).
  - [x] ✅ Ability `Profile`s keep their `typeName` (unchanged) so `normalize` reads the
        themed-group label — no flattening in `resolve`.
  - [x] ✅ Confirmed `profile`-type info-links (Damaged, Disciples, …) still land in
        `abilities` with their `typeName` intact (verified on Be'lakor / Magnus / Silent King).

- [x] ✅ **Step 3: New schema for structured abilities** (`lib/schemas.ts`)
  - [x] ✅ Added `UnitAbilitySchema = RuleSchema.extend({ category, group?, groupBlurb? })`
        with `category: 'core' | 'faction' | 'datasheet'`; `PreparedUnit.abilities` now uses it.
  - [x] ✅ Added `damaged?: Rule` to `PreparedUnitSchema` for the separated profile.
  - [x] ✅ Bumped `DATA_SCHEMA_VERSION` (1 → 2); the artifact / shared-set / manifest schemas
        all read the same constant, so their `z.literal` followed automatically.

- [x] ✅ **Step 4: Classify at ingest** (`lib/ingest/normalize.ts`)
  - [x] ✅ `buildUnitAbilities` builds `core` from `unitRules` where `core === true`.
  - [x] ✅ Builds `faction` from any ability (rule **or** profile) whose name matches
        `ARMY_RULES[factionId]` (reuses `norm`); tagged `category: 'faction'`.
  - [x] ✅ Builds `datasheet` from the remainder; a profile whose `typeName` is neither
        `Abilities` nor a GST-defined structural type gets `group = typeName`, and a
        same-named parent ability is folded into `groupBlurb` (and dropped as a standalone
        chip so it isn't shown twice).
  - [x] ✅ Detects the `Damaged: …` profile by name and routes it to `unit.damaged`.
  - [x] ✅ Keeps the single content-key de-dup pass over the concatenated list
        (core → faction → datasheet), so an ability reachable via two paths collapses to its
        best-classified copy — matching the previous behaviour.

- [x] ✅ **Step 5: Keep the runtime flat-render working** (`lib/roster/buildRoster.ts`)
  - [x] ✅ Added `flattenUnitAbilities`, which yields the flat `abilities` the UI consumes:
        all categories **except** `faction`, with the separated Damaged profile folded back in.
  - [x] ✅ `invulnSave` folding and `abilityPhasesFor` filtering now run on that flattened
        list, unchanged (115/115 tests green, incl. `invulnSave` / `abilityPhase`).

- [x] ✅ **Step 6: Validate the grouping heuristic** — *finding below.*

- [x] ✅ **Step 7: Update fixtures & tests**
  - [x] ✅ `SAMPLE_ROSTER` needed no change — it is UI-layer (`Roster`, abilities are `Rule[]`)
        and the UI shape is unchanged this phase.
  - [x] ✅ Bumped `schemaVersion` 1 → 2 in the `buildRoster` / `wahapediaCli` fixtures;
        `abilityPhase` / `invulnSave` / `keywords` tests needed no change (structurally compatible).
  - [x] ✅ Added `lib/data/__tests__/abilityClassification.test.ts` asserting classification,
        grouping, blurb, and Damaged-separation for the four reference units (Cultist Firebrand,
        Magnus, Silent King, Be'lakor) against the committed artifacts.

- [x] ✅ **Step 8: Full re-ingest & verify**
  - [x] ✅ Ran the full pipeline in order: `ingest` → `ingest:wahapedia` → `ingest:dedup` →
        `ingest:summarise` (fully cache-served, 0 API calls) → `ingest:armyrules`, pinned to the
        same commit (`--tag main` == `7a58ddbe…`) so the data diff is isolated to this feature.
  - [x] ✅ Verified `git diff public/data/`: **0 non-ability field changes** across all 3 740
        units; abilities categorised; 1 186 units gained a separated Damaged profile; 11 themed
        groups preserved; army-rule no longer in any unit's datasheet stream. No abilities lost —
        the 6 profiles the audit reported "missing" are the themed-group parents, preserved
        verbatim as `groupBlurb`.
  - [x] ✅ Manifest stamped `schemaVersion: 2` (tag/commit unchanged); `tsc --noEmit` clean.

## Step 6 finding — grouping heuristic audit

Across the full re-ingested data the heuristic produces **11 themed groups, zero false
positives**:

| Group | Faction(s) · units | Parent blurb? |
| --- | --- | --- |
| Orders | Astra Militarum · 28 officers | — |
| Shadow Form | Chaos Daemons · Be'lakor | ✓ |
| Crimson King | Thousand Sons · Magnus | — |
| Triarch Abilities | Necrons · The Silent King | — |
| C'tan Powers | Necrons · (C'tan shard) | — |
| Warmaster | Chaos Space Marines · Abaddon | — |
| Primarch of the First Legion | Dark Angels · Lion El'Jonson | ✓ |
| Lord of the Death Guard | Death Guard · Mortarion | ✓ |
| Wrathful Presence | World Eaters · Angron | ✓ |
| Hero of Hades Hive | Astra Militarum · Commissar Yarrick | ✓ |
| Throttlerokkit Shokka Engine | Orks · Wazdakka Gutsmek | ✓ |

The naive "any non-`Abilities` profileType is a group" rule has exactly **one** false
positive: **`Transport`** (×109 — the structural capacity profile, e.g. Wave Serpent /
Raider). It is the only non-ability profileType *defined in the GST* alongside `Abilities`,
so it is excluded by keying grouping on **catalogue-defined** profile types only
(`collectGstProfileTypes` → "group ⇔ typeName not in the GST set"). This mirrors the Core
signal ("Core ⇔ rule defined in the GST") and is robust: every genuine themed group above is
catalogue-defined, while `Transport` stays a plain datasheet ability exactly as before.
