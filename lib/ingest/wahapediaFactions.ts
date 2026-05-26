/**
 * Maps Battleflow faction IDs (our `public/data/factions/<id>.json` slugs, derived from
 * BSData catalogue names) to the slug used in a Wahapedia faction URL
 * (`https://wahapedia.ru/wh40k10ed/factions/<slug>/`).
 *
 * `null` marks a faction with no Wahapedia stratagem source — it is skipped during ingest.
 *
 * Two structural quirks of Wahapedia drive the non-identity mappings (all verified by live
 * HEAD request, May 2026):
 *
 * 1. Renamed factions — Wahapedia uses different slugs than BSData for a few armies
 *    (`craftworlds → aeldari`, `agents-of-the-imperium → imperial-agents`).
 *
 * 2. Space Marine chapters share ONE page — Wahapedia has no per-chapter pages; every
 *    chapter's detachments (Blood Angels, Dark Angels, Black Templars, Deathwatch, Space
 *    Wolves, and the codex-compliant Divisio chapters) live on the single `space-marines`
 *    page. We therefore point all chapter IDs at `space-marines`. Because ingest now scopes
 *    each chapter artifact to just its own detachments (the generic Codex set + that chapter's
 *    gated ones), the merge fills stratagems for the groups a chapter actually carries and
 *    SUPPRESSES shell synthesis for this shared page (see `wahapediaCli.ts`), so one chapter's
 *    page cannot re-introduce another chapter's detachments.
 */
export const WAHAPEDIA_SLUGS: Record<string, string | null> = {
  // — Identity mappings —
  'adepta-sororitas': 'adepta-sororitas',
  'adeptus-custodes': 'adeptus-custodes',
  'adeptus-mechanicus': 'adeptus-mechanicus',
  'astra-militarum': 'astra-militarum',
  'chaos-daemons': 'chaos-daemons',
  'chaos-knights': 'chaos-knights',
  'chaos-space-marines': 'chaos-space-marines',
  'death-guard': 'death-guard',
  'drukhari': 'drukhari',
  'genestealer-cults': 'genestealer-cults',
  'grey-knights': 'grey-knights',
  'imperial-knights': 'imperial-knights',
  'leagues-of-votann': 'leagues-of-votann',
  'necrons': 'necrons',
  'orks': 'orks',
  'space-marines': 'space-marines',
  't-au-empire': 't-au-empire',
  'thousand-sons': 'thousand-sons',
  'tyranids': 'tyranids',
  'world-eaters': 'world-eaters',

  // — Renamed on Wahapedia —
  'craftworlds': 'aeldari',
  'agents-of-the-imperium': 'imperial-agents',

  // — Space Marine chapters: all served by the shared `space-marines` page —
  'black-templars': 'space-marines',
  'blood-angels': 'space-marines',
  'dark-angels': 'space-marines',
  'deathwatch': 'space-marines',
  'imperial-fists': 'space-marines',
  'iron-hands': 'space-marines',
  'raven-guard': 'space-marines',
  'salamanders': 'space-marines',
  'space-wolves': 'space-marines',
  'ultramarines': 'space-marines',
  'white-scars': 'space-marines',

  // — No Wahapedia equivalent (skipped) —
  'adeptus-titanicus': null, // Adeptus Titanicus is a separate game system
  'titanicus-traitoris': null, // (Chaos) Titan Legions — likewise not in wh40k10ed
  'ynnari': null, // folded into the Aeldari page; no standalone detachments
}
