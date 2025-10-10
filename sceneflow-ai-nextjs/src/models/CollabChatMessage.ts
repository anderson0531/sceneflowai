import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabChatMessageAttributes {
  id: string
  session_id: string
  participant_id: string
  content: string
  created_at: Date
  updated_at: Date
}

export interface CollabChatMessageCreationAttributes extends Optional<CollabChatMessageAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class CollabChatMessage extends Model<CollabChatMessageAttributes, CollabChatMessageCreationAttributes> implements CollabChatMessageAttributes {
  public id!: string
  public session_id!: string
  public participant_id!: string
  public content!: string
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabChatMessage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_sessions', key: 'id' } },
    participant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_participants', key: 'id' } },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'collab_chat_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_collab_chat_session', fields: ['session_id'] },
    ],
  }
)

export default CollabChatMessage


