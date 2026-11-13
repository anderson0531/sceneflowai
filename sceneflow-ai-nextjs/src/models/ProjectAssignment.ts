import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface ProjectAssignmentAttributes {
  id: string
  project_id: string
  owner_user_id: string
  member_user_id: string
  created_at: Date
}

export interface ProjectAssignmentCreationAttributes
  extends Optional<ProjectAssignmentAttributes, 'id' | 'created_at'> {}

export class ProjectAssignment
  extends Model<ProjectAssignmentAttributes, ProjectAssignmentCreationAttributes>
  implements ProjectAssignmentAttributes
{
  declare id: string
  declare project_id: string
  declare owner_user_id: string
  declare member_user_id: string
  declare created_at: Date
}

ProjectAssignment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    project_id: { type: DataTypes.UUID, allowNull: false },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    member_user_id: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'project_assignments',
    timestamps: false,
  }
)

export default ProjectAssignment
