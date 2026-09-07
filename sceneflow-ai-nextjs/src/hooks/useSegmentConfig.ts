/**
 * useSegmentConfig Hook - Auto-Draft Logic for Director's Console
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { useMemo } from 'react'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  collectDraftStoryboardFrameWarnings,
  resolveEffectiveStoryboardTier,
} from '@/lib/storyboard/storyboardQuality'
import {
  buildSegmentConfigsMap,
  buildDraftVideoGenerationConfig,
  resolveSegmentFrameUrls,
  type SegmentGuideContext,
  type SegmentConfigResult,
} from '@/lib/vision/segmentConfigBuilder'

export type { SegmentGuideContext, SegmentConfigResult } from '@/lib/vision/segmentConfigBuilder'
export { buildSegmentConfigsMap, segmentHasBatchGuideDialogue } from '@/lib/vision/segmentConfigBuilder'

export function useSegmentConfig(
  segment: SceneSegment,
  sceneImageUrl?: string,
  guideContext?: SegmentGuideContext,
  defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9'
): SegmentConfigResult {
  return useMemo(() => {
    const drafted = buildDraftVideoGenerationConfig(
      segment,
      sceneImageUrl,
      [segment],
      guideContext,
      defaultAspectRatio
    )
    const { config, methodLabel, methodReason } = drafted

    const { startFrameUrl: resolvedStart } = resolveSegmentFrameUrls(
      segment,
      sceneImageUrl,
      guideContext?.fullScene
    )

    let qualityWarning: string | undefined
    if (guideContext?.scene && segment.beatId && resolvedStart) {
      const beat = getSceneBeats(guideContext.scene).find((b) => b.beatId === segment.beatId)
      if (
        beat?.storyboardImageUrl?.trim() &&
        resolveEffectiveStoryboardTier(beat.storyboardImageTier) !== 'final'
      ) {
        qualityWarning = collectDraftStoryboardFrameWarnings(guideContext.scene)[0]
      }
    }

    return {
      config,
      isReady: config.confidence >= 50 && config.approvalStatus !== 'error',
      isApproved: config.approvalStatus === 'user-approved',
      methodLabel,
      methodReason,
      qualityWarning,
    }
  }, [segment, sceneImageUrl, guideContext, defaultAspectRatio])
}

/**
 * Hook to batch-process multiple segments and generate configs
 */
export function useSegmentConfigs(
  segments: SceneSegment[],
  sceneImageUrl?: string,
  skip?: boolean,
  guideContext?: SegmentGuideContext,
  defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9'
): Map<string, SegmentConfigResult> {
  return useMemo(() => {
    if (skip) {
      return new Map<string, SegmentConfigResult>()
    }
    return buildSegmentConfigsMap(segments, sceneImageUrl, guideContext, defaultAspectRatio)
  }, [segments, sceneImageUrl, skip, guideContext, defaultAspectRatio])
}

export default useSegmentConfig
