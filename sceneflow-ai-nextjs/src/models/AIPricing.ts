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
  public id!: string
  public provider!: 'openai'
  public category!: 'text' | 'images' | 'tts' | 'whisper' | 'other'
  public model!: string
  public variant!: string
  public metric!: 'per_million_tokens' | 'per_image' | 'per_minute' | 'per_unit'
  public unit_per!: number
  public price_usd!: number
  public is_active!: boolean
  public active_from!: Date | null
  public active_to!: Date | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
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


