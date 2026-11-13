import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type WorkspaceMemberRole = 'admin' | 'project_manager'
export type WorkspaceMemberStatus = 'invited' | 'active' | 'revoked'

export interface WorkspaceMemberAttributes {
  id: string
  owner_user_id: string
  member_user_id: string | null
  member_email: string
  role: WorkspaceMemberRole
  status: WorkspaceMemberStatus
  access_all_projects: boolean
  monthly_credit_limit: number | null
  credits_used_month: number
  credits_period_key: string | null
  created_at: Date
  updated_at: Date
}

export interface WorkspaceMemberCreationAttributes
  extends Optional<
    WorkspaceMemberAttributes,
    | 'id'
    | 'member_user_id'
    | 'role'
    | 'status'
    | 'access_all_projects'
    | 'monthly_credit_limit'
    | 'credits_used_month'
    | 'credits_period_key'
    | 'created_at'
    | 'updated_at'
  > {}

export class WorkspaceMember
  extends Model<WorkspaceMemberAttributes, WorkspaceMemberCreationAttributes>
  implements WorkspaceMemberAttributes
{
  declare id: string
  declare owner_user_id: string
  declare member_user_id: string | null
  declare member_email: string
  declare role: WorkspaceMemberRole
  declare status: WorkspaceMemberStatus
  declare access_all_projects: boolean
  declare monthly_credit_limit: number | null
  declare credits_used_month: number
  declare credits_period_key: string | null
  declare created_at: Date
  declare updated_at: Date
}

WorkspaceMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    member_user_id: { type: DataTypes.UUID, allowNull: true },
    member_email: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'project_manager' },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'active' },
    access_all_projects: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    monthly_credit_limit: { type: DataTypes.INTEGER, allowNull: true },
    credits_used_month: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    credits_period_key: { type: DataTypes.STRING(16), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'workspace_members',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default WorkspaceMember
