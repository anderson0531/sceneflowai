/** Media URLs for 3-pillar pipeline tabs (non-translatable). */

const BLOB = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export type PipelinePillarMediaEntry = {
  /** Poster/thumbnail shown before the walkthrough video plays. */
  imageUrl: string
  /** Full-width walkthrough video for the pillar. */
  videoUrl?: string
}

export const PIPELINE_PILLARS_MEDIA: Record<string, PipelinePillarMediaEntry> = {
  series: { imageUrl: '/landing/pipeline/series.png', videoUrl: `${BLOB}/Series.mp4` },
  blueprint: { imageUrl: '/landing/pipeline/blueprint.png', videoUrl: `${BLOB}/BLUEPRINT.mp4` },
  production: {
    imageUrl: '/landing/pipeline/production.png',
    videoUrl: `${BLOB}/walkthrough/Production.mp4`,
  },
}

export function getPipelinePillarMedia(pillarId: string): PipelinePillarMediaEntry | undefined {
  return PIPELINE_PILLARS_MEDIA[pillarId]
}
