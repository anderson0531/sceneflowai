/**
 * VoiceConsent Model
 * 
 * Tracks consent verification for voice cloning.
 * Stores the consent phrase, verification recordings, and Azure Speaker Recognition results.
 * Required before any voice clone can be created.
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ConsentType = 'self_attestation' | 'voice_verified'
export type ConsentStatus = 'pending' | 'verified' | 'failed' | 'expired'

export interface VoiceConsentAttributes {
  id: string
  user_id: string
  voice_clone_id?: string | null  // Set after clone is created
  
  // Consent details
  consent_type: ConsentType
  consent_status: ConsentStatus
  actor_name: string              // Name of the voice being cloned
  consent_phrase: string          // The randomized consent text
  verification_code: string       // e.g., "ALPHA-7924"
  
  // Audio storage (GCS paths or URLs)
  sample_audio_urls: string[]     // Uploaded voice samples
  consent_audio_url?: string | null // Live consent recording
  
  // Azure Speaker Recognition
  azure_profile_id?: string | null
  match_score?: number | null     // 0.0 - 1.0, null for self_attestation
  
  // Verification metadata
  verified_at?: Date | null
  ip_address?: string | null
  user_agent?: string | null
  
  // Timestamps
  created_at: Date
  updated_at: Date
  expires_at?: Date | null        // Consent phrase expiry (e.g., 1 hour for pending)
}

export interface VoiceConsentCreationAttributes extends Optional<
  VoiceConsentAttributes,
  'id' | 'voice_clone_id' | 'consent_audio_url' | 'azure_profile_id' | 
  'match_score' | 'verified_at' | 'ip_address' | 'user_agent' |
  'created_at' | 'updated_at' | 'expires_at'
> {}

export class VoiceConsent extends Model<VoiceConsentAttributes, VoiceConsentCreationAttributes>
  implements VoiceConsentAttributes {
  public id!: string
  public user_id!: string
  public voice_clone_id?: string | null
  
  public consent_type!: ConsentType
  public consent_status!: ConsentStatus
  public actor_name!: string
  public consent_phrase!: string
  public verification_code!: string
  
  public sample_audio_urls!: string[]
  public consent_audio_url?: string | null
  
  public azure_profile_id?: string | null
  public match_score?: number | null
  
  public verified_at?: Date | null
  public ip_address?: string | null
  public user_agent?: string | null
  
  public created_at!: Date
  public updated_at!: Date
  public expires_at?: Date | null

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Helper methods
  public isVerified(): boolean {
    return this.consent_status === 'verified'
  }

  public isPending(): boolean {
    return this.consent_status === 'pending'
  }

  public isExpired(): boolean {
    if (!this.expires_at) return false
    return new Date() > this.expires_at
  }
}

VoiceConsent.init(
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
    voice_clone_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'user_voice_clones',
        key: 'id',
      },
    },
    consent_type: {
      type: DataTypes.ENUM('self_attestation', 'voice_verified'),
      allowNull: false,
    },
    consent_status: {
      type: DataTypes.ENUM('pending', 'verified', 'failed', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
    },
    actor_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    consent_phrase: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    verification_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    sample_audio_urls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    consent_audio_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    azure_profile_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    match_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45), // IPv6 max length
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
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
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'voice_consents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_voice_consents_user',
      },
      {
        fields: ['consent_status'],
        name: 'idx_voice_consents_status',
      },
      {
        fields: ['voice_clone_id'],
        name: 'idx_voice_consents_clone',
      },
      {
        fields: ['verification_code'],
        name: 'idx_voice_consents_code',
      },
    ],
  }
)

export default VoiceConsent
