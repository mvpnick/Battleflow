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
  // Collapse the two modes (live roster vs. demo) into a single object so the rest
  // of the component body never branches on `isDemo`.  When no roster is supplied
  // the demo defaults fill every slot; prop values always take precedence.
  const resolved = roster
    ? { roster, stratagems: stratagems ?? [], title: title ?? '', meta, version, points, cp, cpMax }
    : {
        roster: SAMPLE_ROSTER,
        stratagems: SAMPLE_STRATAGEMS,
        title: 'Strike Cadre',
        meta,
        version,
        points: points ?? 1995,
        cp: cp ?? 6,
        cpMax: cpMax ?? 12,
      }

  const [phase, setPhase] = useState<PhaseId>('fight')
  const [openUnitIds, setOpenUnitIds] = useState<Set<string>>(new Set())
  const [drawer, setDrawer] = useState<DrawerPayload>(null)

  const units = resolved.roster[phase] ?? []

  // Filter detachment stratagems to those that apply to the active phase, then
  // sort so phase-specific stratagems appear first and "any phase" ones last.
  // stratagemMatchesPhase returns true for both groups; we distinguish them for
  // sorting by checking whether the timing string explicitly names this phase
  // (via PHASE_KEYWORDS) — if not, the stratagem is "any phase" and goes last.
  const phaseKeyword = PHASE_KEYWORDS[phase]
  const phaseStratagems = resolved.stratagems
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
        rosterName={resolved.title}
        meta={resolved.meta}
        version={resolved.version}
        points={resolved.points}
        cp={resolved.cp}
        cpMax={resolved.cpMax}
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
