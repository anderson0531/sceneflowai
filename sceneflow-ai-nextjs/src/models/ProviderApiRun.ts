import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ProviderRunVendor =
  | 'vertex'
  | 'kling'
  | 'elevenlabs'
  | 'openai'
  | 'fal'
  | 'cloud_run'
  | 'aggregator'
  | 'edge_tts'
  | 'ai_gateway'
  | 'other'

export type ProviderRunStatus =
  | 'dispatching'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'rate_limited'

export interface ProviderApiRunAttributes {
  id: string
  user_id: string | null
  project_id: string | null
  route: string
  provider: ProviderRunVendor
  model: string
  operation: string
  credential_source: 'platform' | 'byok'
  provider_request_id: string | null
  units_billed: number
  unit_type: string | null
  estimated_cogs_usd: number
  hold_id: string | null
  ledger_id: string | null
  charged_credits: number
  status: ProviderRunStatus
  http_status: number | null
  error_code: string | null
  meta: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export interface ProviderApiRunCreationAttributes
  extends Optional<
    ProviderApiRunAttributes,
    | 'id'
    | 'user_id'
    | 'project_id'
    | 'credential_source'
    | 'provider_request_id'
    | 'units_billed'
    | 'unit_type'
    | 'estimated_cogs_usd'
    | 'hold_id'
    | 'ledger_id'
    | 'charged_credits'
    | 'status'
    | 'http_status'
    | 'error_code'
    | 'meta'
    | 'created_at'
    | 'updated_at'
  > {}

export class ProviderApiRun
  extends Model<ProviderApiRunAttributes, ProviderApiRunCreationAttributes>
  implements ProviderApiRunAttributes
{
  declare id: string
  declare user_id: string | null
  declare project_id: string | null
  declare route: string
  declare provider: ProviderRunVendor
  declare model: string
  declare operation: string
  declare credential_source: 'platform' | 'byok'
  declare provider_request_id: string | null
  declare units_billed: number
  declare unit_type: string | null
  declare estimated_cogs_usd: number
  declare hold_id: string | null
  declare ledger_id: string | null
  declare charged_credits: number
  declare status: ProviderRunStatus
  declare http_status: number | null
  declare error_code: string | null
  declare meta: Record<string, unknown> | null
  declare created_at: Date
  declare updated_at: Date

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

ProviderApiRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    route: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    operation: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    credential_source: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'platform',
    },
    provider_request_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    units_billed: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    unit_type: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    estimated_cogs_usd: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: false,
      defaultValue: 0,
    },
    hold_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ledger_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    charged_credits: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'dispatching',
    },
    http_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    error_code: {
      type: DataTypes.STRING(128),
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
    tableName: 'provider_api_runs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['created_at', 'status'], name: 'idx_provider_api_runs_created_status' },
      {
        fields: ['credential_source', 'status', 'ledger_id'],
        name: 'idx_provider_api_runs_audit_parity',
      },
      { fields: ['user_id', 'created_at'], name: 'idx_provider_api_runs_user_created' },
      { fields: ['hold_id'], name: 'idx_provider_api_runs_hold_id' },
    ],
  }
)

export default ProviderApiRun
