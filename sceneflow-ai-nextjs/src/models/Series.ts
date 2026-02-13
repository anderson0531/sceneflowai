import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

/**
 * Series Model
 * 
 * Represents a multi-episode video series with shared production bible,
 * characters, locations, and visual consistency settings.
 * 
 * Design Decisions:
 * - Episode limit: Soft cap at 20 (DEFAULT_MAX_EPISODES), allows up to 30 with user confirmation
 * - Bible sync: Explicit "Save to Series Bible" action with diff preview (not auto-sync)
 * - Migration: Supports both "Create Series" and "Convert Project to Series" flows
 */

export const DEFAULT_MAX_EPISODES = 20
export const ABSOLUTE_MAX_EPISODES = 30

export type SeriesStatus = 'draft' | 'active' | 'completed' | 'archived'

/**
 * Story Thread for tracking narrative continuity across episodes
 */
export interface StoryThread {
  id: string
  name: string
  type: 'main' | 'subplot' | 'character' | 'mystery' | 'romance'
  status: 'introduced' | 'developing' | 'climax' | 'resolved'
  description?: string
}

export interface SeriesEpisodeBlueprint {
  id: string
  episodeNumber: number
  title: string
  logline: string
  synopsis: string
  beats: SeriesEpisodeBeat[]
  characters: SeriesEpisodeCharacter[]
  /** Story threads/arcs active in this episode for continuity tracking */
  storyThreads?: StoryThread[]
  /** Key plot developments that affect future episodes */
  plotDevelopments?: string[]
  /** Cliffhanger or setup for next episode */
  episodeHook?: string
  projectId?: string // Linked when episode is started
  status: 'blueprint' | 'in_progress' | 'completed'
}

export interface SeriesEpisodeBeat {
  beatNumber: number
  title: string
  description: string
  act: number
}

export interface SeriesEpisodeCharacter {
  characterId: string // Reference to series-level character
  role: 'protagonist' | 'antagonist' | 'supporting' | 'guest'
  episodeArc?: string // Character's arc in this specific episode
}

export interface SeriesCharacter {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  description: string
  appearance: string
  backstory?: string
  personality?: string
  voiceId?: string // ElevenLabs voice ID for consistency
  referenceImageUrl?: string // GCS-stored reference image
  lockedPromptTokens?: string[] // Visual DNA tokens for image generation
  createdAt: string
  updatedAt: string
}

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

export interface SeriesProductionBible {
  version: string
  lastUpdated: string
  lastUpdatedBy?: string
  
  // Story Foundation
  logline: string
  synopsis: string
  setting: string
  timeframe?: string
  
  // Core Characters
  protagonist: {
    characterId: string
    name: string
    goal: string
    flaw?: string
  }
  antagonistConflict: {
    type: 'character' | 'nature' | 'society' | 'self' | 'technology'
    description: string
    characterId?: string // If type is 'character'
  }
  
  // Visual Consistency
  aesthetic: SeriesAesthetic
  
  // Shared Assets
  characters: SeriesCharacter[]
  locations: SeriesLocation[]
  
  // Production Guidelines
  toneGuidelines?: string
  visualGuidelines?: string
  audioGuidelines?: string
  
  // Continuity Rules
  consistencyRules?: string[]
  worldBuildingNotes?: string[]
}

export interface SeriesAttributes {
  id: string
  user_id: string
  title: string
  logline?: string
  genre?: string
  target_audience?: string
  status: SeriesStatus
  max_episodes: number
  production_bible: SeriesProductionBible
  episode_blueprints: SeriesEpisodeBlueprint[]
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface SeriesCreationAttributes extends Optional<
  SeriesAttributes,
  'id' | 'created_at' | 'updated_at' | 'status' | 'max_episodes' | 'metadata' | 'episode_blueprints'
> {}

export class Series extends Model<SeriesAttributes, SeriesCreationAttributes> implements SeriesAttributes {
  public id!: string
  public user_id!: string
  public title!: string
  public logline?: string
  public genre?: string
  public target_audience?: string
  public status!: SeriesStatus
  public max_episodes!: number
  public production_bible!: SeriesProductionBible
  public episode_blueprints!: SeriesEpisodeBlueprint[]
  public metadata!: Record<string, any>
  public created_at!: Date
  public updated_at!: Date

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Helper methods
  public getEpisodeCount(): number {
    return this.episode_blueprints?.length || 0
  }

  public getStartedEpisodeCount(): number {
    return this.episode_blueprints?.filter(ep => ep.projectId).length || 0
  }

  public getCompletedEpisodeCount(): number {
    return this.episode_blueprints?.filter(ep => ep.status === 'completed').length || 0
  }

  public canAddEpisode(): boolean {
    return this.getEpisodeCount() < this.max_episodes
  }

  public getNextEpisodeNumber(): number {
    if (!this.episode_blueprints?.length) return 1
    return Math.max(...this.episode_blueprints.map(ep => ep.episodeNumber)) + 1
  }
}

Series.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    logline: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    target_audience: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    max_episodes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: DEFAULT_MAX_EPISODES,
      validate: {
        min: 1,
        max: ABSOLUTE_MAX_EPISODES,
      },
      comment: 'Maximum number of episodes (default 20, max 30)',
    },
    production_bible: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        logline: '',
        synopsis: '',
        setting: '',
        protagonist: { characterId: '', name: '', goal: '' },
        antagonistConflict: { type: 'character', description: '' },
        aesthetic: {},
        characters: [],
        locations: [],
      },
      comment: 'Shared production bible with characters, locations, and visual settings',
    },
    episode_blueprints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of episode blueprints with beats and characters',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Additional series metadata (AI generation history, etc.)',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'series',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_series_user_id',
      },
      {
        fields: ['status'],
        name: 'idx_series_status',
      },
      {
        fields: ['created_at'],
        name: 'idx_series_created_at',
      },
    ],
  }
)

export default Series
