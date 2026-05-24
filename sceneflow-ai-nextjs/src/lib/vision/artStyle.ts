import { artStylePresets } from '@/constants/artStylePresets'

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
  const visionPhase = (metadata as Record<string, unknown>).visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') return 'photorealistic'
  const artStyle = (visionPhase as Record<string, unknown>).artStyle
  return typeof artStyle === 'string' && artStyle.trim() ? artStyle.trim() : 'photorealistic'
}
