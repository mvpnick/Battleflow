'use client'

import { useEffect, useRef, useState } from 'react'
import type { DataManifest, FactionArtifact, ManifestFaction } from '@/lib/dataModel'
import type { Roster } from '@/lib/types'
import { loadFaction, loadManifest } from '@/lib/data/loader'
import { toRoster } from '@/lib/data/adapter'
import { PhaseReferenceScreen } from '@/components/layout/PhaseReferenceScreen'
import styles from './FactionBrowser.module.css'

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; manifest?: DataManifest }
  | { kind: 'picker'; manifest: DataManifest }
  | { kind: 'loadingFaction'; manifest: DataManifest; name: string }
  | { kind: 'viewing'; manifest: DataManifest; faction: FactionArtifact; roster: Roster }

export function FactionBrowser() {
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [reload, setReload] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    loadManifest()
      .then((manifest) => active && setView({ kind: 'picker', manifest }))
      .catch((err) => active && setView({ kind: 'error', message: errMessage(err) }))
    return () => {
      active = false
    }
  }, [reload])

  function retryManifest() {
    setView({ kind: 'loading' })
    setReload((n) => n + 1)
  }

  async function pick(manifest: DataManifest, faction: ManifestFaction) {
    setView({ kind: 'loadingFaction', manifest, name: faction.factionName })
    try {
      const artifact = await loadFaction(faction)
      if (mounted.current) {
        setView({ kind: 'viewing', manifest, faction: artifact, roster: toRoster(artifact) })
      }
    } catch (err) {
      // Retain the manifest so Retry can return to the picker without a full reload.
      if (mounted.current) setView({ kind: 'error', message: errMessage(err), manifest })
    }
  }

  if (view.kind === 'viewing') {
    return (
      <PhaseReferenceScreen
        roster={view.roster}
        title={view.faction.factionName}
        meta={`${view.faction.units.length} datasheets`}
        version={view.manifest.bsDataTag}
        onBack={() => setView({ kind: 'picker', manifest: view.manifest })}
      />
    )
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Choose a faction</h1>
        <p className={styles.sub}>
          Game data loads on demand — only the faction you pick is downloaded.
        </p>
      </header>

      {view.kind === 'loading' && <p className={styles.status}>Loading factions…</p>}

      {view.kind === 'error' && (
        <div className={styles.status}>
          <p className={styles.error}>{view.message}</p>
          <button
            className={styles.retry}
            onClick={() =>
              view.manifest
                ? setView({ kind: 'picker', manifest: view.manifest })
                : retryManifest()
            }
          >
            Retry
          </button>
        </div>
      )}

      {view.kind === 'loadingFaction' && (
        <p className={styles.status}>Loading {view.name}…</p>
      )}

      {(view.kind === 'picker' || view.kind === 'loadingFaction') && (
        <>
          <ul className={styles.list}>
            {view.manifest.factions.map((f) => (
              <li key={f.factionId}>
                <button
                  className={styles.faction}
                  disabled={view.kind === 'loadingFaction'}
                  onClick={() => pick(view.manifest, f)}
                >
                  <span className={styles.factionName}>{f.factionName}</span>
                  <span className={styles.factionMeta}>
                    {f.unitCount} units · {(f.bytes / 1024).toFixed(0)} KB
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <footer className={styles.footer}>
            BSData {view.manifest.bsDataTag} · {view.manifest.factions.length} factions
          </footer>
        </>
      )}
    </main>
  )
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}
