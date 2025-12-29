import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface SubscriptionTierAttributes {
  id: string
  name: 'coffee_break' | 'starter' | 'pro' | 'studio' | 'enterprise'
  display_name: string
  monthly_price_usd: number
  annual_price_usd: number
  included_credits_monthly: number
  storage_gb: number
  max_resolution: '720p' | '1080p' | '4K' | '4K+'
  ai_model_access: 'standard' | 'premium' | 'premium_beta' | 'custom'
  byok_access: boolean
  processing_priority: 'standard' | 'priority' | 'high' | 'dedicated'
  collaboration_seats: number
  is_active: boolean
  is_one_time: boolean
  max_projects: number | null
  max_scenes_per_project: number | null
  features: string[] // JSON array
  created_at: Date
  updated_at: Date
}

export interface SubscriptionTierCreationAttributes extends Optional<SubscriptionTierAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active'> {}

export class SubscriptionTier extends Model<SubscriptionTierAttributes, SubscriptionTierCreationAttributes> implements SubscriptionTierAttributes {             
  public id!: string
  public name!: 'coffee_break' | 'starter' | 'pro' | 'studio' | 'enterprise'
  public display_name!: string
  public monthly_price_usd!: number
  public annual_price_usd!: number
  public included_credits_monthly!: number
  public storage_gb!: number
  public max_resolution!: '720p' | '1080p' | '4K' | '4K+'
  public ai_model_access!: 'standard' | 'premium' | 'premium_beta' | 'custom'
  public byok_access!: boolean
  public processing_priority!: 'standard' | 'priority' | 'high' | 'dedicated'
  public collaboration_seats!: number
  public is_active!: boolean
  public is_one_time!: boolean
  public max_projects!: number | null
  public max_scenes_per_project!: number | null
  public features!: string[]
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Helper methods
  public hasFeature(feature: string): boolean {
    return this.features?.includes(feature) ?? false
  }

  public hasVoiceCloning(): boolean {
    // Check features array first
    if (this.hasFeature('voice_cloning')) return true
    // Fallback: Pro, Studio, Enterprise tiers always have voice cloning
    return ['pro', 'studio', 'enterprise'].includes(this.name)
  }

  /**
   * Get the maximum number of voice clone slots for this tier
   */
  public getVoiceCloneSlots(): number {
    const slotsByTier: Record<string, number> = {
      coffee_break: 0,
      starter: 0,
      pro: 3,
      studio: 10,
      enterprise: 999,
    }
    return slotsByTier[this.name] ?? 0
  }
}

SubscriptionTier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.ENUM('coffee_break', 'starter', 'pro', 'studio', 'enterprise'),
      allowNull: false,
      unique: true,
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    monthly_price_usd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    annual_price_usd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    included_credits_monthly: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    storage_gb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    max_resolution: {
      type: DataTypes.ENUM('720p', '1080p', '4K', '4K+'),
      allowNull: false,
      defaultValue: '1080p',
    },
    ai_model_access: {
      type: DataTypes.ENUM('standard', 'premium', 'premium_beta', 'custom'),
      allowNull: false,
      defaultValue: 'standard',
    },
    byok_access: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    processing_priority: {
      type: DataTypes.ENUM('standard', 'priority', 'high', 'dedicated'),
      allowNull: false,
      defaultValue: 'standard',
    },
    collaboration_seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_one_time: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    max_projects: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    max_scenes_per_project: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    features: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
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
    tableName: 'subscription_tiers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'unique_tier_name',
      },
      {
        fields: ['is_active'],
        name: 'idx_tier_active',
      },
    ],
  }
)

export default SubscriptionTier
