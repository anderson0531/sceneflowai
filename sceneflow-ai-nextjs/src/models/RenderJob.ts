/**
 * RenderJob Model
 * 
 * Tracks video rendering jobs submitted to GCP Cloud Run.
 * Used for status polling and job management.
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type RenderJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type RenderType = 'animatic' | 'scene_video' | 'project_video'

export interface RenderJobAttributes {
  id: string
  project_id: string
  user_id: string
  status: RenderJobStatus
  progress: number
  resolution: '720p' | '1080p' | '4K'
  language: string
  include_subtitles: boolean
  render_type: RenderType
  estimated_duration: number | null
  cloud_run_execution_id: string | null
  output_path: string | null
  download_url: string | null
  download_url_expires_at: Date | null
  error: string | null
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

export interface RenderJobCreationAttributes extends Optional<
  RenderJobAttributes,
  'id' | 'status' | 'progress' | 'created_at' | 'updated_at' | 'completed_at' |
  'cloud_run_execution_id' | 'output_path' | 'download_url' | 'download_url_expires_at' |
  'error' | 'estimated_duration' | 'render_type'
> {}

export class RenderJob extends Model<RenderJobAttributes, RenderJobCreationAttributes>
  implements RenderJobAttributes {
  public id!: string
  public project_id!: string
  public user_id!: string
  public status!: RenderJobStatus
  public progress!: number
  public resolution!: '720p' | '1080p' | '4K'
  public language!: string
  public include_subtitles!: boolean
  public render_type!: RenderType
  public estimated_duration!: number | null
  public cloud_run_execution_id!: string | null
  public output_path!: string | null
  public download_url!: string | null
  public download_url_expires_at!: Date | null
  public error!: string | null
  public created_at!: Date
  public updated_at!: Date
  public completed_at!: Date | null

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

RenderJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'QUEUED',
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    resolution: {
      type: DataTypes.ENUM('720p', '1080p', '4K'),
      allowNull: false,
      defaultValue: '1080p',
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en',
    },
    include_subtitles: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    render_type: {
      type: DataTypes.ENUM('animatic', 'scene_video', 'project_video'),
      allowNull: false,
      defaultValue: 'scene_video',
      comment: 'Type of render: animatic (from Screening Room), scene_video, or project_video',
    },
    estimated_duration: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Estimated video duration in seconds',
    },
    cloud_run_execution_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Cloud Run Job execution ID for monitoring',
    },
    output_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'GCS path to rendered video (gs://bucket/path)',
    },
    download_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Signed download URL for the rendered video',
    },
    download_url_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration time for the download URL',
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if job failed',
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
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'render_jobs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'render_jobs_project_id_idx',
        fields: ['project_id'],
      },
      {
        name: 'render_jobs_user_id_idx',
        fields: ['user_id'],
      },
      {
        name: 'render_jobs_status_idx',
        fields: ['status'],
      },
      {
        name: 'render_jobs_created_at_idx',
        fields: ['created_at'],
      },
      {
        name: 'render_jobs_render_type_idx',
        fields: ['render_type'],
      },
      {
        name: 'render_jobs_project_render_type_idx',
        fields: ['project_id', 'render_type'],
      },
    ],
  }
)

export default RenderJob
