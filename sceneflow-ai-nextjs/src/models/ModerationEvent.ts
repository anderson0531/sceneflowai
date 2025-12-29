/**
 * ModerationEvent Model
 * 
 * Logs content moderation decisions for TTS scripts and other AI-generated content.
 * Used for compliance auditing and abuse detection.
 * 
 * Moderation is stricter for cloned voices than for stock voices.
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ContentType = 'tts_script' | 'clone_request' | 'image_prompt' | 'video_prompt'
export type ModerationAction = 'allowed' | 'blocked' | 'warning'
export type VoiceType = 'stock' | 'cloned' | 'designed'

export interface ModerationEventAttributes {
  id: string
  user_id: string
  
  // Content details
  content_type: ContentType
  content_hash: string            // SHA256 hash of content for deduplication
  content_preview?: string | null // First 500 chars for review (optional, can be redacted)
  
  // Moderation result
  action: ModerationAction
  flagged_categories: string[]    // e.g., ['hate', 'violence', 'fraud']
  category_scores?: Record<string, number> | null  // OpenAI moderation scores
  
  // Context
  voice_type?: VoiceType | null   // For TTS-related moderation
  voice_id?: string | null        // ElevenLabs voice ID if applicable
  project_id?: string | null      // Associated project
  
  // Thresholds used
  threshold_applied: number       // The threshold that was used (0.3 for cloned, 0.7 for stock)
  
  // Timestamps
  created_at: Date
}

export interface ModerationEventCreationAttributes extends Optional<
  ModerationEventAttributes,
  'id' | 'content_preview' | 'category_scores' | 'voice_type' | 'voice_id' | 'project_id' | 'created_at'
> {}

export class ModerationEvent extends Model<ModerationEventAttributes, ModerationEventCreationAttributes>
  implements ModerationEventAttributes {
  public id!: string
  public user_id!: string
  
  public content_type!: ContentType
  public content_hash!: string
  public content_preview?: string | null
  
  public action!: ModerationAction
  public flagged_categories!: string[]
  public category_scores?: Record<string, number> | null
  
  public voice_type?: VoiceType | null
  public voice_id?: string | null
  public project_id?: string | null
  
  public threshold_applied!: number
  
  public created_at!: Date

  // Timestamps
  public readonly createdAt!: Date

  // Helper methods
  public wasBlocked(): boolean {
    return this.action === 'blocked'
  }

  public getFlaggedCategoriesDisplay(): string {
    return this.flagged_categories.join(', ')
  }
}

ModerationEvent.init(
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
    content_type: {
      type: DataTypes.ENUM('tts_script', 'clone_request', 'image_prompt', 'video_prompt'),
      allowNull: false,
    },
    content_hash: {
      type: DataTypes.STRING(64), // SHA256 = 64 hex chars
      allowNull: false,
    },
    content_preview: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM('allowed', 'blocked', 'warning'),
      allowNull: false,
    },
    flagged_categories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    category_scores: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    voice_type: {
      type: DataTypes.ENUM('stock', 'cloned', 'designed'),
      allowNull: true,
    },
    voice_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    threshold_applied: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'moderation_events',
    timestamps: false, // Only created_at, no updated_at needed
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_moderation_events_user',
      },
      {
        fields: ['content_hash'],
        name: 'idx_moderation_events_hash',
      },
      {
        fields: ['action'],
        name: 'idx_moderation_events_action',
      },
      {
        fields: ['created_at'],
        name: 'idx_moderation_events_created',
      },
      {
        fields: ['content_type'],
        name: 'idx_moderation_events_type',
      },
      // For finding repeat offenders
      {
        fields: ['user_id', 'action', 'created_at'],
        name: 'idx_moderation_events_user_action',
      },
    ],
  }
)

export default ModerationEvent
