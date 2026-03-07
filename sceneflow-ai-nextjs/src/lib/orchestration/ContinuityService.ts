import type { Series } from '@/types/continuity'

export class ContinuityService {
  async getSeries(seriesId: string): Promise<Series> {
    // TODO: load from DB
    return {
      id: seriesId,
      title: 'Untitled',
      characters: [],
      locations: [],
      lore: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  enhanceVDP(series: Series, shots: Array<{ id: string; text: string; characters?: string[]; locations?: string[] }>) {
    const tokens = series.aesthetic?.lockedPromptTokens ?? {}
    return shots.map(s => {
      const merged = [tokens.global ?? []].flat().filter(Boolean).join(', ')
      const vdp = `${s.text}\n\n[LOCKED TOKENS]: ${merged}`
      return { ...s, vdp }
    })
  }
}

// Lazy singleton pattern to prevent TDZ during module initialization
let _continuityServiceInstance: ContinuityService | null = null

export function getContinuityService(): ContinuityService {
  if (!_continuityServiceInstance) {
    _continuityServiceInstance = new ContinuityService()
  }
  return _continuityServiceInstance
}

// @deprecated Use getContinuityService() instead - kept for backward compatibility
export const continuityService = { get: getContinuityService }
