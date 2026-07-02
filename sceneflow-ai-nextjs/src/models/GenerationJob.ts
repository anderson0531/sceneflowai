import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type GenerationJobType =
  | 'scene_audio'
  | 'segment_frames'
  | 'segment_video'
  | 'scene_render'
  | 'production_render'
  | 'reference_library'

export type GenerationJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface GenerationJobAttributes {
  id: string
  user_id: string
  project_id: string
  job_type: GenerationJobType
  status: GenerationJobStatus
  progress: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  retry_count: number
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

export interface GenerationJobCreationAttributes
  extends Optional<
    GenerationJobAttributes,
    | 'id'
    | 'status'
    | 'progress'
    | 'result'
    | 'error'
    | 'retry_count'
    | 'created_at'
    | 'updated_at'
    | 'completed_at'
  > {}

export class GenerationJob
  extends Model<GenerationJobAttributes, GenerationJobCreationAttributes>
  implements GenerationJobAttributes
{
  declare id: string
  declare user_id: string
  declare project_id: string
  declare job_type: GenerationJobType
  declare status: GenerationJobStatus
  declare progress: number
  declare payload: Record<string, unknown>
  declare result: Record<string, unknown> | null
  declare error: string | null
  declare retry_count: number
  declare created_at: Date
  declare updated_at: Date
  declare completed_at: Date | null
}

GenerationJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    job_type: { type: DataTypes.STRING(48), allowNull: false },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'queued',
    },
    progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    result: { type: DataTypes.JSONB, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    completed_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'generation_jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default GenerationJob
