import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type { BlueprintFeedbackSections } from '@/lib/blueprint/shareTypes'

export interface CollabBlueprintFeedbackAttributes {
  id: string
  sessionId: string
  participantId: string | null
  reviewerName: string
  reviewerEmail: string | null
  overallScore: number | null
  preferred: boolean | null
  sections: BlueprintFeedbackSections | null
  freeformNotes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CollabBlueprintFeedbackCreationAttributes
  extends Optional<
    CollabBlueprintFeedbackAttributes,
    'id' | 'participantId' | 'reviewerEmail' | 'overallScore' | 'preferred' | 'sections' | 'freeformNotes' | 'createdAt' | 'updatedAt'
  > {}

export class CollabBlueprintFeedback
  extends Model<CollabBlueprintFeedbackAttributes, CollabBlueprintFeedbackCreationAttributes>
  implements CollabBlueprintFeedbackAttributes
{
  declare id: string
  declare sessionId: string
  declare participantId: string | null
  declare reviewerName: string
  declare reviewerEmail: string | null
  declare overallScore: number | null
  declare preferred: boolean | null
  declare sections: BlueprintFeedbackSections | null
  declare freeformNotes: string | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

CollabBlueprintFeedback.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'collab_sessions', key: 'id' },
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'collab_participants', key: 'id' },
    },
    reviewerName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    reviewerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    overallScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    preferred: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    sections: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    freeformNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'collab_blueprint_feedback',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_collab_bp_feedback_session', fields: ['session_id'] },
      { name: 'idx_collab_bp_feedback_created', fields: ['created_at'] },
    ],
  }
)

export default CollabBlueprintFeedback
