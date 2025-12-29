/**
 * UserVoiceClone Model
 * 
 * Tracks custom voice clones created by users.
 * Implements a slot-based system where users have a limited number of concurrent active voices.
 * 
 * Slot Limits:
 * - Pro: 3 active voices
 * - Studio: 10 active voices
 * - Enterprise: Unlimited
 * 
 * Users can delete voices to free up slots and create new ones.
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ArchivedReason = 'user_deleted' | 'subscription_expired' | 'unused_cleanup' | 'quota_exceeded'

export interface UserVoiceCloneAttributes {
  id: string
  user_id: string
  consent_id: string              // FK to VoiceConsent (required)
  
  // ElevenLabs data
  elevenlabs_voice_id: string     // Voice ID from ElevenLabs
  voice_name: string
  description?: string | null
  
  // Status
  is_active: boolean              // False when deleted/archived
  is_locked: boolean              // True when over quota (downgrade scenario)
  
  // Usage tracking
  last_used_at?: Date | null      // Last TTS generation with this voice
  use_count: number               // Total TTS generations
  
  // Archival
  archived_at?: Date | null
  archived_reason?: ArchivedReason | null
  deletion_warning_sent_at?: Date | null  // 6-month unused warning
  
  // Timestamps
  created_at: Date
  updated_at: Date
}

export interface UserVoiceCloneCreationAttributes extends Optional<
  UserVoiceCloneAttributes,
  'id' | 'description' | 'is_active' | 'is_locked' | 'last_used_at' | 'use_count' |
  'archived_at' | 'archived_reason' | 'deletion_warning_sent_at' |
  'created_at' | 'updated_at'
> {}

export class UserVoiceClone extends Model<UserVoiceCloneAttributes, UserVoiceCloneCreationAttributes>
  implements UserVoiceCloneAttributes {
  public id!: string
  public user_id!: string
  public consent_id!: string
  
  public elevenlabs_voice_id!: string
  public voice_name!: string
  public description?: string | null
  
  public is_active!: boolean
  public is_locked!: boolean
  
  public last_used_at?: Date | null
  public use_count!: number
  
  public archived_at?: Date | null
  public archived_reason?: ArchivedReason | null
  public deletion_warning_sent_at?: Date | null
  
  public created_at!: Date
  public updated_at!: Date

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Helper methods
  public isUsable(): boolean {
    return this.is_active && !this.is_locked && !this.archived_at
  }

  public isArchived(): boolean {
    return !!this.archived_at
  }

  public async recordUsage(): Promise<void> {
    this.last_used_at = new Date()
    this.use_count += 1
    // Clear any deletion warning since the voice is now active
    this.deletion_warning_sent_at = null
    await this.save()
  }
}

UserVoiceClone.init(
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
    consent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'voice_consents',
        key: 'id',
      },
    },
    elevenlabs_voice_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    voice_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    use_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    archived_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    archived_reason: {
      type: DataTypes.ENUM('user_deleted', 'subscription_expired', 'unused_cleanup', 'quota_exceeded'),
      allowNull: true,
    },
    deletion_warning_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'user_voice_clones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_user_voice_clones_user',
      },
      {
        fields: ['elevenlabs_voice_id'],
        name: 'idx_user_voice_clones_elevenlabs',
      },
      {
        fields: ['is_active'],
        name: 'idx_user_voice_clones_active',
      },
      {
        fields: ['consent_id'],
        name: 'idx_user_voice_clones_consent',
      },
      {
        fields: ['last_used_at'],
        name: 'idx_user_voice_clones_last_used',
      },
      // Composite index for slot counting
      {
        fields: ['user_id', 'is_active', 'archived_at'],
        name: 'idx_user_voice_clones_slot_count',
      },
    ],
  }
)

export default UserVoiceClone
