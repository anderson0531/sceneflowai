import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface CustomerConsentAttributes {
  id: string
  collab_session_id: string
  project_id: string | null
  owner_user_id: string
  customer_name: string
  customer_email: string | null
  consent_version: string
  ip_address: string | null
  user_agent: string | null
  attested_media_rights: boolean
  acknowledged_zero_privity: boolean
  accepted_at: Date
}

export interface CustomerConsentCreationAttributes
  extends Optional<
    CustomerConsentAttributes,
    | 'id'
    | 'project_id'
    | 'customer_email'
    | 'consent_version'
    | 'ip_address'
    | 'user_agent'
    | 'attested_media_rights'
    | 'acknowledged_zero_privity'
    | 'accepted_at'
  > {}

export class CustomerConsent
  extends Model<CustomerConsentAttributes, CustomerConsentCreationAttributes>
  implements CustomerConsentAttributes
{
  declare id: string
  declare collab_session_id: string
  declare project_id: string | null
  declare owner_user_id: string
  declare customer_name: string
  declare customer_email: string | null
  declare consent_version: string
  declare ip_address: string | null
  declare user_agent: string | null
  declare attested_media_rights: boolean
  declare acknowledged_zero_privity: boolean
  declare accepted_at: Date
}

CustomerConsent.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    collab_session_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: true },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    customer_name: { type: DataTypes.STRING(160), allowNull: false },
    customer_email: { type: DataTypes.STRING(255), allowNull: true },
    consent_version: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '2026-11-v1' },
    ip_address: { type: DataTypes.STRING(96), allowNull: true },
    user_agent: { type: DataTypes.STRING(512), allowNull: true },
    attested_media_rights: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    acknowledged_zero_privity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    accepted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'customer_consents',
    timestamps: false,
  }
)

export default CustomerConsent
