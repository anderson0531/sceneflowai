import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type InfraCostSource = 'gcp' | 'vercel' | 'other'

export interface PlatformInfraCostAttributes {
  id: string
  period_month: string
  source: InfraCostSource
  amount_usd: number
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface PlatformInfraCostCreationAttributes extends Optional<
  PlatformInfraCostAttributes,
  'id' | 'notes' | 'created_at' | 'updated_at'
> {}

export class PlatformInfraCost extends Model<PlatformInfraCostAttributes, PlatformInfraCostCreationAttributes>
  implements PlatformInfraCostAttributes {
  declare id: string
  declare period_month: string
  declare source: InfraCostSource
  declare amount_usd: number
  declare notes: string | null
  declare created_at: Date
  declare updated_at: Date
}

PlatformInfraCost.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    period_month: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    amount_usd: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'platform_infra_costs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default PlatformInfraCost
