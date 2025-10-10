import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabScoreAttributes {
  id: string
  session_id: string
  participant_id: string
  variant_id: string
  score: number
  created_at: Date
  updated_at: Date
}

export interface CollabScoreCreationAttributes extends Optional<CollabScoreAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class CollabScore extends Model<CollabScoreAttributes, CollabScoreCreationAttributes> implements CollabScoreAttributes {
  public id!: string
  public session_id!: string
  public participant_id!: string
  public variant_id!: string
  public score!: number
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabScore.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_sessions', key: 'id' } },
    participant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_participants', key: 'id' } },
    variant_id: { type: DataTypes.STRING(32), allowNull: false },
    score: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'collab_scores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_collab_score_session_variant_participant', unique: true, fields: ['session_id', 'variant_id', 'participant_id'] },
    ],
  }
)

export default CollabScore


