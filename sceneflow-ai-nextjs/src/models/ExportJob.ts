import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ExportJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface ExportJobAttributes {
  id: string
  user_id: string | null
  project_id: string | null
  status: ExportJobStatus
  payload: Record<string, any> | null
  result_url: string | null
  error_message: string | null
  progress: number | null
  metadata: Record<string, any> | null
  created_at: Date
  updated_at: Date
}

export interface ExportJobCreationAttributes
  extends Optional<
    ExportJobAttributes,
    'id' | 'user_id' | 'project_id' | 'status' | 'payload' | 'result_url' | 'error_message' | 'progress' | 'metadata' | 'created_at' | 'updated_at'
  > {}

export class ExportJob extends Model<ExportJobAttributes, ExportJobCreationAttributes> implements ExportJobAttributes {
  public id!: string
  public user_id!: string | null
  public project_id!: string | null
  public status!: ExportJobStatus
  public payload!: Record<string, any> | null
  public result_url!: string | null
  public error_message!: string | null
  public progress!: number | null
  public metadata!: Record<string, any> | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

ExportJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('queued', 'running', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'queued',
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    result_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    progress: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    tableName: 'export_jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
)
