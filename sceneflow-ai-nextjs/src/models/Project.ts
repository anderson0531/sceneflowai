import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface ProjectAttributes {
  id: string
  user_id: string
  series_id?: string | null  // Optional: links project to a series as an episode
  episode_number?: number | null  // Episode number within the series
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
  public series_id?: string | null
  public episode_number?: number | null
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

  // Helper methods
  public isEpisode(): boolean {
    return !!this.series_id
  }
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
    series_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'series',
        key: 'id',
      },
      comment: 'Links project to a series as an episode (null for standalone projects)',
    },
    episode_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Episode number within the series',
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
        fields: ['series_id'],
        name: 'idx_series_id',
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
