'use client'

import { useSyncExternalStore } from 'react'
import { PhaseReferenceScreen } from '@/components/layout/PhaseReferenceScreen'
import { CORE_STRATAGEMS } from '@/lib/data/coreStratagems'
import { getRosterSnapshot, subscribeRoster } from '@/lib/roster/storage'

export function RosterScreen() {
  // localStorage is an external store, so read it via useSyncExternalStore. The
  // server snapshot is undefined; during hydration the client uses it too, so the
  // first client render matches the server (null) before the real roster resolves.
  const stored = useSyncExternalStore(subscribeRoster, getRosterSnapshot, () => undefined)

  // undefined = SSR/hydration pass; render null so server and client agree.
  if (stored === undefined) return null

  if (stored) {
    const stratagems = [...(stored.meta.stratagems ?? []), ...CORE_STRATAGEMS]
    return (
      <PhaseReferenceScreen
        roster={stored.roster}
        title={stored.meta.factionName}
        meta={stored.meta.detachment}
        points={stored.meta.points}
        stratagems={stratagems}
        armyRules={stored.meta.armyRules}
        detachmentRules={stored.meta.detachmentRules}
        detachmentMatched={stored.meta.detachmentMatched}
      />
    )
  }

  return <PhaseReferenceScreen />
}
