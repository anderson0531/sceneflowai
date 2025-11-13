import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface AIUsageAttributes {
  id: string
  user_id: string
  route: string
  provider: 'openai' | 'sceneflow-ai'
  model: string
  category: 'text' | 'images' | 'tts' | 'whisper' | 'video' | 'other'
  request_id: string | null
  byok: boolean
  input_tokens: number
  output_tokens: number
  image_count: number
  cogs_usd: number
  markup_multiplier: number
  charged_credits: number
  status: 'success' | 'error'
  error_code: string | null
  created_at: Date
  updated_at: Date
}

export interface AIUsageCreationAttributes extends Optional<AIUsageAttributes, 'id' | 'created_at' | 'updated_at' | 'request_id' | 'error_code'> {}

export class AIUsage extends Model<AIUsageAttributes, AIUsageCreationAttributes> implements AIUsageAttributes {
  public id!: string
  public user_id!: string
  public route!: string
  public provider!: 'openai'
  public model!: string
  public category!: 'text' | 'images' | 'tts' | 'whisper' | 'video' | 'other'
  public request_id!: string | null
  public byok!: boolean
  public input_tokens!: number
  public output_tokens!: number
  public image_count!: number
  public cogs_usd!: number
  public markup_multiplier!: number
  public charged_credits!: number
  public status!: 'success' | 'error'
  public error_code!: string | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

AIUsage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    provider: {
      type: DataTypes.ENUM('openai', 'sceneflow-ai'),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('text', 'images', 'tts', 'whisper', 'video', 'other'),
      allowNull: false,
    },
    request_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    byok: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    input_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    output_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    image_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cogs_usd: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: false,
      defaultValue: 0,
    },
    markup_multiplier: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: false,
      defaultValue: 4,
    },
    charged_credits: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('success', 'error'),
      allowNull: false,
      defaultValue: 'success',
    },
    error_code: {
      type: DataTypes.STRING(100),
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
    tableName: 'ai_usage',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'created_at'], name: 'idx_ai_usage_user_created' },
      { fields: ['provider', 'model'], name: 'idx_ai_usage_model' },
      { fields: ['route'], name: 'idx_ai_usage_route' },
    ],
  }
)

export default AIUsage


