'use client'

import { useState } from 'react'
import { PhaseReferenceScreen } from '@/components/layout/PhaseReferenceScreen'
import { loadRoster } from '@/lib/roster/storage'
import type { StoredRoster } from '@/lib/roster/storage'

/**
 * Reads a persisted roster from localStorage on mount and passes it to
 * PhaseReferenceScreen. Falls back to the built-in sample data when no
 * stored roster is present (e.g. direct URL access, first visit).
 *
 * Lazy initializer runs once on the client only — SSR returns undefined
 * (window absent), client returns the stored value without an extra render.
 */
export function RosterScreen() {
  const [stored] = useState<StoredRoster | null | undefined>(() =>
    typeof window !== 'undefined' ? loadRoster() : undefined
  )

  // undefined = SSR pass; render nothing so we don't flash sample data before
  // the client hydration resolves the real roster.
  if (stored === undefined) return null

  if (stored) {
    return (
      <PhaseReferenceScreen
        roster={stored.roster}
        title={stored.meta.factionName}
        meta={stored.meta.detachment}
        points={stored.meta.points}
      />
    )
  }

  return <PhaseReferenceScreen />
}
