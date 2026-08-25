import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const REPO = 'BSData/wh40k-11e'
const API_BASE = `https://api.github.com/repos/${REPO}`
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`
const CACHE_ROOT = join(process.cwd(), '.bsdata-cache')

function ghHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'battleflow-ingest',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Get the repo's default branch name (e.g. "main"). */
async function getDefaultBranch(): Promise<string> {
  const res = await fetch(API_BASE, { headers: ghHeaders() })
  if (!res.ok) throw new Error(`Could not fetch repo metadata (HTTP ${res.status}).`)
  const body = (await res.json()) as { default_branch: string }
  return body.default_branch
}

/**
 * Get the ref to ingest: the latest published release tag if one exists (self-upgrading
 * for whenever `wh40k-11e` eventually starts tagging releases), falling back to the tip of
 * the default branch — `wh40k-11e` currently ships no GitHub Releases at all, so this
 * fallback is the common path today.
 */
export async function getLatestRef(): Promise<string> {
  const res = await fetch(`${API_BASE}/releases/latest`, { headers: ghHeaders() })
  if (res.ok) {
    const body = (await res.json()) as { tag_name: string }
    return body.tag_name
  }
  if (res.status !== 404) {
    throw new Error(`Could not fetch latest release (HTTP ${res.status}).`)
  }
  return getDefaultBranch()
}

export type ResolvedRef = { ref: string; sha: string }

/** Resolve a release tag (or branch/sha) to a concrete commit sha. */
export async function resolveRef(ref: string): Promise<ResolvedRef> {
  const res = await fetch(`${API_BASE}/commits/${encodeURIComponent(ref)}`, {
    headers: ghHeaders(),
  })
  if (!res.ok) {
    throw new Error(
      `Could not resolve ref "${ref}" (HTTP ${res.status}). ` +
        (res.status === 403 ? 'You may be rate-limited — set GITHUB_TOKEN.' : ''),
    )
  }
  const body = (await res.json()) as { sha: string }
  return { ref, sha: body.sha }
}

export type DataFiles = { gst: string; catalogues: string[] }

/** The GST's exact filename — `.json` alone isn't discriminating, every catalogue also ends in it. */
const GST_FILENAME = 'Warhammer 40,000.json'

/** List the game-system JSON file and all catalogue JSON files at a commit. */
export async function listDataFiles(sha: string): Promise<DataFiles> {
  const res = await fetch(`${API_BASE}/contents?ref=${sha}`, { headers: ghHeaders() })
  if (!res.ok) throw new Error(`Could not list repo contents (HTTP ${res.status}).`)
  const entries = (await res.json()) as { name: string; type: string }[]
  const names = entries.filter((e) => e.type === 'file').map((e) => e.name)
  const gst = names.find((n) => n === GST_FILENAME)
  if (!gst) throw new Error(`No "${GST_FILENAME}" game-system file found in repo.`)
  return {
    gst,
    catalogues: names.filter((n) => n.endsWith('.json') && n !== GST_FILENAME).sort(),
  }
}

/** Fetch a raw file at a pinned sha, caching it on disk keyed by sha. */
export async function fetchRaw(sha: string, filename: string): Promise<string> {
  const cacheDir = join(CACHE_ROOT, sha)
  const cachePath = join(cacheDir, filename)
  if (existsSync(cachePath)) return readFile(cachePath, 'utf8')

  const url = `${RAW_BASE}/${sha}/${encodeURIComponent(filename).replace(/%2F/g, '/')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${filename} (HTTP ${res.status}).`)
  const text = await res.text()

  await mkdir(cacheDir, { recursive: true })
  await writeFile(cachePath, text, 'utf8')
  return text
}
