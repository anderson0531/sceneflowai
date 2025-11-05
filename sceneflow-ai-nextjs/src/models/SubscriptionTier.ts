import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface SubscriptionTierAttributes {
  id: string
  name: 'starter' | 'pro' | 'studio' | 'enterprise'
  display_name: string
  monthly_price_usd: number
  annual_price_usd: number
  included_credits_monthly: number
  storage_gb: number
  max_resolution: '1080p' | '4K' | '4K+'
  ai_model_access: 'standard' | 'premium' | 'premium_beta' | 'custom'
  byok_access: boolean
  processing_priority: 'standard' | 'priority' | 'high' | 'dedicated'
  collaboration_seats: number
  is_active: boolean
  features: string[] // JSON array
  created_at: Date
  updated_at: Date
}

export interface SubscriptionTierCreationAttributes extends Optional<SubscriptionTierAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active'> {}

export class SubscriptionTier extends Model<SubscriptionTierAttributes, SubscriptionTierCreationAttributes> implements SubscriptionTierAttributes {
  public id!: string
  public name!: 'starter' | 'pro' | 'studio' | 'enterprise'
  public display_name!: string
  public monthly_price_usd!: number
  public annual_price_usd!: number
  public included_credits_monthly!: number
  public storage_gb!: number
  public max_resolution!: '1080p' | '4K' | '4K+'
  public ai_model_access!: 'standard' | 'premium' | 'premium_beta' | 'custom'
  public byok_access!: boolean
  public processing_priority!: 'standard' | 'priority' | 'high' | 'dedicated'
  public collaboration_seats!: number
  public is_active!: boolean
  public features!: string[]
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

SubscriptionTier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.ENUM('starter', 'pro', 'studio', 'enterprise'),
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
      type: DataTypes.ENUM('1080p', '4K', '4K+'),
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
