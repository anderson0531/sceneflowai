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
  maxTokens?: number;
  maxDuration?: number;
  maxResolution?: string;
  features: string[];
  isBYOKSupported: boolean;
  isOperational: boolean;
  isActive: boolean;
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
