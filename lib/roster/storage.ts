import type { Roster } from '../types'
import type { RosterMeta } from './buildRoster'

export type StoredRoster = {
  roster: Roster
  meta: RosterMeta
}

const KEY = 'bf_roster_v1'

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
