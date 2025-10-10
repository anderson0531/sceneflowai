import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabSessionAttributes {
  id: string
  project_id: string
  owner_user_id: string
  token: string
  status: 'active' | 'closed'
  expires_at: Date | null
  payload: Record<string, any> | null
  created_at: Date
  updated_at: Date
}

export interface CollabSessionCreationAttributes extends Optional<CollabSessionAttributes, 'id' | 'status' | 'expires_at' | 'payload' | 'created_at' | 'updated_at'> {}

export class CollabSession extends Model<CollabSessionAttributes, CollabSessionCreationAttributes> implements CollabSessionAttributes {
  public id!: string
  public project_id!: string
  public owner_user_id!: string
  public token!: string
  public status!: 'active' | 'closed'
  public expires_at!: Date | null
  public payload!: Record<string, any> | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
    },
    owner_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      allowNull: false,
      defaultValue: 'active',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Snapshot of variants and metadata to display in share view',
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
    tableName: 'collab_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_collab_session_token', unique: true, fields: ['token'] },
      { name: 'idx_collab_session_project', fields: ['project_id'] },
      { name: 'idx_collab_session_owner', fields: ['owner_user_id'] },
    ],
  }
)

export default CollabSession


