import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export interface PushSubscriptionAttributes {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: Date
  updated_at: Date
}

export interface PushSubscriptionCreationAttributes
  extends Optional<PushSubscriptionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class PushSubscription
  extends Model<PushSubscriptionAttributes, PushSubscriptionCreationAttributes>
  implements PushSubscriptionAttributes
{
  declare id: string
  declare user_id: string
  declare endpoint: string
  declare p256dh: string
  declare auth: string
  declare created_at: Date
  declare updated_at: Date
}

PushSubscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    endpoint: { type: DataTypes.TEXT, allowNull: false, unique: true },
    p256dh: { type: DataTypes.TEXT, allowNull: false },
    auth: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'push_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default PushSubscription
