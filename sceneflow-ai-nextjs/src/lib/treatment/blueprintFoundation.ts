import { artStylePresets } from '@/constants/artStylePresets'
import {
  type ArtStyleSpec,
  buildArtStyleSpecFromValue,
  findArtStylePreset,
  isArtStyleSpecLike,
  normalizeArtStyleSpec,
  serializeArtStyleValue,
} from '@/lib/artStyle/globalArtStyle'

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
  const byName = artStylePresets.find((p) => p.name.toLowerCase() === key)
  if (byName) return byName.id
  return LEGACY_VISUAL_STYLE_MAP[key]
}

export function isBlueprintAspectRatio(value: unknown): value is BlueprintAspectRatio {
  return typeof value === 'string' && BLUEPRINT_ASPECT_RATIOS.includes(value as BlueprintAspectRatio)
}

export function resolveVariantArtStyleSpec(
  variant: Record<string, unknown> | null | undefined
): ArtStyleSpec {
  if (!variant) return buildArtStyleSpecFromValue(DEFAULT_ART_STYLE)
  const rawSpec = isArtStyleSpecLike(variant.artStyleSpec) ? variant.artStyleSpec : undefined
  const direct = typeof variant.artStyle === 'string' ? variant.artStyle.trim() : ''
  if (rawSpec) {
    return normalizeArtStyleSpec(rawSpec, direct || undefined)
  }
  if (direct) {
    const mapped = mapLegacyVisualStyle(direct)
    return buildArtStyleSpecFromValue(mapped ?? direct)
  }
  const visualStyle = typeof variant.visual_style === 'string' ? variant.visual_style.trim() : ''
  if (visualStyle) {
    const legacy = mapLegacyVisualStyle(visualStyle)
    return buildArtStyleSpecFromValue(legacy ?? visualStyle)
  }
  return buildArtStyleSpecFromValue(DEFAULT_ART_STYLE)
}

export function resolveVariantArtStyle(variant: Record<string, unknown> | null | undefined): string {
  if (!variant) return DEFAULT_ART_STYLE
  const spec = resolveVariantArtStyleSpec(variant)
  return serializeArtStyleValue(spec)
}

export function resolveVariantAspectRatio(
  variant: Record<string, unknown> | null | undefined
): BlueprintAspectRatio {
  if (!variant) return DEFAULT_ASPECT_RATIO
  if (isBlueprintAspectRatio(variant.aspectRatio)) return variant.aspectRatio
  return DEFAULT_ASPECT_RATIO
}

export function getArtStylePresetName(artStyleId: string): string {
  const trimmed = artStyleId?.trim() || ''
  if (!trimmed) return artStylePresets[0]?.name ?? DEFAULT_ART_STYLE
  const preset = findArtStylePreset(trimmed)
  if (preset) return preset.name
  const spec = buildArtStyleSpecFromValue(trimmed)
  return spec.title || trimmed
}

/**
 * Normalize foundation fields on read.
 * Preserves custom/AI-directed ArtStyleSpec and rich `visual_style` prose while ensuring
 * `artStyle` and `aspectRatio` are always populated.
 */
export function normalizeVariantFoundation<T extends Record<string, unknown>>(variant: T): T {
  const spec = resolveVariantArtStyleSpec(variant)
  const artStyle = serializeArtStyleValue(spec)
  const aspectRatio = resolveVariantAspectRatio(variant)
  const existingVisualStyle =
    typeof variant.visual_style === 'string' ? variant.visual_style.trim() : ''
  const existingMatchesSomePresetName = artStylePresets.some(
    (p) => p.name.toLowerCase() === existingVisualStyle.toLowerCase()
  )
  const visualStyle =
    existingVisualStyle && !existingMatchesSomePresetName
      ? existingVisualStyle
      : spec.presetId && spec.presetId !== 'custom'
        ? getArtStylePresetName(artStyle)
        : spec.stylePrompt || spec.title

  return {
    ...variant,
    artStyle,
    artStyleSpec: isArtStyleSpecLike(variant.artStyleSpec) ? spec : variant.artStyleSpec ?? (spec.presetId === 'custom' ? spec : undefined),
    aspectRatio,
    visual_style: visualStyle,
  }
}

export function buildArtStylePromptBlock(
  artStyleId?: string | null,
  artStyleSpec?: Partial<ArtStyleSpec> | null
): string {
  const spec = buildArtStyleSpecFromValue(artStyleId || DEFAULT_ART_STYLE, artStyleSpec)
  const mediumLine = `- Rendering medium: ${spec.medium} (${spec.stylePrompt})`
  const paletteLine = spec.paletteAndLighting
    ? `\n- Palette & lighting grammar: ${spec.paletteAndLighting}`
    : ''
  const guardrails =
    spec.negativeTerms.length > 0
      ? `\n- Strictly avoid style drift into: ${spec.negativeTerms.join(', ')}.`
      : ''
  return `
LOCKED ART STYLE — ${spec.title}:
${mediumLine}${paletteLine}
- Character reference rule: ${spec.characterRefDirective}
- Location & prop rule: ${spec.locationRefDirective}
- Weave this aesthetic into dialogue voice, atmospheric descriptions, wardrobe/set design, pacing, and beat intent.
- Character descriptions and scene atmosphere must feel native to ${spec.title}, not generic prose.
- The "visual_style" field in your JSON should describe how ${spec.title} manifests specifically in this story.${guardrails}`
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
