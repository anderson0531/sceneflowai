import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface ProjectAttributes {
  id: string
  user_id: string
  title: string
  description?: string
  genre?: string
  duration?: number
  target_audience?: string
  style?: string
  concept?: string
  key_message?: string
  tone?: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  current_step: 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'completed'
  step_progress: Record<string, number>
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'created_at' | 'updated_at' | 'status' | 'current_step' | 'step_progress'> {}

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: string
  public user_id!: string
  public title!: string
  public description?: string
  public genre?: string
  public duration?: number
  public target_audience?: string
  public style?: string
  public concept?: string
  public key_message?: string
  public tone?: string
  public status!: 'draft' | 'in_progress' | 'completed' | 'archived'
  public current_step!: 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'completed'
  public step_progress!: Record<string, number>
  public metadata!: Record<string, any>
  public created_at!: Date
  public updated_at!: Date

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Project.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds',
    },
    target_audience: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    style: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    concept: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    key_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    current_step: {
      type: DataTypes.ENUM('ideation', 'storyboard', 'scene-direction', 'video-generation', 'completed'),
      allowNull: false,
      defaultValue: 'ideation',
    },
    step_progress: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Progress percentage for each workflow step',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Additional project data (ideas, storyboard, directions, etc.)',
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
    tableName: 'projects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_user_id',
      },
      {
        fields: ['status'],
        name: 'idx_status',
      },
      {
        fields: ['current_step'],
        name: 'idx_current_step',
      },
      {
        fields: ['created_at'],
        name: 'idx_created_at',
      },
    ],
  }
)

export default Project
