import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../config/database'

class APIUsageLog extends Model {}

APIUsageLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    task_type: { type: DataTypes.STRING, allowNull: false },
    complexity: { type: DataTypes.STRING, allowNull: false },
    model_id: { type: DataTypes.STRING, allowNull: false },
    platform_id: { type: DataTypes.STRING, allowNull: false },
    prompt: { type: DataTypes.TEXT, allowNull: false },
    parameters: { type: DataTypes.TEXT, allowNull: false },
    cost: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
    duration: { type: DataTypes.INTEGER, allowNull: false },
    success: { type: DataTypes.BOOLEAN, allowNull: false },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    user_rating: { type: DataTypes.INTEGER, allowNull: true },
    output_quality: { type: DataTypes.INTEGER, allowNull: true },
    metadata: { type: DataTypes.TEXT, allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'api_usage_logs',
    timestamps: false,
  }
)

export default APIUsageLog


