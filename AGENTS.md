<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Game data (BSData + Wahapedia ingestion)

Faction rules come from two community sources, both ingested offline (never on the request path)
into small, self-contained per-faction JSON artifacts committed under `public/data/`:
- **Datasheets + detachments/rules** — `BSData/wh40k-10e` (BattleScribe XML).
- **Stratagems** — `wahapedia.ru` faction pages (BSData does not model stratagems as
  machine-readable profiles).

## Architecture
- **BSData ingestion (offline)** — `lib/ingest/` + `lib/parsers/bsdata.ts`. Fetches the pinned
  release, resolves BSData UUID cross-references (`catalogueLink` / `infoLink` / `entryLink`)
  across the faction `.cat` + imported catalogues + the `.gst`, extracts detachments and their
  rules (`lib/ingest/detachments.ts`), and emits `FactionArtifact`s. Run-once, never on the
  request path.
  - **Detachment scoping.** A faction's import chain pulls in ally catalogues for roster-building
    (Agents of the Imperium, Imperial Knights, allied AM/Tyranids/Daemons libraries, …), and every
    Space Marine chapter imports the one shared SM codex that holds *all* chapters' detachments.
    `selectOwnedCatalogues` (in `detachments.ts`) therefore scopes extraction to a faction's own
    catalogue(s): the primary, the catalogue its top-level "Detachment" `entryLink` resolves into
    (for "library" factions like AM / Chaos Daemons / Aeldari), and any imported *chaptered codex*
    (a detachment group carrying `primary-catalogue` gating — the SM codex / Aeldari library).
    `extractDetachments` then gate-filters per chapter via `gatingChildIds`: a detachment is kept
    only if it is ungated, or gated to the faction's own catalogue id. Without this, factions leak
    each other's detachments and the 12 SM chapters each store the full 53-detachment union.
- **Wahapedia stratagem ingestion (offline)** — `lib/ingest/wahapedia.ts` (scraper) +
  `wahapediaCli.ts` (CLI) + `wahapediaFactions.ts` (faction→slug map). Scrapes the static faction
  pages, groups stratagem cards by detachment, and merges them into each existing artifact's
  `detachments[].stratagems` (matching detachment names case/punctuation-insensitively; appending
  synthesized shell detachments for any not in the pinned BSData release). Synthesis is suppressed
  for pages shared by >1 faction (only `space-marines`, served to all 12 chapters), so one
  chapter's page cannot re-introduce another chapter's detachments and undo the scoping above. Kept
  separate from the BSData CLI so the two sources refresh independently and stratagems need no
  GitHub token. Universal stratagems (Command Re-roll, Fire Overwatch, …) are maintained by hand in
  `lib/data/coreStratagems.ts`, not scraped.
- **Shared-detachment de-duplication (offline)** — `lib/ingest/dedupCli.ts`. Runs last (after
  Wahapedia). Detachments that end up byte-identical across ≥2 factions — the generic Codex: Space
  Marines detachments carried by all 12 chapters — are factored into a content-hashed
  `public/data/shared/<id>.json` set, removed from the per-faction artifacts, and referenced via
  `FactionArtifact.sharedDetachments`. The runtime loader merges them back. Faction-specific and
  Aeldari-library detachments (which differ in stratagem coverage) stay inline.
- **Storage** — committed JSON in `public/data/factions/<id>.json`, shared sets in
  `public/data/shared/<id>.json`, indexed by `public/data/manifest.json`, served as static CDN
  assets. Artifacts are versioned by content hash; the client requests them with `?v=<sha256>` so
  `next.config.ts` can mark them `immutable`. (Upgrade path if repo size becomes a problem: move
  artifacts to Vercel Blob — change only `lib/data/loader.ts`.)
- **Runtime** — `lib/data/loader.ts` (the storage seam) + `lib/data/adapter.ts`. The client
  loads exactly one faction on demand (`components/faction/FactionBrowser.tsx`); `loadFaction`
  also fetches and merges any shared detachment set the faction references.
- **Types** — `lib/dataModel.ts` (`FactionArtifact`, `PreparedUnit`, `DataManifest`,
  `SharedDetachmentSet`), extending the UI types in `lib/types.ts`.

## Updating game data (the "living rules" bump)
1. `npm run ingest -- --tag vX.Y.Z` (omit `--tag` to use the latest GitHub release; `--factions
   <slug,slug|all>`, `--dry-run` also supported). Set `GITHUB_TOKEN` to avoid API rate limits.
   This (re)writes datasheets + detachments/rules and resets `detachments[].stratagems`.
2. `npm run ingest:wahapedia -- [--factions <slug,slug|all>] [--dry-run]` to re-merge stratagems
   into the artifacts written in step 1. Run after every BSData ingest, since step 1 overwrites
   the artifacts the stratagems were merged into.
3. `npm run ingest:dedup -- [--dry-run]` to factor cross-faction-identical detachments (the shared
   SM Codex set) into `public/data/shared/`. Run last — it reads the final artifacts (stratagems
   already merged) and rewrites the per-faction ones with `sharedDetachments` references.
4. Review `git diff public/data/` — it's a readable, reviewable data diff.
5. Commit and deploy. The pinned tag + commit are recorded in `manifest.json`.

## Known limitations / deferred
- **Phase inference is NOT done yet.** BSData has no phase field; `PreparedUnit.phases` is the
  reserved slot. Until it's populated, `lib/data/adapter.ts` surfaces every unit under every phase
  (the screen works as a faction datasheet browser, not yet a real phase filter).
- **Stratagem phase filtering is a prose heuristic, not structured.** Stratagems carry no phase
  field; `Strat.timing` is free Wahapedia prose ("Your opponent's Shooting phase…"). The phase
  screen filters by keyword-matching that prose (`stratagemMatchesPhase` in
  `PhaseReferenceScreen.tsx`): a stratagem mentioning a phase word shows only under matching
  phases, one mentioning none shows under all. Good enough in practice, but it will mis-bucket any
  stratagem whose timing is worded unusually.
- **Stratagem coverage is incomplete.** 33/36 factions have stratagems merged;
  `adeptus-titanicus`, `titanicus-traitoris`, and `ynnari` have none (no standard Wahapedia 10e
  detachment page — Ynnari borrows Aeldari detachments). New detachments not in the pinned BSData
  release land as synthesized shells with empty `rules` — except on the shared `space-marines`
  page, where synthesis is suppressed, so a brand-new SM detachment absent from pinned BSData would
  not appear until a BSData bump (the trade-off that keeps chapters from leaking each other's
  detachments).
- **Detachment scoping mirrors BSData visibility, not a hand-curated legal list.** A few results
  follow BSData rather than intuition: `adeptus-titanicus` / `titanicus-traitoris` get 0
  detachments (a separate game system, no detachment group of their own), and Drukhari keeps the
  ungated Aeldari-library detachments alongside its own (BSData leaves them visible in any
  Aeldari-primary roster). See `docs/detachment-scoping-plan.md` for the full rule + per-faction
  counts.
- **Licensing:** `BSData/wh40k-10e` has no explicit license; Warhammer 40,000 is Games Workshop
  IP. Distributing this data in a public product is a legal question for the project owner.
