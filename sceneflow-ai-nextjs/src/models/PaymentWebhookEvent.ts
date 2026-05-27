import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface PaymentWebhookEventAttributes {
  id: string
  provider: string
  event_id: string
  event_type: string
  payload_hash: string | null
  processed_at: Date
  created_at: Date
}

export interface PaymentWebhookEventCreationAttributes
  extends Optional<
    PaymentWebhookEventAttributes,
    'id' | 'payload_hash' | 'created_at'
  > {}

export class PaymentWebhookEvent
  extends Model<PaymentWebhookEventAttributes, PaymentWebhookEventCreationAttributes>
  implements PaymentWebhookEventAttributes
{
  declare id: string
  declare provider: string
  declare event_id: string
  declare event_type: string
  declare payload_hash: string | null
  declare processed_at: Date
  declare created_at: Date
}

PaymentWebhookEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    event_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    payload_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'payment_webhook_events',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['event_id'],
        name: 'unique_payment_webhook_event_id',
      },
      {
        fields: ['provider', 'event_type'],
        name: 'idx_payment_webhook_provider_type',
      },
    ],
  }
)

export default PaymentWebhookEvent
