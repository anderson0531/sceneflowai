import type { FinalCutSelection, FinalCutSceneOverride } from '@/lib/types/finalCut'
import { resolveSceneStreamUrl } from '@/lib/final-cut/resolveSegmentMedia'

function screeningOverrideForLanguage(
  sceneId: string,
  language: string,
  finalCut?: FinalCutSelection | null
): Record<string, FinalCutSceneOverride> | undefined {
  const raw = finalCut?.perSceneOverrides?.[sceneId]
  if (!raw || raw.streamType !== 'video') return undefined
  if (raw.language && raw.language !== language) return undefined
  return { [sceneId]: raw }
}

/**
 * Resolve the video stream URL for Screening Room preview playback.
 * Honors metadata.finalCut per-scene version pins; falls back to latest complete video.
 */
export function resolveScreeningVideoStreamUrl(
  sceneId: string,
  sceneProductionState: Record<string, unknown>,
  language: string,
  finalCut?: FinalCutSelection | null
): string | null {
  const selection = {
    format: 'full-video' as const,
    language,
    perSceneOverrides: screeningOverrideForLanguage(sceneId, language, finalCut),
  }
  return resolveSceneStreamUrl(sceneProductionState, sceneId, selection).url
}
