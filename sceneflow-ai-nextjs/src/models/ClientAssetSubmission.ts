import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ContinuitySlotType = 'character' | 'location' | 'prop'
export type QuarantineStatus = 'clean' | 'flagged'
export type SubmissionApprovalStatus = 'pending' | 'promoted' | 'rejected'

export interface ClientAssetSubmissionAttributes {
  id: string
  collab_session_id: string
  project_id: string
  owner_user_id: string
  slot_id: string
  slot_type: ContinuitySlotType
  slot_name: string
  customer_name: string
  customer_email: string | null
  blob_url: string
  mime_type: string
  file_size_bytes: number
  caption: string | null
  quarantine_status: QuarantineStatus
  quarantine_reason: string | null
  approval_status: SubmissionApprovalStatus
  promoted_reference_asset_id: string | null
  created_at: Date
  updated_at: Date
}

export interface ClientAssetSubmissionCreationAttributes
  extends Optional<
    ClientAssetSubmissionAttributes,
    | 'id'
    | 'customer_email'
    | 'file_size_bytes'
    | 'caption'
    | 'quarantine_status'
    | 'quarantine_reason'
    | 'approval_status'
    | 'promoted_reference_asset_id'
    | 'created_at'
    | 'updated_at'
  > {}

export class ClientAssetSubmission
  extends Model<ClientAssetSubmissionAttributes, ClientAssetSubmissionCreationAttributes>
  implements ClientAssetSubmissionAttributes
{
  declare id: string
  declare collab_session_id: string
  declare project_id: string
  declare owner_user_id: string
  declare slot_id: string
  declare slot_type: ContinuitySlotType
  declare slot_name: string
  declare customer_name: string
  declare customer_email: string | null
  declare blob_url: string
  declare mime_type: string
  declare file_size_bytes: number
  declare caption: string | null
  declare quarantine_status: QuarantineStatus
  declare quarantine_reason: string | null
  declare approval_status: SubmissionApprovalStatus
  declare promoted_reference_asset_id: string | null
  declare created_at: Date
  declare updated_at: Date
}

ClientAssetSubmission.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    collab_session_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    slot_id: { type: DataTypes.STRING(160), allowNull: false },
    slot_type: { type: DataTypes.STRING(32), allowNull: false },
    slot_name: { type: DataTypes.STRING(200), allowNull: false },
    customer_name: { type: DataTypes.STRING(160), allowNull: false },
    customer_email: { type: DataTypes.STRING(255), allowNull: true },
    blob_url: { type: DataTypes.STRING(1200), allowNull: false },
    mime_type: { type: DataTypes.STRING(64), allowNull: false },
    file_size_bytes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    caption: { type: DataTypes.TEXT, allowNull: true },
    quarantine_status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'clean' },
    quarantine_reason: { type: DataTypes.TEXT, allowNull: true },
    approval_status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
    promoted_reference_asset_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'client_asset_submissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default ClientAssetSubmission
