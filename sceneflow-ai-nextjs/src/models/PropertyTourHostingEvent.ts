import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type PropertyHostingEventType =
  | 'publish_activation'
  | 'monthly_hosting_renewal'
  | 'included_plan_slot'

export interface PropertyTourHostingEventAttributes {
  id: string
  tour_id: string
  user_id: string
  billing_month: string // YYYY-MM
  event_type: PropertyHostingEventType
  credits_charged: number
  ledger_id: string | null
  meta: Record<string, unknown> | null
  created_at: Date
}

export interface PropertyTourHostingEventCreationAttributes
  extends Optional<
    PropertyTourHostingEventAttributes,
    'id' | 'credits_charged' | 'ledger_id' | 'meta' | 'created_at'
  > {}

export class PropertyTourHostingEvent
  extends Model<PropertyTourHostingEventAttributes, PropertyTourHostingEventCreationAttributes>
  implements PropertyTourHostingEventAttributes
{
  declare id: string
  declare tour_id: string
  declare user_id: string
  declare billing_month: string
  declare event_type: PropertyHostingEventType
  declare credits_charged: number
  declare ledger_id: string | null
  declare meta: Record<string, unknown> | null
  declare created_at: Date
}

PropertyTourHostingEvent.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tour_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    billing_month: { type: DataTypes.STRING(7), allowNull: false },
    event_type: { type: DataTypes.STRING(32), allowNull: false },
    credits_charged: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ledger_id: { type: DataTypes.UUID, allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'property_tour_hosting_events',
    timestamps: false,
    indexes: [
      {
        fields: ['tour_id', 'billing_month'],
        unique: true,
        name: 'uq_property_tour_hosting_month',
      },
      { fields: ['user_id', 'billing_month'], name: 'idx_property_tour_hosting_user_month' },
    ],
  }
)

export default PropertyTourHostingEvent
