import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface SeriesAssignmentAttributes {
  id: string
  series_id: string
  owner_user_id: string
  member_user_id: string
  created_at: Date
}

export interface SeriesAssignmentCreationAttributes
  extends Optional<SeriesAssignmentAttributes, 'id' | 'created_at'> {}

export class SeriesAssignment
  extends Model<SeriesAssignmentAttributes, SeriesAssignmentCreationAttributes>
  implements SeriesAssignmentAttributes
{
  declare id: string
  declare series_id: string
  declare owner_user_id: string
  declare member_user_id: string
  declare created_at: Date
}

SeriesAssignment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    series_id: { type: DataTypes.UUID, allowNull: false },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    member_user_id: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'series_assignments',
    timestamps: false,
  }
)

export default SeriesAssignment
