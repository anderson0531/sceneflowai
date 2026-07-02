import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type NotificationType = 'job_completed' | 'job_failed' | 'job_progress' | 'info'

export interface NotificationAttributes {
  id: string
  user_id: string
  project_id: string | null
  job_id: string | null
  type: NotificationType
  title: string
  message: string
  read: boolean
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export interface NotificationCreationAttributes
  extends Optional<
    NotificationAttributes,
    'id' | 'read' | 'metadata' | 'project_id' | 'job_id' | 'created_at' | 'updated_at'
  > {}

export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: string
  declare user_id: string
  declare project_id: string | null
  declare job_id: string | null
  declare type: NotificationType
  declare title: string
  declare message: string
  declare read: boolean
  declare metadata: Record<string, unknown> | null
  declare created_at: Date
  declare updated_at: Date
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: true },
    job_id: { type: DataTypes.UUID, allowNull: true },
    type: { type: DataTypes.STRING(32), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default Notification
