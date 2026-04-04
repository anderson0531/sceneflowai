import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface AIPricingAttributes {
  id: string
  provider: 'openai'
  category: 'text' | 'images' | 'tts' | 'whisper' | 'other'
  model: string
  variant: string
  metric: 'per_million_tokens' | 'per_image' | 'per_minute' | 'per_unit'
  unit_per: number
  price_usd: number
  is_active: boolean
  active_from: Date | null
  active_to: Date | null
  created_at: Date
  updated_at: Date
}

export interface AIPricingCreationAttributes extends Optional<AIPricingAttributes, 'id' | 'created_at' | 'updated_at' | 'active_from' | 'active_to'> {}

export class AIPricing extends Model<AIPricingAttributes, AIPricingCreationAttributes> implements AIPricingAttributes {
  declare id: string
  declare provider: 'openai'
  declare category: 'text' | 'images' | 'tts' | 'whisper' | 'other'
  declare model: string
  declare variant: string
  declare metric: 'per_million_tokens' | 'per_image' | 'per_minute' | 'per_unit'
  declare unit_per: number
  declare price_usd: number
  declare is_active: boolean
  declare active_from: Date | null
  declare active_to: Date | null
  declare created_at: Date
  declare updated_at: Date

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

AIPricing.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provider: {
      type: DataTypes.ENUM('openai'),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('text', 'images', 'tts', 'whisper', 'other'),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    variant: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    metric: {
      type: DataTypes.ENUM('per_million_tokens', 'per_image', 'per_minute', 'per_unit'),
      allowNull: false,
    },
    unit_per: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price_usd: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    active_from: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    active_to: {
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
    tableName: 'ai_pricing',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['provider', 'category', 'model', 'variant'], unique: true, name: 'unique_pricing_row' },
      { fields: ['is_active'], name: 'idx_ai_pricing_active' },
    ],
  }
)

export default AIPricing


