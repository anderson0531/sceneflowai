import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { AIProvider } from '../services/ai-providers/BaseAIProviderAdapter'

export interface UserProviderConfigAttributes {
  id: string
  user_id: string
  provider_name: AIProvider
  encrypted_credentials: string
  is_valid: boolean
  created_at: Date
  updated_at: Date
}

export interface UserProviderConfigCreationAttributes extends Optional<UserProviderConfigAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class UserProviderConfig extends Model<UserProviderConfigAttributes, UserProviderConfigCreationAttributes> implements UserProviderConfigAttributes {
  public id!: string
  public user_id!: string
  public provider_name!: AIProvider
  public encrypted_credentials!: string
  public is_valid!: boolean
  public created_at!: Date
  public updated_at!: Date

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

UserProviderConfig.init(
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
    provider_name: {
      type: DataTypes.ENUM(...Object.values(AIProvider)),
      allowNull: false,
    },
    encrypted_credentials: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'AES-256-GCM encrypted credentials (JSON service account keys, API tokens, etc.)',
    },
    is_valid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'user_provider_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'provider_name'],
        name: 'unique_user_provider',
      },
      {
        fields: ['provider_name'],
        name: 'idx_provider_name',
      },
      {
        fields: ['is_valid'],
        name: 'idx_is_valid',
      },
    ],
  }
)

export default UserProviderConfig
