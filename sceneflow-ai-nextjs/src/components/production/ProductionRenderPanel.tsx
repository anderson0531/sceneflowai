'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FinalCutStreamsPanel } from '@/components/final-cut/FinalCutStreamsPanel'
import { buildFinalCutClips } from '@/lib/final-cut/useFinalCutClips'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import type { FinalCutSelection } from '@/lib/types/finalCut'

const DEFAULT_SELECTION: FinalCutSelection = {
  format: 'full-video',
  language: 'en',
  perSceneOverrides: {},
}

export interface ProductionRenderPanelProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  onClose?: () => void
}

export function ProductionRenderPanel({
  projectId,
  projectTitle,
  metadata,
  onClose,
}: ProductionRenderPanelProps) {
  const [selection, setSelection] = useState<FinalCutSelection>(DEFAULT_SELECTION)
  const [lastRenderUrl, setLastRenderUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stored = (metadata as { finalCut?: FinalCutSelection } | null)?.finalCut
    if (stored?.format && stored?.language) {
      setSelection(stored)
    }
    const exported = (metadata as { exportedVideoUrl?: string } | null)?.exportedVideoUrl
    if (exported) setLastRenderUrl(exported)
  }, [metadata])

  const projectLike = useMemo(
    () => ({ id: projectId, metadata }),
    [projectId, metadata]
  )

  const clips = useMemo(
    () => buildFinalCutClips({ project: projectLike, selection }),
    [projectLike, selection]
  )

  const availableLanguages = useMemo(
    () => getAvailableLanguagesForFormat(projectLike, selection.format),
    [projectLike, selection.format]
  )

  const persistSelection = useCallback(
    async (next: FinalCutSelection) => {
      setSaving(true)
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...(typeof metadata === 'object' && metadata ? metadata : {}),
              finalCut: next,
            },
          }),
        })
        if (!res.ok) throw new Error('Failed to save stream selection')
      } catch (err: any) {
        toast.error(err?.message || 'Could not save selection')
      } finally {
        setSaving(false)
      }
    },
    [projectId, metadata]
  )

  const handleRendered = useCallback(
    async (url: string) => {
      setLastRenderUrl(url)
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...(typeof metadata === 'object' && metadata ? metadata : {}),
              exportedVideoUrl: url,
              exportedVideoAt: new Date().toISOString(),
            },
          }),
        })
        toast.success('Production render complete')
        onClose?.()
      } catch {
        toast.error('Render saved locally but failed to persist URL')
      }
    },
    [projectId, metadata, onClose]
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Production Render</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Stitch all scene streams into one {selection.format === 'full-video' ? 'video' : 'animatic'} for{' '}
          {projectTitle || 'this project'}.
        </p>
      </div>
      <FinalCutStreamsPanel
        selection={selection}
        clips={clips}
        availableLanguages={availableLanguages}
        disabled={saving}
        showProductionLink={false}
        onChangeFormat={(format) => {
          const next = { ...selection, format }
          setSelection(next)
          void persistSelection(next)
        }}
        onChangeLanguage={(language) => {
          const next = { ...selection, language }
          setSelection(next)
          void persistSelection(next)
        }}
        onChangeSceneOverride={(sceneId, version) => {
          const overrides = { ...(selection.perSceneOverrides || {}) }
          if (version == null) {
            delete overrides[sceneId]
          } else {
            overrides[sceneId] = { streamVersion: version }
          }
          const next = { ...selection, perSceneOverrides: overrides }
          setSelection(next)
          void persistSelection(next)
        }}
        renderButtonProps={{
          projectId,
          filenameLabel: projectTitle || projectId,
          onRendered: handleRendered,
          lastRenderUrl,
        }}
      />
    </div>
  )
}
