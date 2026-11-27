import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type CreditHoldStatus = 'pending' | 'captured' | 'released' | 'expired'

export interface CreditHoldAttributes {
  id: string
  user_id: string
  idempotency_key: string
  amount: number
  captured_amount: number | null
  status: CreditHoldStatus
  reason: string
  provider: string | null
  operation: string | null
  project_id: string | null
  ref: string | null
  ledger_id: string | null
  expires_at: Date
  settled_at: Date | null
  meta: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export interface CreditHoldCreationAttributes
  extends Optional<
    CreditHoldAttributes,
    | 'id'
    | 'captured_amount'
    | 'status'
    | 'provider'
    | 'operation'
    | 'project_id'
    | 'ref'
    | 'ledger_id'
    | 'settled_at'
    | 'meta'
    | 'created_at'
    | 'updated_at'
  > {}

export class CreditHold
  extends Model<CreditHoldAttributes, CreditHoldCreationAttributes>
  implements CreditHoldAttributes
{
  declare id: string
  declare user_id: string
  declare idempotency_key: string
  declare amount: number
  declare captured_amount: number | null
  declare status: CreditHoldStatus
  declare reason: string
  declare provider: string | null
  declare operation: string | null
  declare project_id: string | null
  declare ref: string | null
  declare ledger_id: string | null
  declare expires_at: Date
  declare settled_at: Date | null
  declare meta: Record<string, unknown> | null
  declare created_at: Date
  declare updated_at: Date

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

CreditHold.init(
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
    idempotency_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    captured_amount: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'pending',
    },
    reason: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'ai_usage',
    },
    provider: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    operation: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ref: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ledger_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    settled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    meta: {
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
    tableName: 'credit_holds',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'status'], name: 'idx_credit_holds_user_status' },
      { fields: ['status', 'expires_at'], name: 'idx_credit_holds_status_expires' },
      { fields: ['idempotency_key'], unique: true, name: 'uq_credit_holds_idempotency_key' },
    ],
  }
)

export default CreditHold
