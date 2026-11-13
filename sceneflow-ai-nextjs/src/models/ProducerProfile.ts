import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface ProducerProfileAttributes {
  id: string
  user_id: string
  brand_name: string
  brand_logo_url: string | null
  primary_color: string
  support_email: string | null
  custom_terms_url: string | null
  hide_sceneflow_branding: boolean
  default_max_rounds: number
  daily_public_intake_credit_cap: number
  commercial_addendum_accepted_at: Date | null
  commercial_addendum_version: string | null
  accepted_ip: string | null
  created_at: Date
  updated_at: Date
}

export interface ProducerProfileCreationAttributes
  extends Optional<
    ProducerProfileAttributes,
    | 'id'
    | 'brand_logo_url'
    | 'primary_color'
    | 'support_email'
    | 'custom_terms_url'
    | 'hide_sceneflow_branding'
    | 'default_max_rounds'
    | 'daily_public_intake_credit_cap'
    | 'commercial_addendum_accepted_at'
    | 'commercial_addendum_version'
    | 'accepted_ip'
    | 'created_at'
    | 'updated_at'
  > {}

export class ProducerProfile
  extends Model<ProducerProfileAttributes, ProducerProfileCreationAttributes>
  implements ProducerProfileAttributes
{
  declare id: string
  declare user_id: string
  declare brand_name: string
  declare brand_logo_url: string | null
  declare primary_color: string
  declare support_email: string | null
  declare custom_terms_url: string | null
  declare hide_sceneflow_branding: boolean
  declare default_max_rounds: number
  declare daily_public_intake_credit_cap: number
  declare commercial_addendum_accepted_at: Date | null
  declare commercial_addendum_version: string | null
  declare accepted_ip: string | null
  declare created_at: Date
  declare updated_at: Date
}

ProducerProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    brand_name: { type: DataTypes.STRING(160), allowNull: false, defaultValue: '' },
    brand_logo_url: { type: DataTypes.STRING(1000), allowNull: true },
    primary_color: { type: DataTypes.STRING(24), allowNull: false, defaultValue: '#7c3aed' },
    support_email: { type: DataTypes.STRING(255), allowNull: true },
    custom_terms_url: { type: DataTypes.STRING(1000), allowNull: true },
    hide_sceneflow_branding: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    default_max_rounds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    daily_public_intake_credit_cap: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 200 },
    commercial_addendum_accepted_at: { type: DataTypes.DATE, allowNull: true },
    commercial_addendum_version: { type: DataTypes.STRING(32), allowNull: true },
    accepted_ip: { type: DataTypes.STRING(96), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'producer_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default ProducerProfile
