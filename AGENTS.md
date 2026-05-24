<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Game data (BSData ingestion)

Faction rules come from the community repo `BSData/wh40k-10e` (BattleScribe XML). We do not
fetch it at runtime. Instead a maintainer runs an offline ingestion that normalizes the XML into
small, self-contained per-faction JSON artifacts committed under `public/data/`.

## Architecture
- **Ingestion (offline)** — `lib/ingest/` + `lib/parsers/bsdata.ts`. Fetches the pinned release,
  resolves BSData UUID cross-references (`catalogueLink` / `infoLink` / `entryLink`) across the
  faction `.cat` + imported catalogues + the `.gst`, and emits `FactionArtifact`s. Run-once,
  never on the request path.
- **Storage** — committed JSON in `public/data/factions/<id>.json` + `public/data/manifest.json`,
  served as static CDN assets. Artifacts are versioned by content hash; the client requests them
  with `?v=<sha256>` so `next.config.ts` can mark them `immutable`. (Upgrade path if repo size
  becomes a problem: move artifacts to Vercel Blob — change only `lib/data/loader.ts`.)
- **Runtime** — `lib/data/loader.ts` (the storage seam) + `lib/data/adapter.ts`. The client
  loads exactly one faction on demand (`components/faction/FactionBrowser.tsx`).
- **Types** — `lib/dataModel.ts` (`FactionArtifact`, `PreparedUnit`, `DataManifest`), extending
  the UI types in `lib/types.ts`.

## Updating game data (the "living rules" bump)
1. `npm run ingest -- --tag vX.Y.Z` (omit `--tag` to use the latest GitHub release; `--factions
   <slug,slug|all>`, `--dry-run` also supported). Set `GITHUB_TOKEN` to avoid API rate limits.
2. Review `git diff public/data/` — it's a readable, reviewable data diff.
3. Commit and deploy. The pinned tag + commit are recorded in `manifest.json`.

## Known limitations / deferred
- **Phase inference is NOT done yet.** BSData has no phase field; `PreparedUnit.phases` is the
  reserved slot. Until it's populated, `lib/data/adapter.ts` surfaces every unit under every phase
  (the screen works as a faction datasheet browser, not yet a real phase filter).
- **Detachments/stratagems are not extracted** — BSData 10e doesn't model stratagems as profiles,
  so `FactionArtifact.detachments` is currently empty (revisit alongside phase inference).
- **Licensing:** `BSData/wh40k-10e` has no explicit license; Warhammer 40,000 is Games Workshop
  IP. Distributing this data in a public product is a legal question for the project owner.
