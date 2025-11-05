import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface RateCardAttributes {
  id: string
  service_category: 'image_gen' | 'video_gen' | 'tts' | 'ai_analysis' | 'storage'
  service_name: string // e.g., "Standard Image", "Premium Image", "720p Video"
  quality_tier: 'standard' | 'premium' | 'ultra'
  credits_per_unit: number // Using SceneFlow credits
  byok_credits_per_unit: number // Platform fee when using BYOK
  unit_description: string // e.g., "per image", "per second", "per 100 chars"
  provider_cost_usd: number // Underlying cost for transparency
  is_active: boolean
  effective_from: Date
  effective_to?: Date | null
  created_at: Date
  updated_at: Date
}

export interface RateCardCreationAttributes extends Optional<RateCardAttributes, 'id' | 'created_at' | 'updated_at' | 'effective_to' | 'is_active'> {}

export class RateCard extends Model<RateCardAttributes, RateCardCreationAttributes> implements RateCardAttributes {
  public id!: string
  public service_category!: 'image_gen' | 'video_gen' | 'tts' | 'ai_analysis' | 'storage'
  public service_name!: string
  public quality_tier!: 'standard' | 'premium' | 'ultra'
  public credits_per_unit!: number
  public byok_credits_per_unit!: number
  public unit_description!: string
  public provider_cost_usd!: number
  public is_active!: boolean
  public effective_from!: Date
  public effective_to?: Date | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

RateCard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_category: {
      type: DataTypes.ENUM('image_gen', 'video_gen', 'tts', 'ai_analysis', 'storage'),
      allowNull: false,
    },
    service_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    quality_tier: {
      type: DataTypes.ENUM('standard', 'premium', 'ultra'),
      allowNull: false,
      defaultValue: 'standard',
    },
    credits_per_unit: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    byok_credits_per_unit: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    unit_description: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    provider_cost_usd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    effective_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    effective_to: {
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
    tableName: 'rate_cards',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['service_category', 'service_name', 'quality_tier'],
        name: 'unique_rate_card',
      },
      {
        fields: ['is_active'],
        name: 'idx_rate_card_active',
      },
      {
        fields: ['effective_from', 'effective_to'],
        name: 'idx_rate_card_effective',
      },
    ],
  }
)

export default RateCard
