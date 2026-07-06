/**
 * useSegmentConfig Hook - Auto-Draft Logic for Director's Console
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { useMemo } from 'react'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import type { VideoGenerationMethod } from '@/components/vision/scene-production/types'
import { resolveVeoRefForExtension } from '@/lib/video/veoChainQueue'
import { DEFAULT_VEO_CLIP_DURATION } from '@/lib/config/modelConfig'
import {
  buildDefaultBatchGuidePrompt,
  type GuideCharacterDemographic,
  type GuidePromptSceneContext,
} from '@/lib/scene/segmentGuidePrompt'
import {
  collectDraftStoryboardFrameWarnings,
  resolveEffectiveStoryboardTier,
} from '@/lib/storyboard/storyboardQuality'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { VideoGenerationConfig, ApprovalStatus } from '@/components/vision/scene-production/types'
import {
  buildSegmentConfigsMap,
  detectRecommendedMethod,
  calculateConfidence,
  determineApprovalStatus,
  generateMotionPrompt,
  generateVisualPrompt,
  resolveSegmentFrameUrls,
  segmentHasBatchGuideDialogue,
  toConfigReferenceImages,
  resolveConfigReferences,
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
    const method = detectRecommendedMethod(segment, sceneImageUrl, [segment], guideContext)
    const confidence = calculateConfidence(segment, method)
    const approvalStatus = determineApprovalStatus(segment)
    
    // Generate appropriate prompt based on method
    const motionPrompt = generateMotionPrompt(segment, sceneImageUrl)
    const visualPrompt = generateVisualPrompt(segment, sceneImageUrl)
    
    const prompt = visualPrompt

    const { startFrameUrl: resolvedStart } = resolveSegmentFrameUrls(
      segment,
      sceneImageUrl,
      guideContext?.fullScene
    )

    const guidePrompt =
      guideContext?.scene && segmentHasBatchGuideDialogue(segment)
        ? buildDefaultBatchGuidePrompt(
            segment,
            guideContext.scene,
            guideContext.characters ?? [],
          )
        : ''
    
    const extVeoRef =
      method === 'EXT' ? resolveVeoRefForExtension([segment], segment) : undefined

    const referenceImages = toConfigReferenceImages(
      resolveConfigReferences(segment, guideContext)
    )

    const config: VideoGenerationConfig = {
      mode: method,
      prompt,
      motionPrompt,
      visualPrompt,
      aspectRatio: defaultAspectRatio === '1:1' || defaultAspectRatio === '4:3'
        ? '16:9'
        : defaultAspectRatio,
      resolution: '720p',
      duration: DEFAULT_VEO_CLIP_DURATION,
      negativePrompt: '',
      approvalStatus,
      confidence,
      guidePrompt: guidePrompt || undefined,
      referenceImages: referenceImages?.length ? referenceImages : undefined,
      // Asset URLs for generation
      startFrameUrl: resolvedStart,
      endFrameUrl: null,
      sourceVideoUrl:
        extVeoRef ??
        (segment.activeAssetUrl && segment.assetType === 'video'
          ? segment.activeAssetUrl
          : null),
    }
    
    // Method labels for UI
    const methodLabels: Record<VideoGenerationMethod, string> = {
      FTV: 'Frame Interpolation',
      I2V: 'Image to Video',
      T2V: 'Text to Video',
      EXT: 'Video Extension',
      REF: 'Reference-Based',
    }
    
    // FRAME-FIRST: Enhanced method reasons with guidance
    const methodReasons: Record<VideoGenerationMethod, string> = {
      FTV: 'Legacy interpolation mode (not used on production path)',
      I2V: 'Start frame anchors character appearance',
      T2V: '⚠️ Lower quality: Generate frames first for better consistency',
      EXT: 'Extends existing video seamlessly',
      REF: 'Character references guide generation',
    }

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
      isReady: confidence >= 50 && approvalStatus !== 'error',
      isApproved: approvalStatus === 'user-approved',
      methodLabel: methodLabels[method],
      methodReason: methodReasons[method],
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
