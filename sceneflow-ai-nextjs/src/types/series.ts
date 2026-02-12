/**
 * Series Types for Client-Side Usage
 * 
 * This file provides TypeScript interfaces for the Series feature,
 * designed to work with the API responses and UI components.
 * 
 * IMPORTANT: This file must NOT import from server-side modules (models, database, etc.)
 * to ensure it can be used in client-side code without bundling Node.js dependencies.
 */

// Episode limits - soft limit allows flexibility, hard limit enforces UI constraints
export const DEFAULT_MAX_EPISODES = 20
export const ABSOLUTE_MAX_EPISODES = 30

// Series status type
export type SeriesStatus = 'draft' | 'active' | 'completed' | 'archived'

/**
 * Series Episode Beat
 */
export interface SeriesEpisodeBeat {
  beatNumber: number
  title: string
  description: string
  act: number  // 1, 2, or 3
}

/**
 * Series Episode Character Reference
 */
export interface SeriesEpisodeCharacter {
  characterId: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'guest'
  episodeArc?: string
}

/**
 * Series Episode Blueprint
 */
export interface SeriesEpisodeBlueprint {
  id: string
  episodeNumber: number
  title: string
  logline: string
  synopsis: string
  beats: SeriesEpisodeBeat[]
  characters: SeriesEpisodeCharacter[]
  projectId?: string
  status: 'blueprint' | 'in_progress' | 'completed'
}

/**
 * Series Character
 */
export interface SeriesCharacter {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  description: string
  appearance: string
  backstory?: string
  personality?: string
  voiceId?: string
  referenceImageUrl?: string
  lockedPromptTokens?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Series Location
 */
export interface SeriesLocation {
  id: string
  name: string
  description: string
  visualDescription?: string
  referenceImageUrl?: string
  lockedPromptTokens?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Series Aesthetic Settings
 */
export interface SeriesAesthetic {
  cinematography?: string
  colorPalette?: Record<string, string[]>
  aspectRatio?: string
  visualStyle?: string
  lightingStyle?: string
  lockedPromptTokens?: {
    global?: string[]
    characters?: Record<string, string[]>
    locations?: Record<string, string[]>
  }
}

/**
 * Series Production Bible
 */
export interface SeriesProductionBible {
  version: string
  lastUpdated: string
  lastUpdatedBy?: string
  logline: string
  synopsis: string
  setting: string
  timeframe?: string
  protagonist: {
    characterId: string
    name: string
    goal: string
    flaw?: string
  }
  antagonistConflict: {
    type: 'character' | 'nature' | 'society' | 'self' | 'technology'
    description: string
    characterId?: string
  }
  aesthetic: SeriesAesthetic
  characters: SeriesCharacter[]
  locations: SeriesLocation[]
  toneGuidelines?: string
  visualGuidelines?: string
  audioGuidelines?: string
  consistencyRules?: string[]
  worldBuildingNotes?: string[]
}

/**
 * Series API Response shape
 */
export interface SeriesResponse {
  id: string
  userId: string
  title: string
  logline?: string
  genre?: string
  targetAudience?: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  maxEpisodes: number
  episodeCount: number
  startedCount: number
  completedCount: number
  productionBible: SeriesProductionBible
  episodeBlueprints: SeriesEpisodeBlueprint[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Type aliases for API responses (same structure, different naming convention)
export type SeriesProductionBibleResponse = SeriesProductionBible
export type SeriesCharacterResponse = SeriesCharacter
export type SeriesLocationResponse = SeriesLocation
export type EpisodeBlueprintResponse = SeriesEpisodeBlueprint

/**
 * Extended episode blueprint with linked project data (returned when includeEpisodes=true)
 */
export interface EpisodeBlueprintWithProject extends SeriesEpisodeBlueprint {
  project?: {
    id: string
    title: string
    status: string
    currentStep: string
    stepProgress: Record<string, number>
    updatedAt: string
  }
}

/**
 * Series Creation Request
 */
export interface CreateSeriesRequest {
  userId: string
  title: string
  logline?: string
  genre?: string
  targetAudience?: string
  maxEpisodes?: number
  productionBible?: Partial<SeriesProductionBibleResponse>
  episodeBlueprints?: Partial<EpisodeBlueprintResponse>[]
}

/**
 * Series Update Request
 */
export interface UpdateSeriesRequest {
  title?: string
  logline?: string
  genre?: string
  targetAudience?: string
  status?: 'draft' | 'active' | 'completed' | 'archived'
  maxEpisodes?: number
  productionBible?: Partial<SeriesProductionBibleResponse>
  episodeBlueprints?: EpisodeBlueprintResponse[]
  metadata?: Record<string, any>
}

/**
 * Series Generation Request
 */
export interface GenerateSeriesRequest {
  topic: string
  episodeCount?: number
  regenerateField?: 'title' | 'logline' | 'synopsis' | 'protagonist' | 'antagonist' | 'setting' | 'episodes' | 'characters'
  preserveExisting?: boolean
  genre?: string
  tone?: string
}

/**
 * Bible Sync Request
 */
export interface BibleSyncRequest {
  projectId: string
  syncFields: Array<'characters' | 'locations' | 'aesthetic' | 'all'>
  preview?: boolean
  mergeStrategy?: 'replace' | 'merge' | 'add_new_only'
}

/**
 * Bible Sync Diff Response
 */
export interface BibleSyncDiff {
  characters: {
    added: SeriesCharacterResponse[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  locations: {
    added: SeriesLocationResponse[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  aesthetic: {
    before: any
    after: any
  }
}

/**
 * Episode Start Response
 */
export interface StartEpisodeResponse {
  success: boolean
  project: {
    id: string
    title: string
    seriesId: string
    episodeNumber: number
    status: string
    currentStep: string
  }
  episode: {
    id: string
    episodeNumber: number
    title: string
    status: 'in_progress'
  }
}

/**
 * UI State for Series Studio
 */
export interface SeriesStudioState {
  series: SeriesResponse | null
  isLoading: boolean
  isGenerating: boolean
  selectedEpisodeId: string | null
  editMode: 'view' | 'edit' | 'generate'
  unsavedChanges: boolean
  bibleSyncStatus: {
    lastSynced?: string
    hasChanges: boolean
    pendingDiff?: BibleSyncDiff
  }
}

/**
 * Series Card Props for dashboard display
 */
export interface SeriesCardProps {
  series: SeriesResponse
  onOpen?: (seriesId: string) => void
  onStartEpisode?: (seriesId: string, episodeId: string) => void
  onDelete?: (seriesId: string) => void
  showEpisodeList?: boolean
}

/**
 * Episode Card Props
 */
export interface EpisodeCardProps {
  episode: EpisodeBlueprintResponse
  seriesId: string
  seriesTitle: string
  onStart?: () => void
  onEdit?: () => void
  onView?: () => void
  isStarting?: boolean
}

/**
 * Production Bible Panel Props
 */
export interface ProductionBiblePanelProps {
  bible: SeriesProductionBibleResponse
  seriesId: string
  currentProjectId?: string
  onSaveToBible?: (request: BibleSyncRequest) => Promise<void>
  onPullFromBible?: () => Promise<void>
  readOnly?: boolean
}
