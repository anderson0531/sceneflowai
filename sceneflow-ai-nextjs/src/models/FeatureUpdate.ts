import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface FeatureUpdateAttributes {
  id: string;
  platformId: string;
  modelId: string;
  feature: string;
  status: string;
  description: string;
  source: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface FeatureUpdateCreationAttributes extends Omit<FeatureUpdateAttributes, 'id'> {
  id?: string;
}

class FeatureUpdate extends Model<FeatureUpdateAttributes, FeatureUpdateCreationAttributes> {
  public id!: string;
  public platformId!: string;
  public modelId!: string;
  public feature!: string;
  public status!: string;
  public description!: string;
  public source!: string;
  public confidence!: number;
  public metadata!: Record<string, any>;

  public readonly createdAt!: Date;
}

FeatureUpdate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    platformId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    feature: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['added', 'removed', 'updated']],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['automated', 'manual', 'community']],
      },
    },
    confidence: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100,
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'feature_updates',
    timestamps: false, // Only created_at
  }
);

export default FeatureUpdate;
