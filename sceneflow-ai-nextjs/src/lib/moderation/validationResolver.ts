/**
 * Resolve content for user-initiated moderation validation from project metadata.
 */

import {
  aggregateBlueprintOutputText,
  aggregateBlueprintInputText,
} from './blueprintText'
import { aggregateScriptText, type ModerationStage } from './moderationPipeline'

export type ValidationContentSource =
  | 'project_treatment'
  | 'project_script'
  | 'segment_asset'
  | 'character_image'

export interface ResolvedValidationContent {
  text?: string
  imageUrl?: string
  videoUrl?: string
  resourceId?: string
}

function getVisionPhase(metadata: Record<string, unknown> | null | undefined) {
  return (metadata?.visionPhase as Record<string, unknown>) || {}
}

function getScriptScenes(metadata: Record<string, unknown> | null | undefined) {
  const vp = getVisionPhase(metadata)
  const script = vp.script as Record<string, unknown> | undefined
  const nested = script?.script as Record<string, unknown> | undefined
  const scenes =
    (nested?.scenes as Array<Record<string, unknown>>) ||
    (script?.scenes as Array<Record<string, unknown>>) ||
    (vp.scenes as Array<Record<string, unknown>>) ||
    []
  return scenes
}

function findSegmentAsset(
  metadata: Record<string, unknown> | null | undefined,
  segmentId: string
): { assetUrl?: string; assetType?: string } | null {
  const scenes = getScriptScenes(metadata)
  for (const scene of scenes) {
    const segments = Array.isArray(scene.segments) ? scene.segments : []
    for (const seg of segments) {
      const s = seg as Record<string, unknown>
      if (String(s.segmentId || s.id) === segmentId) {
        const production = s.production as Record<string, unknown> | undefined
        const assetUrl =
          (production?.assetUrl as string) ||
          (s.assetUrl as string) ||
          (s.videoUrl as string)
        const assetType =
          (production?.assetType as string) ||
          (s.assetType as string) ||
          (assetUrl?.includes('.mp4') ? 'video' : 'image')
        return { assetUrl, assetType }
      }
    }
  }
  return null
}

function findCharacterImage(
  metadata: Record<string, unknown> | null | undefined,
  characterId: string
): string | undefined {
  const vp = getVisionPhase(metadata)
  const characters = Array.isArray(vp.characters) ? vp.characters : []
  for (const c of characters) {
    const char = c as Record<string, unknown>
    if (String(char.id || char.characterId) === characterId) {
      return (
        (char.referenceImage as string) ||
        (char.referenceUrl as string) ||
        (char.imageUrl as string)
      )
    }
  }
  return undefined
}

export function resolveValidationContent(params: {
  metadata: Record<string, unknown> | null | undefined
  stage: ModerationStage
  source?: ValidationContentSource
  resourceId?: string
  text?: string
  imageUrl?: string
  videoUrl?: string
}): ResolvedValidationContent {
  const { metadata, stage, source, resourceId } = params

  if (params.text?.trim()) return { text: params.text, resourceId }
  if (params.imageUrl) return { imageUrl: params.imageUrl, resourceId }
  if (params.videoUrl) return { videoUrl: params.videoUrl, resourceId }

  if (source === 'project_treatment' || (stage === 'blueprint' && !source)) {
    const vp = getVisionPhase(metadata)
    const treatment =
      (vp.filmTreatmentVariant as Record<string, unknown>) ||
      (metadata?.filmTreatmentVariant as Record<string, unknown>) ||
      (vp.filmTreatment as Record<string, unknown>)
    const text = treatment ? aggregateBlueprintOutputText(treatment) : ''
    if (!text && metadata) {
      return { text: aggregateBlueprintInputText(metadata as Record<string, unknown>), resourceId: 'treatment' }
    }
    return { text, resourceId: 'treatment' }
  }

  if (source === 'project_script' || stage === 'script') {
    const scenes = getScriptScenes(metadata)
    return { text: aggregateScriptText(scenes), resourceId: 'script' }
  }

  if (source === 'segment_asset' && resourceId) {
    const asset = findSegmentAsset(metadata, resourceId)
    if (!asset?.assetUrl) {
      throw new Error(`No asset found for segment ${resourceId}`)
    }
    if (asset.assetType === 'video' || asset.assetUrl.endsWith('.mp4')) {
      return { videoUrl: asset.assetUrl, resourceId }
    }
    return { imageUrl: asset.assetUrl, resourceId }
  }

  if (source === 'character_image' && resourceId) {
    const imageUrl = findCharacterImage(metadata, resourceId)
    if (!imageUrl) throw new Error(`No reference image for character ${resourceId}`)
    return { imageUrl, resourceId }
  }

  throw new Error('Provide text, imageUrl, videoUrl, or a valid source + resourceId')
}
