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
  declare id: string
  declare user_id: string
  declare series_id: string | null | undefined
  declare episode_number: number | null | undefined
  declare title: string
  declare description: string | undefined
  declare genre: string | undefined
  declare duration: number | undefined
  declare target_audience: string | undefined
  declare style: string | undefined
  declare concept: string | undefined
  declare key_message: string | undefined
  declare tone: string | undefined
  declare status: 'draft' | 'in_progress' | 'completed' | 'archived'
  declare current_step: 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'completed'
  declare step_progress: Record<string, number>
  declare metadata: Record<string, any>
  declare created_at: Date
  declare updated_at: Date
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

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
      // Note: Foreign key constraint is managed by migration, not model definition
      // This prevents app crashes when series table doesn't exist yet
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
