# Army-Rule Reference Tables (Rituals / Blessings of Khorne) — Implementation Plan

**Overall Progress:** `100%`

## TLDR
Thousand Sons' army rule (*Cabal of Sorcerers*) and World Eaters' army rule (*Blessings of
Khorne*) each reference a faction-wide table of named effects (Rituals with Warp Charge values;
Blessings with dice-roll requirements) that a player must consult to use the rule. These tables
live in standalone BSData `selectionEntry` nodes ("Rituals reference" / "Blessings of Khorne
Reference") with no `Unit` stat profile, so `enumerateUnits` never walks them — the named entries
never reach any unit, detachment, or glossary. We'll extract them at ingest and surface them
nested inside their army-rule card in `RulesReferenceSection`.

## Critical Decisions
- **Generic `options` shape on `GlossaryRuleSchema`** — `{ name, requirement, requirementLabel, effect }[]`.
  `requirementLabel` carries the source characteristic name ("Warp Charge" / "Roll") so the UI
  renders either faction without hardcoding vocabulary, and `options` travels with the entry
  wherever the glossary rule is already consumed.
- **Curated per-faction allowlist, mirroring `armyRules.ts`** — a small map of
  `factionId → { selectionEntry, armyRule }` naming the exact reference `selectionEntry` and the
  glossary entry it attaches to. Matches the existing `ARMY_RULES` convention, stays explicit and
  reviewable, and avoids a generic-detection heuristic that could misfire on structurally similar
  but differently-purposed entries (e.g. Chaos Space Marines' "Marks of Chaos", which is a
  per-unit wargear choice already handled correctly).
- **Scope is exactly two factions** — Thousand Sons (`Rituals reference`, 4 entries) and World
  Eaters (`Blessings of Khorne Reference`, 12 entries). A scan of all 47 cached 10e catalogues for
  this shape (`type=upgrade` selection entry holding ≥4 profiles of a custom profile type, no Unit
  profile) found no other matches.
- **UI: nested inside the existing army-rule card** — `RulesReferenceSection` expands the rule to
  show its `options` as a sub-list (name, requirement badge, effect), reusing the card's existing
  collapse/expand mechanics rather than adding a new top-level section.

## Tasks:

- [x] ✅ **Step 1: Extend the data model**
  - [x] ✅ Add an optional `options` array to `GlossaryRuleSchema` in `lib/schemas.ts`
        (`{ name: string, requirement: string, requirementLabel: string, effect: string }[]`)
        with a doc comment explaining the Rituals/Blessings provenance.

- [x] ✅ **Step 2: Curated extraction at ingest**
  - [x] ✅ Add `ARMY_RULE_OPTION_TABLES` (factionId → `{ selectionEntry, armyRule }`) — landed in
        a sibling module `lib/ingest/armyRuleOptions.ts` (kept `armyRules.ts` from getting
        crowded with a second curation concern), covering `thousand-sons` → `Rituals reference`
        / `Cabal of Sorcerers` and `world-eaters` → `Blessings of Khorne Reference` /
        `Blessings of Khorne`.
  - [x] ✅ Wrote the extraction helper `attachArmyRuleOptions`: locates the named `selectionEntry`
        in the faction's own catalogue, reads its child `<profile>` nodes generically (profile
        `name` + its two characteristics — the non-`Effect` one becomes
        `requirement`/`requirementLabel`, the `Effect` one becomes `effect`), and attaches the
        resulting list as `options` on the matching `ARMY_RULES`-flagged glossary entry.
  - [x] ✅ Wired the helper into `toFactionArtifact` (alongside `flagArmyRules`) and exposed it as
        a re-runnable back-fill CLI `armyRuleOptionsCli.ts` (`npm run ingest:armyruleoptions`),
        following the `armyRulesCli.ts` read→patch→rewrite pattern — it additionally re-fetches
        and re-parses just the faction's own catalogue (cached by `fetchRaw`) since the
        reference table lives in raw BSData, not the committed artifact.

- [x] ✅ **Step 3: Render in `RulesReferenceSection`**
  - [x] ✅ Re-typed `armyRules`/`detachmentRules` from `Rule[]` to `GlossaryRule[]` (re-exported
        from `lib/types`; both already flow through as `GlossaryRule[]`/`DetachmentRule[]` from
        `RosterMeta` — the prop types were just looser than the data) so cards can read
        `rule.options`. When an army-rule card has `options`, it now renders a nested `<ul>`
        sub-list under its effect text — each entry showing name, a requirement pill
        (`requirementLabel`: `requirement`), and effect — open/closed in step with the parent
        card's existing toggle state (`isOpen`).
  - [x] ✅ Added `.options` / `.option` / `.optionTop` / `.optionName` / `.requirement` /
        `.optionEffect` to `RulesReferenceSection.module.css`, reusing the existing card's type
        scale, dashed-divider, and signal-pill (`ConditionPill`'s `cp` palette) visual language —
        no new section chrome.

- [x] ✅ **Step 4: Run and verify**
  - [x] ✅ Ran `npm run ingest:armyruleoptions -- --factions thousand-sons,world-eaters`. First
        pass surfaced a real-world wrinkle the plan didn't anticipate: World Eaters' "Blessings
        of Khorne Reference" lives in the catalogue's `sharedSelectionEntries`, not
        `selectionEntries` (Thousand Sons' "Rituals reference" does) — `attachArmyRuleOptions`
        now checks both. Final run: `thousand-sons: Cabal of Sorcerers — 4 option(s)`,
        `world-eaters: Blessings of Khorne — 12 option(s)`. Confirmed via the artifact JSON that
        `options` landed only on those two glossary entries with the expected
        name/requirementLabel/requirement/effect shape (Warp Charge 5/6/7/9; Roll "Double N+"
        across 12 Blessings, including the "Greater Boon of Khorne" variants).
  - [x] ✅ Manually verified both factions' roster views in a headless-Chromium (Playwright) pass
        against the dev server: imported a minimal text roster for each faction, opened "Army &
        Detachment Rules", expanded the army-rule card — `Cabal of Sorcerers` shows its 4
        Rituals with "Warp Charge: N" pills and `Blessings of Khorne` shows its 12 Blessings
        with "Roll: Double N+" pills, names and effect prose all correct, nested list opens/
        closes with the parent card, no console errors. Screenshots confirm the pill styling
        matches the existing signal palette and the dashed-divider sub-list sits cleanly under
        the effect text with no new section chrome. No regression: other factions' army-rule
        cards (no `options`) render exactly as before.
