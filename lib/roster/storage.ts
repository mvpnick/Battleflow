import type { Roster } from '../types'
import type { RosterMeta } from './buildRoster'

export type StoredRoster = {
  roster: Roster
  meta: RosterMeta
}

const KEY = 'bf_roster_v2'

export function saveRoster(data: StoredRoster): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function loadRoster(): StoredRoster | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.roster !== 'object' || typeof parsed?.meta !== 'object') {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed as StoredRoster
  } catch {
    // Corrupt or schema-incompatible data — clear it so future loads don't keep failing
    try { localStorage.removeItem(KEY) } catch {}
    return null
  }
}

// useSyncExternalStore plumbing. getSnapshot must return a stable reference while
// the stored value is unchanged, so we cache the parsed object keyed by the raw
// localStorage string and only re-parse when it actually changes.
let snapshotRaw: string | null = null
let snapshotValue: StoredRoster | null = null

export function getRosterSnapshot(): StoredRoster | null {
  const raw = localStorage.getItem(KEY)
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshotValue = loadRoster()
  }
  return snapshotValue
}

export function subscribeRoster(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}
