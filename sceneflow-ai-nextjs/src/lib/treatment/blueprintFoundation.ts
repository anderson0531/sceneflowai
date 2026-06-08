import { artStylePresets } from '@/constants/artStylePresets'

export type BlueprintAspectRatio = '16:9' | '9:16' | '1:1' | '4:3'

export const BLUEPRINT_ASPECT_RATIOS: BlueprintAspectRatio[] = ['16:9', '9:16', '1:1', '4:3']

export const DEFAULT_ART_STYLE = 'photorealistic'
export const DEFAULT_ASPECT_RATIO: BlueprintAspectRatio = '16:9'

const LEGACY_VISUAL_STYLE_MAP: Record<string, string> = {
  cinematic: 'photorealistic',
  documentary: 'photorealistic',
  realistic: 'photorealistic',
  'hyper-realistic': 'photorealistic',
  stylized: 'digital-art',
  vibrant: 'digital-art',
  noir: 'oil-painting',
  muted: 'watercolor',
  vintage: 'oil-painting',
  neon: 'digital-art',
  minimalist: 'sketch',
  animation: 'pixar',
}

const VALID_ART_STYLE_IDS = new Set(artStylePresets.map((p) => p.id))

/** Map legacy cinematic visual_style strings to artStyle preset IDs. */
export function mapLegacyVisualStyle(visualStyle?: string | null): string | undefined {
  if (!visualStyle?.trim()) return undefined
  const key = visualStyle.trim().toLowerCase()
  if (VALID_ART_STYLE_IDS.has(key)) return key
  return LEGACY_VISUAL_STYLE_MAP[key]
}

export function isBlueprintAspectRatio(value: unknown): value is BlueprintAspectRatio {
  return typeof value === 'string' && BLUEPRINT_ASPECT_RATIOS.includes(value as BlueprintAspectRatio)
}

export function resolveVariantArtStyle(variant: Record<string, unknown> | null | undefined): string {
  if (!variant) return DEFAULT_ART_STYLE
  const direct = variant.artStyle
  if (typeof direct === 'string' && direct.trim() && VALID_ART_STYLE_IDS.has(direct.trim())) {
    return direct.trim()
  }
  const legacy = mapLegacyVisualStyle(
    typeof variant.visual_style === 'string' ? variant.visual_style : undefined
  )
  return legacy && VALID_ART_STYLE_IDS.has(legacy) ? legacy : DEFAULT_ART_STYLE
}

export function resolveVariantAspectRatio(
  variant: Record<string, unknown> | null | undefined
): BlueprintAspectRatio {
  if (!variant) return DEFAULT_ASPECT_RATIO
  if (isBlueprintAspectRatio(variant.aspectRatio)) return variant.aspectRatio
  return DEFAULT_ASPECT_RATIO
}

export function getArtStylePresetName(artStyleId: string): string {
  return artStylePresets.find((p) => p.id === artStyleId)?.name ?? artStyleId
}

/** Normalize foundation fields on read; sets visual_style to preset name for legacy prompt paths. */
export function normalizeVariantFoundation<T extends Record<string, unknown>>(variant: T): T {
  const artStyle = resolveVariantArtStyle(variant)
  const aspectRatio = resolveVariantAspectRatio(variant)
  const presetName = getArtStylePresetName(artStyle)
  return {
    ...variant,
    artStyle,
    aspectRatio,
    visual_style: presetName,
  }
}

export function buildArtStylePromptBlock(artStyleId?: string | null): string {
  const id = artStyleId?.trim() || DEFAULT_ART_STYLE
  const preset = artStylePresets.find((p) => p.id === id) ?? artStylePresets[0]
  if (!preset) return ''
  return `
LOCKED ART STYLE — ${preset.name}:
- Visual texture: ${preset.promptSuffix}
- Weave this aesthetic into dialogue voice, atmospheric descriptions, pacing, and beat intent.
- Character descriptions and scene atmosphere must feel native to ${preset.name}, not generic prose.
- The "visual_style" field in your JSON should describe how ${preset.name} manifests in this story.`
}

export function buildAspectRatioPromptBlock(aspectRatio?: string | null): string {
  const ratio = isBlueprintAspectRatio(aspectRatio) ? aspectRatio : DEFAULT_ASPECT_RATIO
  const framingByRatio: Record<BlueprintAspectRatio, string> = {
    '16:9':
      'Widescreen cinematic framing: wide establishing shots, lateral tracking, ensemble blocking, landscape compositions.',
    '9:16':
      'Vertical mobile framing: tight close-ups, vertical pans, centered subjects, thumb-stopping hooks in first 3 seconds, stacked character blocking.',
    '1:1':
      'Square framing: balanced centered compositions, symmetrical blocking, portrait-friendly character focus.',
    '4:3':
      'Classic 4:3 framing: intimate medium shots, presentation-friendly staging, archival/documentary feel.',
  }
  return `
LOCKED ASPECT RATIO — ${ratio}:
- ${framingByRatio[ratio]}
- Beat synopses and scene directions must assume ${ratio} delivery — not generic framing.
- Pacing and shot language should match how audiences watch ${ratio} content.`
}

export function buildFoundationPromptBlock(artStyleId?: string | null, aspectRatio?: string | null): string {
  return `${buildArtStylePromptBlock(artStyleId)}\n${buildAspectRatioPromptBlock(aspectRatio)}`
}

/** Map blueprint aspect ratio to image generation API values. */
export function blueprintAspectRatioToImageApi(ratio?: string | null): string {
  if (isBlueprintAspectRatio(ratio)) return ratio
  return DEFAULT_ASPECT_RATIO
}
