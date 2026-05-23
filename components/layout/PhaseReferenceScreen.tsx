'use client'

import { useState } from 'react'
import { PhaseId, DrawerPayload } from '@/lib/types'
import { PHASES, SAMPLE_ROSTER } from '@/lib/sampleData'
import { TopBar } from './TopBar'
import { PhaseNav } from './PhaseNav'
import { PhaseSummary } from './PhaseSummary'
import { UnitPhaseSection } from '@/components/roster/UnitPhaseSection'
import { DetailDrawer } from '@/components/roster/DetailDrawer'
import styles from './PhaseReferenceScreen.module.css'

export function PhaseReferenceScreen() {
  const [phase, setPhase] = useState<PhaseId>('fight')
  const [openUnitIds, setOpenUnitIds] = useState<Set<string>>(new Set(['assault-vets']))
  const [drawer, setDrawer] = useState<DrawerPayload>(null)

  const units = SAMPLE_ROSTER[phase] ?? []

  function handlePhaseChange(id: PhaseId) {
    setPhase(id)
    setDrawer(null)
  }

  function handleExpandAll() {
    setOpenUnitIds(new Set(units.map(u => u.id)))
  }

  return (
    <div className="bf-app">
      <TopBar rosterName="Strike Cadre" points={1995} cp={6} cpMax={12} />
      <PhaseNav phases={PHASES} activeId={phase} onChange={handlePhaseChange} />

      <div className={`bf-scroll ${styles.scroll}`}>
        <PhaseSummary units={units} onExpandAll={handleExpandAll} />

        {units.map(u => (
          <UnitPhaseSection
            key={u.id}
            unit={u}
            defaultOpen={openUnitIds.has(u.id)}
            onOpenDetail={setDrawer}
          />
        ))}

        {units.length === 0 && (
          <div className={styles.empty}>
            No phase-specific rules surface this phase.
          </div>
        )}
      </div>

      <DetailDrawer
        open={!!drawer}
        payload={drawer}
        onClose={() => setDrawer(null)}
      />
    </div>
  )
}
