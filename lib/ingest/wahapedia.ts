import { parse, type HTMLElement } from 'node-html-parser'
import type { Strat } from '../types'

/**
 * Offline Wahapedia stratagem scraper.
 *
 * BSData does not model stratagems as machine-readable profiles, so faction stratagems
 * are sourced separately from wahapedia.ru's static, server-rendered faction pages. Each
 * stratagem is a `.str10Wrap` card; the cards are grouped under detachment headings encoded
 * in the card's type line (e.g. "Hallowed Martyrs – Epic Deed Stratagem"). This module
 * fetches a faction page and returns one `Strat[]` per detachment group.
 *
 * Run-once at ingest time only — never on the request path.
 */

const WAHAPEDIA_BASE = 'https://wahapedia.ru/wh40k10ed/factions'

/** Identify the offline scraper so Wahapedia can attribute (and rate-limit) it fairly. */
const USER_AGENT =
  'battleflow-ingest (offline faction-data prep; https://github.com/mvpnick/Battleflow)'

/** Stratagems for one detachment, keyed by the detachment's display name. */
export type DetachmentStratagems = { name: string; stratagems: Strat[] }

/** Fetch a faction's Wahapedia page HTML with a respectful User-Agent. */
export async function fetchFactionPage(slug: string): Promise<string> {
  const res = await fetch(`${WAHAPEDIA_BASE}/${slug}/`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Wahapedia page for "${slug}" (HTTP ${res.status}).`)
  }
  return res.text()
}

/** Parse an integer CP cost from strings like "1CP", "2 CP". Defaults to 1. */
function parseCp(raw: string): number {
  const m = raw.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

/** Infer the usage restriction from a stratagem's combined prose. */
function parseOnce(text: string): 'battle' | 'phase' | false {
  const t = text.toLowerCase()
  if (t.includes('once per battle')) return 'battle'
  if (t.includes('once per phase') || t.includes('once per turn')) return 'phase'
  return false
}

/** Words kept lowercase mid-title when normalizing Wahapedia's ALL-CAPS names. */
const TITLE_MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of',
  'on', 'or', 'the', 'to', 'with',
])

/**
 * Normalize Wahapedia's shouty ALL-CAPS titles to the Title Case used by the rest of
 * the dataset (matching `coreStratagems.ts`), e.g. "TO THE HEART OF HERESY" →
 * "To the Heart of Heresy".
 */
function toTitleCase(name: string): string {
  const words = name.toLowerCase().split(/\s+/)
  return words
    .map((w, i) => {
      if (i > 0 && TITLE_MINOR_WORDS.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

/** Decode an HTML fragment to clean, single-spaced plain text. */
function htmlToText(html: string): string {
  // Convert <br> to spaces so sentences either side don't fuse; parse() then strips the
  // remaining tags (tooltips, keyword spans, links) and decodes HTML entities.
  return parse(html.replace(/<br\s*\/?>/gi, ' '))
    .text.replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split a `.str10Text` body into its labelled sections. Wahapedia delimits them with bold
 * labels (`<b>WHEN:</b>`, `<b>TARGET:</b>`, …); each section runs until the next label.
 */
function splitSections(bodyHtml: string): Record<string, string> {
  const re = /<b>\s*(WHEN|TARGET|EFFECT|RESTRICTIONS)\s*:\s*<\/b>/gi
  const marks: { label: string; bodyStart: number; labelStart: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(bodyHtml))) {
    marks.push({ label: m[1].toUpperCase(), labelStart: m.index, bodyStart: re.lastIndex })
  }

  const sections: Record<string, string> = {}
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].labelStart : bodyHtml.length
    sections[marks[i].label] = htmlToText(bodyHtml.slice(marks[i].bodyStart, end))
  }
  return sections
}

/** Parse one `.str10Wrap` card into a `Strat` plus the detachment group it belongs to. */
function parseCard(card: HTMLElement, source: string): { group: string; strat: Strat } | null {
  const name = card.querySelector('.str10Name')?.text.trim()
  if (!name) return null

  // "Hallowed Martyrs – Epic Deed Stratagem" → group "Hallowed Martyrs" (drop the category).
  const typeText = card.querySelector('.str10Type')?.text.trim() ?? ''
  const group = typeText.split(/\s+[–—-]\s+/)[0].trim()
  if (!group) return null

  const cpText = card.querySelector('.str10CP')?.text ?? ''
  const summary = card.querySelector('.str10Legend')?.text.trim() ?? ''
  const bodyHtml = card.querySelector('.str10Text')?.innerHTML ?? ''
  const s = splitSections(bodyHtml)

  const strat: Strat = {
    name: toTitleCase(name),
    cp: parseCp(cpText),
    timing: s.WHEN ?? '',
    cond: s.TARGET || undefined,
    effect: s.EFFECT ?? '',
    once: parseOnce([s.WHEN, s.RESTRICTIONS, s.EFFECT].filter(Boolean).join(' ')),
    source,
    summary: summary || undefined,
  }
  return { group, strat }
}

/**
 * Parse all stratagem cards from a faction page's HTML, grouped by detachment in the order
 * they first appear. `source` is the faction display name, recorded on each `Strat`.
 */
export function parseStratagems(html: string, source: string): DetachmentStratagems[] {
  const groups = new Map<string, Strat[]>()
  for (const card of parse(html).querySelectorAll('.str10Wrap')) {
    const parsed = parseCard(card, source)
    if (!parsed) continue
    const list = groups.get(parsed.group) ?? []
    list.push(parsed.strat)
    groups.set(parsed.group, list)
  }
  return [...groups.entries()].map(([name, stratagems]) => ({ name, stratagems }))
}

/** Fetch + parse a faction's Wahapedia stratagems in one step. */
export async function scrapeFaction(slug: string, source: string): Promise<DetachmentStratagems[]> {
  return parseStratagems(await fetchFactionPage(slug), source)
}
