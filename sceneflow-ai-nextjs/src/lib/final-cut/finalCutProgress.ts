/**
 * Unified Final Cut progress calculator for header strip, sidebar, and next-step banner.
 */

import type { WorkflowStepStatus } from '@/config/nav/workflowGuideConfig'
import type { FinalCutSceneClip, FinalCutSelection } from '@/lib/types/finalCut'
import { isMixedAssembly } from './finalCutPresets'

export interface FinalCutProgressInput {
  clips: FinalCutSceneClip[]
  selection: FinalCutSelection
  hasExportedVideo: boolean
  totalDurationSec: number
}

export interface FinalCutProgressResult {
  readyCount: number
  totalCount: number
  missingScenes: FinalCutSceneClip[]
  isAssemblyReady: boolean
  isMixedFormat: boolean
  nextStepLabel: string
  nextStepEvent: string | null
  guideStatus: Record<string, WorkflowStepStatus>
  progressItems: Array<{ id: string; label: string; isComplete: boolean; value?: string }>
}

export function formatFinalCutDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function calculateFinalCutProgress(input: FinalCutProgressInput): FinalCutProgressResult {
  const { clips, hasExportedVideo } = input
  const readyCount = clips.filter((c) => c.status === 'ready').length
  const totalCount = clips.length
  const missingScenes = clips.filter((c) => c.status !== 'ready')
  const isAssemblyReady = totalCount > 0 && readyCount === totalCount
  const isMixedFormat = isMixedAssembly(clips)

  let nextStepLabel = 'Render streams in Production Mixer'
  let nextStepEvent: string | null = 'final-cut:open-production'

  if (totalCount > 0 && readyCount > 0) {
    nextStepLabel = 'Pick streams per scene or apply a preset'
    nextStepEvent = 'final-cut:open-assembly'
  }
  if (isAssemblyReady && !hasExportedVideo) {
    nextStepLabel = 'Preview assembly, then Render Final Cut'
    nextStepEvent = 'final-cut:render'
  }
  if (hasExportedVideo) {
    nextStepLabel = 'Continue to Premiere'
    nextStepEvent = 'final-cut:open-premiere'
  }

  const guideStatus: Record<string, WorkflowStepStatus> = {
    'select-stream-type': totalCount > 0 ? 'complete' : 'pending',
    'select-language': readyCount > 0 ? 'complete' : 'pending',
    'review-duration': isAssemblyReady ? 'complete' : readyCount > 0 ? 'in-progress' : 'pending',
    'preview-assembly': isAssemblyReady ? 'complete' : 'pending',
    'export-master': hasExportedVideo ? 'complete' : isAssemblyReady ? 'in-progress' : 'pending',
    'share-premiere': hasExportedVideo ? 'in-progress' : 'pending',
  }

  const progressItems = [
    {
      id: 'streams-ready',
      label: 'Streams ready',
      isComplete: isAssemblyReady,
      value: totalCount ? `${readyCount}/${totalCount}` : undefined,
    },
    {
      id: 'assembly',
      label: 'Assembly configured',
      isComplete: readyCount > 0,
    },
    {
      id: 'export',
      label: 'Master exported',
      isComplete: hasExportedVideo,
    },
  ]

  return {
    readyCount,
    totalCount,
    missingScenes,
    isAssemblyReady,
    isMixedFormat,
    nextStepLabel,
    nextStepEvent,
    guideStatus,
    progressItems,
  }
}

export function scrollToAssemblySceneRow(sceneId: string) {
  if (typeof window === 'undefined') return
  const el = document.querySelector(`[data-assembly-scene="${sceneId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-violet-400/60', 'rounded-lg')
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-violet-400/60', 'rounded-lg')
    }, 2000)
  }
}
