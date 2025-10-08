export type PhaseId = 0|1|2|3|4|5|6

export interface PhaseLock { locked: boolean; lockedAt?: string; lockedBy?: string }

export interface MasterAestheticBlueprint {
  cinematography?: string
  colorPalette?: Record<string, string[]>
  aspectRatio?: string
  visualAnchors?: Array<{ id: string; imageUrl: string; prompt?: string }>
  lockedPromptTokens?: { global?: string[]; [k: string]: any }
}

export interface CharacterProfile {
  id: string
  name: string
  backstory?: string
  personality?: string
  visualDNA?: any
  voiceDNA?: { provider: string; voiceId: string }
  tokens?: string[]
}

export interface LocationProfile {
  id: string
  name: string
  description?: string
  lore?: string
  visualDNA?: any
  tokens?: string[]
}

export interface LoreItem { id: string; title: string; content: string }

export interface Series {
  id: string
  title: string
  synopsis?: string
  aesthetic?: MasterAestheticBlueprint
  characters: CharacterProfile[]
  locations: LocationProfile[]
  lore: LoreItem[]
  createdAt: string
  updatedAt: string
}

export interface EpisodeStateDTO {
  episodeId: string
  phaseLocks: Record<PhaseId, PhaseLock>
  status: 'in-progress'|'completed'|'archived'
}

export interface EpisodeAssetsDTO {
  treatment?: { versions: any[]; selectedId?: string }
  visualScript?: {
    script: string
    shots: Array<{ id: string; text: string; keyframeUrl: string; vdp: string; durationSec?: number }>
  }
  audio?: {
    masterUrl: string
    timing: Array<{ shotId: string; startSec: number; durationSec: number }>
    voiceCasting: Record<string, { provider: string; voiceId: string }>
  }
  video?: {
    takes: Record<string, Array<{ takeId: string; url: string; provider: string }>>
    selected: Record<string, { takeId: string; url: string }>
  }
  finalCut?: { mp4Url: string; srtUrl: string; metadata: any }
}

export interface Episode {
  id: string
  seriesId: string
  title: string
  logline?: string
  episodeNo?: number
  state?: EpisodeStateDTO
  assets?: EpisodeAssetsDTO
  createdAt: string
  updatedAt: string
}
