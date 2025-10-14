import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

// 1. Use camelCase for TypeScript interfaces (matches frontend expectations)
export interface CollabChatMessageAttributes {
  id: string
  sessionId: string
  channel: string
  scopeId?: string
  authorRole: 'owner' | 'collaborator'
  alias: string
  text: string
  clientId?: string
  seq: number
  createdAt: Date
  updatedAt: Date
}

export interface CollabChatMessageCreationAttributes 
  extends Optional<CollabChatMessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class CollabChatMessage 
  extends Model<CollabChatMessageAttributes, CollabChatMessageCreationAttributes> 
  implements CollabChatMessageAttributes {
  
  public id!: string
  public sessionId!: string
  public channel!: string
  public scopeId?: string
  public authorRole!: 'owner' | 'collaborator'
  public alias!: string
  public text!: string
  public clientId?: string
  public seq!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabChatMessage.init(
  {
    // 2. Define attributes in camelCase
    id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    sessionId: { 
      type: DataTypes.UUID, 
      allowNull: false, 
      references: { model: 'collab_sessions', key: 'id' } 
    },
    channel: { 
      type: DataTypes.STRING(50), 
      allowNull: false, 
      defaultValue: 'general' 
    },
    scopeId: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    authorRole: { 
      type: DataTypes.ENUM('owner', 'collaborator'), 
      allowNull: false, 
      defaultValue: 'collaborator' 
    },
    alias: { 
      type: DataTypes.STRING(255), 
      allowNull: false 
    },
    text: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    clientId: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    seq: { 
      type: DataTypes.BIGINT, 
      allowNull: false, 
      defaultValue: () => Date.now() 
    },
    createdAt: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
    updatedAt: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
  },
  {
    sequelize,
    tableName: 'collab_chat_messages',
    timestamps: true,
    // 3. CRUCIAL: Automatically map camelCase to snake_case
    underscored: true,
    // Indexes use database column names (snake_case)
    indexes: [
      { name: 'idx_collab_chat_session', fields: ['session_id'] },
      { name: 'idx_collab_chat_session_channel', fields: ['session_id', 'channel'] },
      { name: 'idx_collab_chat_seq', fields: ['seq'] },
    ],
  }
)

export default CollabChatMessage


