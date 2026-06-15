'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { FinalCutStreamsPanel } from '@/components/final-cut/FinalCutStreamsPanel'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import { buildFinalCutClips } from '@/lib/final-cut/useFinalCutClips'
import { readFinalCutSelection, useFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import type { FinalCutAssemblyPresetId } from '@/lib/types/finalCut'

interface ScreeningRoomAssemblePanelProps {
  projectId?: string
  isDemo?: boolean
  onMasterRendered?: (url: string) => void
}

export function ScreeningRoomAssemblePanel({
  projectId,
  isDemo = false,
  onMasterRendered,
}: ScreeningRoomAssemblePanelProps) {
  const currentProject = useStore((s) => s.currentProject)
  const updateProject = useStore((s) => s.updateProject)
  const [isSaving, setIsSaving] = useState(false)

  const sceneState = useMemo(
    () => getSceneProductionStateFromMetadata(currentProject?.metadata),
    [currentProject?.metadata]
  )

  const {
    selection,
    setSelection,
    handleApplyPreset,
    handleChangeSceneOverride,
    normalizeLanguage,
  } = useFinalCutSelection(sceneState)

  useEffect(() => {
    if (!currentProject?.metadata) return
    try {
      const initial = normalizeLanguage(readFinalCutSelection(currentProject.metadata))
      setSelection(initial)
    } catch {
      /* ignore */
    }
  }, [currentProject?.id, currentProject?.metadata, normalizeLanguage, setSelection])

  const clips = useMemo(
    () => buildFinalCutClips({ project: currentProject ?? null, selection }),
    [currentProject, selection]
  )

  const availableLanguages = useMemo(() => {
    const langs = getAvailableLanguagesForFormat(sceneState, selection.format)
    const fromClips = clips.flatMap((c) => c.availableLanguages ?? [])
    return Array.from(new Set([...langs, ...fromClips, selection.language])).sort()
  }, [sceneState, selection.format, selection.language, clips])

  const lastRenderUrl =
    (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl ?? null

  const productionHref = projectId
    ? `/dashboard/workflow/vision/${projectId}${isDemo ? '?demo=true' : ''}`
    : undefined

  const handleApplyPresetWrapped = useCallback(
    (presetId: FinalCutAssemblyPresetId) => {
      const sceneIds = clips.map((c) => c.sceneId)
      handleApplyPreset(presetId, currentProject?.metadata, sceneIds)
    },
    [clips, currentProject?.metadata, handleApplyPreset]
  )

  const persistSelection = useCallback(async () => {
    if (!projectId || isDemo || !currentProject) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...currentProject.metadata,
            finalCut: selection,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save assembly')
      updateProject(projectId, {
        metadata: {
          ...(currentProject.metadata as Record<string, unknown>),
          finalCut: selection,
        } as typeof currentProject.metadata,
      })
      toast.success('Assembly saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save assembly')
    } finally {
      setIsSaving(false)
    }
  }, [projectId, isDemo, currentProject, selection, updateProject])

  const handleRendered = useCallback(
    async (url: string) => {
      if (!projectId || isDemo || !currentProject) {
        onMasterRendered?.(url)
        return
      }
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...currentProject.metadata,
              exportedVideoUrl: url,
            },
          }),
        })
        if (!res.ok) throw new Error('Failed to save master URL')
        updateProject(projectId, {
          metadata: {
            ...(currentProject.metadata as Record<string, unknown>),
            exportedVideoUrl: url,
          } as typeof currentProject.metadata,
        })
        onMasterRendered?.(url)
        toast.success('Master render complete')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Render saved locally but project update failed')
        onMasterRendered?.(url)
      }
    },
    [projectId, isDemo, currentProject, updateProject, onMasterRendered]
  )

  if (!currentProject && !isDemo) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading project…
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 overflow-y-auto max-h-full">
      <div>
        <h2 className="text-lg font-semibold text-white">Assemble Master</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Pick Animatic or Video streams per scene, preview the full program, then render one master MP4.
        </p>
      </div>

      <FinalCutStreamsPanel
        selection={selection}
        clips={clips}
        availableLanguages={availableLanguages}
        onApplyPreset={handleApplyPresetWrapped}
        onChangeSceneOverride={handleChangeSceneOverride}
        productionHref={productionHref}
        projectId={projectId}
        embeddedInSection
        suppressOuterTitle
        renderButtonProps={{
          projectId,
          filenameLabel: currentProject?.title || 'master',
          onRendered: handleRendered,
          lastRenderUrl,
          onOpenPremiere: () => onMasterRendered?.(lastRenderUrl || ''),
        }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void persistSelection()}
          disabled={isSaving}
          className="px-4 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save assembly'}
        </button>
      </div>
    </div>
  )
}
