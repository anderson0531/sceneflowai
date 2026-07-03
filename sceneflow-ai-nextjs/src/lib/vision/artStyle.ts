import { artStylePresets } from '@/constants/artStylePresets'
import {
  type BlueprintAspectRatio,
  DEFAULT_ASPECT_RATIO,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'

export function getArtStylePromptSuffix(artStyleId?: string | null): string {
  if (!artStyleId?.trim()) return artStylePresets[0]?.promptSuffix ?? ''
  const preset = artStylePresets.find((s) => s.id === artStyleId.trim())
  return preset?.promptSuffix ?? ''
}

export function getArtStyleNegativeTerms(artStyleId?: string | null): string {
  const id = artStyleId?.trim() || 'photorealistic'
  if (id === 'photorealistic') {
    return 'anime, cartoon, illustration, painting, sketch, cel shading, 3D render'
  }
  if (id.includes('anime') || id === 'ghibli') {
    return 'photorealistic, live action, photograph, hyperrealistic'
  }
  if (id === 'pixar') {
    return 'photorealistic, live action, photograph, 2D flat animation'
  }
  return 'style change, inconsistent art style, mixed media'
}

export function resolveProjectArtStyle(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return 'photorealistic'
  const meta = metadata as Record<string, unknown>
  const variant = meta.filmTreatmentVariant
  if (variant && typeof variant === 'object') {
    return resolveVariantArtStyle(variant as Record<string, unknown>)
  }
  const visionPhase = meta.visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') return 'photorealistic'
  const artStyle = (visionPhase as Record<string, unknown>).artStyle
  return typeof artStyle === 'string' && artStyle.trim() ? artStyle.trim() : 'photorealistic'
}

export function getAspectRatioTailwindClass(ratio: BlueprintAspectRatio): string {
  switch (ratio) {
    case '16:9':
      return 'aspect-video'
    case '9:16':
      return 'aspect-[9/16]'
    case '1:1':
      return 'aspect-square'
    case '4:3':
      return 'aspect-[4/3]'
    default:
      return 'aspect-video'
  }
}

export function toVideoAspectRatio(ratio: BlueprintAspectRatio): '16:9' | '9:16' {
  return ratio === '9:16' ? '9:16' : '16:9'
}

export function resolveProjectAspectRatio(metadata: unknown): BlueprintAspectRatio {
  if (!metadata || typeof metadata !== 'object') return DEFAULT_ASPECT_RATIO
  const meta = metadata as Record<string, unknown>
  const variant = meta.filmTreatmentVariant
  if (variant && typeof variant === 'object') {
    return resolveVariantAspectRatio(variant as Record<string, unknown>)
  }
  const generationSettings = meta.generationSettings
  if (generationSettings && typeof generationSettings === 'object') {
    const ratio = (generationSettings as Record<string, unknown>).aspectRatio
    if (typeof ratio === 'string') {
      return resolveVariantAspectRatio({ aspectRatio: ratio })
    }
  }
  return DEFAULT_ASPECT_RATIO
}
