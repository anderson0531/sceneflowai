import { DataTypes, Model, Sequelize } from 'sequelize';
import { sequelize } from '../config/database';

export interface PlatformModelAttributes {
  id: string;
  modelId: string;
  platformId: string;
  platformType: string;
  category: string;
  displayName: string;
  description: string;
  costPerUnit: number;
  basePerformanceScore: number;
  // Optional capability limits
  maxTokens?: number;
  maxDuration?: number;
  maxResolution?: string;
  features: string[];
  isBYOKSupported: boolean;
  isOperational: boolean;
  isActive: boolean;
  // Aggregated performance metrics
  totalRequests: number;
  successCount: number;
  successRate: number;
  totalCost: number;
  averageCost: number;
  totalDuration: number;
  averageDuration: number;
  totalQuality: number;
  averageQuality: number;
  totalUserRating: number;
  averageUserRating: number;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface PlatformModelCreationAttributes extends Omit<PlatformModelAttributes, 'id' | 'lastUpdated'> {
  id?: string;
  lastUpdated?: Date;
}

class PlatformModel extends Model<PlatformModelAttributes, PlatformModelCreationAttributes> {
  declare id: string;
  declare modelId: string;
  declare platformId: string;
  declare platformType: string;
  declare category: string;
  declare displayName: string;
  declare description: string;
  declare costPerUnit: number;
  declare basePerformanceScore: number;
  declare maxTokens: number | undefined;
  declare maxDuration: number | undefined;
  declare maxResolution: string | undefined;
  declare features: string[];
  declare isBYOKSupported: boolean;
  declare isOperational: boolean;
  declare isActive: boolean;
  declare totalRequests: number;
  declare successCount: number;
  declare successRate: number;
  declare totalCost: number;
  declare averageCost: number;
  declare totalDuration: number;
  declare averageDuration: number;
  declare totalQuality: number;
  declare averageQuality: number;
  declare totalUserRating: number;
  declare averageUserRating: number;
  declare lastUpdated: Date;
  declare metadata: Record<string, any>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PlatformModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    platformId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    basePerformanceScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 100,
      },
    },
    maxTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxResolution: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    features: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    isBYOKSupported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isOperational: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Aggregated performance metrics
    totalRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    successCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    successRate: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
    },
    averageCost: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
    },
    totalDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageDuration: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
    },
    totalQuality: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageQuality: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
    },
    totalUserRating: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    averageUserRating: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'platform_models',
    timestamps: true,
  }
);

export default PlatformModel;
