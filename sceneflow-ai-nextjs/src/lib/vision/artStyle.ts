import { artStylePresets } from '@/constants/artStylePresets'
import {
  type ArtStyleSpec,
  buildArtStyleSpecFromValue,
  findArtStylePreset,
  isPhotorealisticArtStyle,
  resolveProjectArtStyleSpec,
  serializeArtStyleValue,
} from '@/lib/artStyle/globalArtStyle'
import {
  type BlueprintAspectRatio,
  DEFAULT_ASPECT_RATIO,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'

export { resolveProjectArtStyleSpec, isPhotorealisticArtStyle }

export function getArtStylePromptSuffix(
  artStyleId?: string | null,
  artStyleSpec?: Partial<ArtStyleSpec> | null
): string {
  if (!artStyleId?.trim() && !artStyleSpec) {
    return artStylePresets[0]?.promptSuffix ?? ''
  }
  const trimmed = artStyleId?.trim() || ''
  if (!artStyleSpec) {
    const preset = findArtStylePreset(trimmed)
    if (preset) return preset.promptSuffix
  }
  const spec = buildArtStyleSpecFromValue(trimmed, artStyleSpec)
  return spec.stylePrompt || artStylePresets[0]?.promptSuffix || ''
}

/**
 * Turn a stored anchor into prompt text.
 * Preset ids expand to the preset name and suffix. Free-text anchors stay as written.
 */
export function describeArtStyleAnchor(anchor?: string | null): string {
  const trimmed = anchor?.trim() || ''
  if (!trimmed) return ''
  const preset = findArtStylePreset(trimmed)
  if (!preset) return trimmed
  return preset.promptSuffix ? `${preset.name}: ${preset.promptSuffix}` : preset.name
}

/**
 * Motion suffix for video prompts.
 *
 * The still preset says "cinematic film still" and "8K, sharp focus", which
 * tells a video model to freeze a photograph. Video keeps the look and asks
 * for motion instead.
 */
export function getArtStyleVideoPromptSuffix(
  artStyleId?: string | null,
  artStyleSpec?: Partial<ArtStyleSpec> | null
): string {
  const trimmed = artStyleId?.trim() || ''
  if (!artStyleSpec) {
    const preset = !trimmed ? artStylePresets[0] : findArtStylePreset(trimmed)
    if (preset) {
      const parts = preset.promptSuffix
        .replace(/cinematic film still/gi, 'cinematic motion')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => {
          const token = part.toLowerCase()
          return token !== '8k' && token !== 'sharp focus'
        })
      return parts.join(', ')
    }
  }
  const spec = buildArtStyleSpecFromValue(trimmed, artStyleSpec)
  return spec.videoMotionDirective
}

export function getArtStyleNegativeTerms(
  artStyleId?: string | null,
  artStyleSpec?: Partial<ArtStyleSpec> | null
): string {
  const id = artStyleId?.trim() || 'photorealistic'
  if (!artStyleSpec) {
    if (id === 'photorealistic') {
      return 'anime, cartoon, illustration, painting, sketch, cel shading, 3D render'
    }
    if (id === 'anime-90s' || id === 'ghibli') {
      return 'photorealistic, live action, photograph, hyperrealistic'
    }
    if (id === 'pixar') {
      return 'photorealistic, live action, photograph, 2D flat animation'
    }
  }
  const spec = buildArtStyleSpecFromValue(id, artStyleSpec)
  if (spec.medium === 'live-action') {
    return spec.negativeTerms.join(', ')
  }
  const merged = Array.from(
    new Set([
      'photorealistic',
      'live action',
      'photograph',
      ...spec.negativeTerms,
    ])
  )
  return merged.join(', ')
}

export function resolveProjectArtStyle(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return 'photorealistic'
  const spec = resolveProjectArtStyleSpec(metadata)
  return serializeArtStyleValue(spec)
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
