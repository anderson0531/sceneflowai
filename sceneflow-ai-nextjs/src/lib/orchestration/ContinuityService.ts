import type { EpisodeBlueprintResponse, SeriesProductionBible } from '@/types/series'
import { analyzeContinuity } from '@/lib/series/analyzeContinuity'

export class ContinuityService {
  analyze(
    bible: SeriesProductionBible | null | undefined,
    episodes: EpisodeBlueprintResponse[]
  ) {
    return analyzeContinuity(bible, episodes)
  }

  enhanceVDP(
    aesthetic: SeriesProductionBible['aesthetic'] | undefined,
    shots: Array<{ id: string; text: string; characters?: string[]; locations?: string[] }>
  ) {
    const tokens = aesthetic?.lockedPromptTokens ?? {}
    return shots.map((s) => {
      const merged = [tokens.global ?? []].flat().filter(Boolean).join(', ')
      const vdp = merged ? `${s.text}\n\n[LOCKED TOKENS]: ${merged}` : s.text
      return { ...s, vdp }
    })
  }
}

let _continuityServiceInstance: ContinuityService | null = null

export function getContinuityService(): ContinuityService {
  if (!_continuityServiceInstance) {
    _continuityServiceInstance = new ContinuityService()
  }
  return _continuityServiceInstance
}

export const continuityService = { get: getContinuityService }
