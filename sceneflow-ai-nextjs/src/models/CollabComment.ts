import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabCommentAttributes {
  id: string
  session_id: string
  participant_id: string
  variant_id: string
  section: string
  path: string | null
  content: string
  created_at: Date
  updated_at: Date
}

export interface CollabCommentCreationAttributes extends Optional<CollabCommentAttributes, 'id' | 'path' | 'created_at' | 'updated_at'> {}

export class CollabComment extends Model<CollabCommentAttributes, CollabCommentCreationAttributes> implements CollabCommentAttributes {
  public id!: string
  public session_id!: string
  public participant_id!: string
  public variant_id!: string
  public section!: string
  public path!: string | null
  public content!: string
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabComment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_sessions', key: 'id' } },
    participant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_participants', key: 'id' } },
    variant_id: { type: DataTypes.STRING(32), allowNull: false },
    section: { type: DataTypes.STRING(64), allowNull: false },
    path: { type: DataTypes.STRING(128), allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'collab_comments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_collab_comment_session_variant', fields: ['session_id', 'variant_id'] },
    ],
  }
)

export default CollabComment


