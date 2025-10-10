import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabChatMessageAttributes {
  id: string
  session_id: string
  channel: string
  scope_id?: string
  author_role: 'owner' | 'collaborator'
  alias: string
  text: string
  client_id?: string
  seq: number
  created_at: Date
  updated_at: Date
}

export interface CollabChatMessageCreationAttributes extends Optional<CollabChatMessageAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class CollabChatMessage extends Model<CollabChatMessageAttributes, CollabChatMessageCreationAttributes> implements CollabChatMessageAttributes {
  public id!: string
  public session_id!: string
  public channel!: string
  public scope_id?: string
  public author_role!: 'owner' | 'collaborator'
  public alias!: string
  public text!: string
  public client_id?: string
  public seq!: number
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabChatMessage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_sessions', key: 'id' } },
    channel: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'general' },
    scope_id: { type: DataTypes.STRING(255), allowNull: true },
    author_role: { type: DataTypes.ENUM('owner', 'collaborator'), allowNull: false, defaultValue: 'collaborator' },
    alias: { type: DataTypes.STRING(255), allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    client_id: { type: DataTypes.STRING(255), allowNull: true },
    seq: { type: DataTypes.BIGINT, allowNull: false, defaultValue: () => Date.now() },
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
      { name: 'idx_collab_chat_session_channel', fields: ['session_id', 'channel'] },
      { name: 'idx_collab_chat_seq', fields: ['seq'] },
    ],
  }
)

export default CollabChatMessage


