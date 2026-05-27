'use client'

import { useState } from 'react'
import { PhaseId, DrawerPayload, Roster, Strat } from '@/lib/types'
import { PHASES, SAMPLE_ROSTER, SAMPLE_STRATAGEMS } from '@/lib/sampleData'
import { stratagemMatchesPhase, PHASE_KEYWORDS } from '@/lib/stratagems'
import { TopBar } from './TopBar'
import { PhaseNav } from './PhaseNav'
import { PhaseSummary } from './PhaseSummary'
import { PhaseStratagemSection } from './PhaseStratagemSection'
import { UnitPhaseSection } from '@/components/roster/UnitPhaseSection'
import { DetailDrawer } from '@/components/roster/DetailDrawer'
import styles from './PhaseReferenceScreen.module.css'

interface Props {
  roster?: Roster
  stratagems?: Strat[]
  title?: string
  meta?: string
  version?: string
  points?: number
  cp?: number
  cpMax?: number
  onBack?: () => void
}

export function PhaseReferenceScreen({
  roster,
  stratagems,
  title,
  meta,
  version,
  points,
  cp,
  cpMax,
  onBack,
}: Props) {
  const isDemo = !roster
  const effectiveRoster = roster ?? SAMPLE_ROSTER
  const effectiveStratagems = stratagems ?? (isDemo ? SAMPLE_STRATAGEMS : [])
  const effectiveTitle = title ?? 'Strike Cadre'
  const effectivePoints = points ?? (isDemo ? 1995 : undefined)
  const effectiveCp = cp ?? (isDemo ? 6 : undefined)
  const effectiveCpMax = cpMax ?? (isDemo ? 12 : undefined)

  const [phase, setPhase] = useState<PhaseId>('fight')
  const [openUnitIds, setOpenUnitIds] = useState<Set<string>>(new Set())
  const [drawer, setDrawer] = useState<DrawerPayload>(null)

  const units = effectiveRoster[phase] ?? []

  // Filter detachment stratagems to those that apply to the active phase, then
  // sort so phase-specific stratagems appear first and "any phase" ones last.
  // stratagemMatchesPhase returns true for both groups; we distinguish them for
  // sorting by checking whether the timing string explicitly names this phase
  // (via PHASE_KEYWORDS) — if not, the stratagem is "any phase" and goes last.
  const phaseKeyword = PHASE_KEYWORDS[phase]
  const phaseStratagems = effectiveStratagems
    .filter(s => stratagemMatchesPhase(s.timing, phase))
    .sort((a, b) => {
      const aSpecific = a.timing.toLowerCase().includes(phaseKeyword)
      const bSpecific = b.timing.toLowerCase().includes(phaseKeyword)
      if (aSpecific === bSpecific) return 0
      return aSpecific ? -1 : 1
    })

  function handlePhaseChange(id: PhaseId) {
    setPhase(id)
    setDrawer(null)
    setOpenUnitIds(new Set())
  }

  function handleToggleUnit(id: string) {
    setOpenUnitIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleExpandAll() {
    setOpenUnitIds(new Set(units.map(u => u.id)))
  }

  return (
    <div className="bf-app">
      <TopBar
        rosterName={effectiveTitle}
        meta={meta}
        version={version}
        points={effectivePoints}
        cp={effectiveCp}
        cpMax={effectiveCpMax}
        onBack={onBack}
      />
      <PhaseNav phases={PHASES} activeId={phase} onChange={handlePhaseChange} />

      <div className={`bf-scroll ${styles.scroll}`}>
        <PhaseSummary units={units} stratagemCount={phaseStratagems.length} onExpandAll={handleExpandAll} />

        <PhaseStratagemSection stratagems={phaseStratagems} />

        {units.map(u => (
          <UnitPhaseSection
            key={u.id}
            unit={u}
            phase={phase}
            open={openUnitIds.has(u.id)}
            onToggle={() => handleToggleUnit(u.id)}
            onOpenDetail={setDrawer}
          />
        ))}

        {units.length === 0 && (
          <div className={styles.empty}>
            No units for this phase.
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
