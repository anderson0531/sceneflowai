/**
 * Assembly presets for Final Cut stream selection.
 */

import type {
  FinalCutAssemblyPresetId,
  FinalCutSelection,
  ProductionFormat,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import { getSceneProductionStateFromMetadata } from './projectProductionState'
import {
  getAvailableLanguagesForSceneStream,
  getAvailableSceneVersions,
  sceneHasReadyStream,
} from './resolveSegmentMedia'

export interface FinalCutPresetDefinition {
  id: FinalCutAssemblyPresetId
  label: string
  description: string
}

export const FINAL_CUT_PRESETS: FinalCutPresetDefinition[] = [
  {
    id: 'all-video',
    label: 'All Video',
    description: 'Latest full-motion stream per scene',
  },
  {
    id: 'all-animatic',
    label: 'All Animatic',
    description: 'Latest storyboard stream per scene',
  },
  {
    id: 'hybrid-review',
    label: 'Hybrid review',
    description: 'Video where available, Animatic fallback',
  },
  {
    id: 'custom',
    label: 'Custom mix',
    description: 'Pick format and language per scene',
  },
]

export interface ApplyPresetArgs {
  presetId: FinalCutAssemblyPresetId
  sceneIds: string[]
  metadata: unknown
  baselineLanguage?: ProductionLanguage
}

export function applyAssemblyPreset({
  presetId,
  sceneIds,
  metadata,
  baselineLanguage = 'en',
}: ApplyPresetArgs): FinalCutSelection {
  const sceneState = getSceneProductionStateFromMetadata(metadata)

  if (presetId === 'custom') {
    return {
      format: 'full-video',
      language: baselineLanguage,
      presetId: 'custom',
      perSceneOverrides: {},
    }
  }

  const format: ProductionFormat =
    presetId === 'all-animatic' ? 'animatic' : 'full-video'
  const language = baselineLanguage
  const perSceneOverrides: NonNullable<FinalCutSelection['perSceneOverrides']> = {}

  if (presetId === 'hybrid-review') {
    for (const sceneId of sceneIds) {
      const hasVideo = sceneHasReadyStream(sceneState, sceneId, 'video', language)
      if (!hasVideo) {
        const hasAnimatic = sceneHasReadyStream(sceneState, sceneId, 'animatic', language)
        if (hasAnimatic) {
          perSceneOverrides[sceneId] = { streamType: 'animatic', language }
        }
      }
    }
    return {
      format: 'full-video',
      language,
      presetId,
      perSceneOverrides,
    }
  }

  return {
    format,
    language,
    presetId,
    perSceneOverrides: {},
  }
}

export function isMixedAssembly(clips: Array<{ streamType?: string }>): boolean {
  const types = new Set(clips.map((c) => c.streamType).filter(Boolean))
  return types.size > 1
}
