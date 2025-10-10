import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabParticipantAttributes {
  id: string
  session_id: string
  name: string
  email: string
  role: 'owner' | 'collaborator'
  joined_at: Date
  created_at: Date
  updated_at: Date
}

export interface CollabParticipantCreationAttributes extends Optional<CollabParticipantAttributes, 'id' | 'role' | 'joined_at' | 'created_at' | 'updated_at'> {}

export class CollabParticipant extends Model<CollabParticipantAttributes, CollabParticipantCreationAttributes> implements CollabParticipantAttributes {
  public id!: string
  public session_id!: string
  public name!: string
  public email!: string
  public role!: 'owner' | 'collaborator'
  public joined_at!: Date
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabParticipant.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_sessions', key: 'id' } },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('owner', 'collaborator'), allowNull: false, defaultValue: 'collaborator' },
    joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'collab_participants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_collab_participant_session', fields: ['session_id'] },
      { name: 'idx_collab_participant_email', fields: ['email'] },
    ],
  }
)

export default CollabParticipant


