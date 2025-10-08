import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface PromptTemplateAttributes {
  id: string;
  templateId: string;
  modelId: string;
  taskType: string;
  templateString: string;
  variables: string[];
  currentQualityScore: number;
  usageCount: number;
  isDeprecated: boolean;
  userSatisfaction?: number;
  metadata: Record<string, any>;
}

export interface PromptTemplateCreationAttributes extends Omit<PromptTemplateAttributes, 'id'> {
  id?: string;
}

class PromptTemplate extends Model<PromptTemplateAttributes, PromptTemplateCreationAttributes> {
  public id!: string;
  public templateId!: string;
  public modelId!: string;
  public taskType!: string;
  public templateString!: string;
  public variables!: string[];
  public currentQualityScore!: number;
  public usageCount!: number;
  public isDeprecated!: boolean;
  public userSatisfaction?: number;
  public metadata!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PromptTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    modelId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taskType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    templateString: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    variables: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    currentQualityScore: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100,
      },
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isDeprecated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    userSatisfaction: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'prompt_templates',
    timestamps: true,
  }
);

export default PromptTemplate;
