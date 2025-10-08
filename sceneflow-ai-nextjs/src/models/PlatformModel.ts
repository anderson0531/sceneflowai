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
  public id!: string;
  public modelId!: string;
  public platformId!: string;
  public platformType!: string;
  public category!: string;
  public displayName!: string;
  public description!: string;
  public costPerUnit!: number;
  public basePerformanceScore!: number;
  public maxTokens?: number;
  public maxDuration?: number;
  public maxResolution?: string;
  public features!: string[];
  public isBYOKSupported!: boolean;
  public isOperational!: boolean;
  public isActive!: boolean;
  public totalRequests!: number;
  public successCount!: number;
  public successRate!: number;
  public totalCost!: number;
  public averageCost!: number;
  public totalDuration!: number;
  public averageDuration!: number;
  public totalQuality!: number;
  public averageQuality!: number;
  public totalUserRating!: number;
  public averageUserRating!: number;
  public lastUpdated!: Date;
  public metadata!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
