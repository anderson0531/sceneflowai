import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type { CreditLotSource } from '@/lib/credits/creditLots'

export interface CreditLotRowAttributes {
  id: string
  user_id: string
  source: CreditLotSource
  remaining: number
  granted: number
  purchased_at: Date
  expires_at: Date
  ref: string | null
  created_at: Date
  updated_at: Date
}

export interface CreditLotRowCreationAttributes
  extends Optional<CreditLotRowAttributes, 'created_at' | 'updated_at' | 'ref'> {}

export class CreditLotRow
  extends Model<CreditLotRowAttributes, CreditLotRowCreationAttributes>
  implements CreditLotRowAttributes
{
  declare id: string
  declare user_id: string
  declare source: CreditLotSource
  declare remaining: number
  declare granted: number
  declare purchased_at: Date
  declare expires_at: Date
  declare ref: string | null
  declare created_at: Date
  declare updated_at: Date
}

CreditLotRow.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    remaining: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    granted: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    purchased_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ref: {
      type: DataTypes.STRING(255),
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
    tableName: 'credit_lots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'], name: 'idx_credit_lots_user' },
      { fields: ['expires_at'], name: 'idx_credit_lots_expires' },
    ],
  }
)

export default CreditLotRow
