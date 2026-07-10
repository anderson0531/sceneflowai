/** Screenshot URLs for 3-pillar pipeline tabs (non-translatable). */

export type PipelinePillarMediaEntry = {
  imageUrl: string
}

export const PIPELINE_PILLARS_MEDIA: Record<string, PipelinePillarMediaEntry> = {
  series: { imageUrl: '/landing/pipeline/series.png' },
  blueprint: { imageUrl: '/landing/pipeline/blueprint.png' },
  production: { imageUrl: '/landing/pipeline/production.png' },
}

export function getPipelinePillarMedia(pillarId: string): PipelinePillarMediaEntry | undefined {
  return PIPELINE_PILLARS_MEDIA[pillarId]
}
