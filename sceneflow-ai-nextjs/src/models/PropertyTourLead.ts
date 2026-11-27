import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type PropertyLeadInquiryType =
  | 'schedule_showing'
  | 'renovation_quote'
  | 'financing_info'
  | 'general'

export interface PropertyTourLeadAttributes {
  id: string
  tour_id: string
  owner_user_id: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string | null
  inquiry_type: PropertyLeadInquiryType
  selected_room_name: string | null
  selected_style: string | null
  message: string | null
  referrer_url: string | null
  created_at: Date
  updated_at: Date
}

export interface PropertyTourLeadCreationAttributes
  extends Optional<
    PropertyTourLeadAttributes,
    | 'id'
    | 'buyer_phone'
    | 'inquiry_type'
    | 'selected_room_name'
    | 'selected_style'
    | 'message'
    | 'referrer_url'
    | 'created_at'
    | 'updated_at'
  > {}

export class PropertyTourLead
  extends Model<PropertyTourLeadAttributes, PropertyTourLeadCreationAttributes>
  implements PropertyTourLeadAttributes
{
  declare id: string
  declare tour_id: string
  declare owner_user_id: string
  declare buyer_name: string
  declare buyer_email: string
  declare buyer_phone: string | null
  declare inquiry_type: PropertyLeadInquiryType
  declare selected_room_name: string | null
  declare selected_style: string | null
  declare message: string | null
  declare referrer_url: string | null
  declare created_at: Date
  declare updated_at: Date
}

PropertyTourLead.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tour_id: { type: DataTypes.UUID, allowNull: false },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    buyer_name: { type: DataTypes.STRING(160), allowNull: false },
    buyer_email: { type: DataTypes.STRING(255), allowNull: false },
    buyer_phone: { type: DataTypes.STRING(64), allowNull: true },
    inquiry_type: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'schedule_showing',
    },
    selected_room_name: { type: DataTypes.STRING(120), allowNull: true },
    selected_style: { type: DataTypes.STRING(64), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    referrer_url: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'property_tour_leads',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['tour_id', 'created_at'], name: 'idx_property_tour_leads_tour' },
      { fields: ['owner_user_id', 'created_at'], name: 'idx_property_tour_leads_owner' },
    ],
  }
)

export default PropertyTourLead
