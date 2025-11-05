import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CreditLedgerAttributes {
  id: string
  user_id: string
  delta_credits: number
  prev_balance: number
  new_balance: number
  reason: 'ai_usage' | 'refund' | 'purchase' | 'adjustment' | 'hold_release' | 'subscription_allocation' | 'addon_purchase' | 'subscription_expiry' | 'byok_platform_fee'
  credit_type: 'subscription' | 'addon' | null // Track which type of credits were used
  ref: string | null
  meta: any | null
  created_at: Date
  updated_at: Date
}

export interface CreditLedgerCreationAttributes extends Optional<CreditLedgerAttributes, 'id' | 'created_at' | 'updated_at' | 'ref' | 'meta' | 'credit_type'> {}

export class CreditLedger extends Model<CreditLedgerAttributes, CreditLedgerCreationAttributes> implements CreditLedgerAttributes {
    public id!: string
  public user_id!: string
  public delta_credits!: number
  public prev_balance!: number
  public new_balance!: number
  public reason!: 'ai_usage' | 'refund' | 'purchase' | 'adjustment' | 'hold_release' | 'subscription_allocation' | 'addon_purchase' | 'subscription_expiry' | 'byok_platform_fee'
  public credit_type!: 'subscription' | 'addon' | null
  public ref!: string | null
  public meta!: any | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

CreditLedger.init(
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
    delta_credits: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    prev_balance: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    new_balance: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
        reason: {
      type: DataTypes.ENUM('ai_usage', 'refund', 'purchase', 'adjustment', 'hold_release', 'subscription_allocation', 'addon_purchase', 'subscription_expiry', 'byok_platform_fee'),
      allowNull: false,
    },
    credit_type: {
      type: DataTypes.ENUM('subscription', 'addon'),
      allowNull: true,
      defaultValue: null,
    },
    ref: {
      type: DataTypes.STRING(255),
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
    tableName: 'credit_ledger',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'created_at'], name: 'idx_credit_ledger_user_created' },
      { fields: ['reason'], name: 'idx_credit_ledger_reason' },
    ],
  }
)

export default CreditLedger


