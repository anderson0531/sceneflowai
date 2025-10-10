import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CollabRecommendationAttributes {
  id: string
  session_id: string
  participant_id: string
  variant_id: string
  title: string
  details: string
  status: 'proposed' | 'accepted' | 'rejected'
  created_at: Date
  updated_at: Date
}

export interface CollabRecommendationCreationAttributes extends Optional<CollabRecommendationAttributes, 'id' | 'status' | 'created_at' | 'updated_at'> {}

export class CollabRecommendation extends Model<CollabRecommendationAttributes, CollabRecommendationCreationAttributes> implements CollabRecommendationAttributes {
  public id!: string
  public session_id!: string
  public participant_id!: string
  public variant_id!: string
  public title!: string
  public details!: string
  public status!: 'proposed' | 'accepted' | 'rejected'
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CollabRecommendation.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_sessions', key: 'id' } },
    participant_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'collab_participants', key: 'id' } },
    variant_id: { type: DataTypes.STRING(32), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('proposed', 'accepted', 'rejected'), allowNull: false, defaultValue: 'proposed' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'collab_recommendations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_collab_recommendation_session_variant', fields: ['session_id', 'variant_id'] },
    ],
  }
)

export default CollabRecommendation


