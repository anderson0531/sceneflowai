import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type IntegrationProvider = 'youtube'

export interface UserIntegrationAttributes {
  id: string
  user_id: string
  provider: IntegrationProvider
  encrypted_credentials: string
  is_valid: boolean
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export interface UserIntegrationCreationAttributes
  extends Optional<
    UserIntegrationAttributes,
    'id' | 'created_at' | 'updated_at' | 'is_valid' | 'metadata'
  > {}

export class UserIntegration
  extends Model<UserIntegrationAttributes, UserIntegrationCreationAttributes>
  implements UserIntegrationAttributes
{
  declare id: string
  declare user_id: string
  declare provider: IntegrationProvider
  declare encrypted_credentials: string
  declare is_valid: boolean
  declare metadata: Record<string, unknown> | null
  declare created_at: Date
  declare updated_at: Date
}

UserIntegration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    provider: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    encrypted_credentials: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_valid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    metadata: {
      type: DataTypes.JSONB,
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
    tableName: 'user_integrations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['user_id', 'provider'] }],
  }
)

export default UserIntegration
