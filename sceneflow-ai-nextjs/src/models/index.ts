import { sequelize } from '../config/database'
import User from './User'
import Project from './Project'
import UserProviderConfig from './UserProviderConfig'
import PlatformModel from './PlatformModel'
import PromptTemplate from './PromptTemplate'
import FeatureUpdate from './FeatureUpdate'

// Define model associations
User.hasMany(Project, {
  foreignKey: 'user_id',
  as: 'projects',
  onDelete: 'CASCADE',
})

Project.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
})

User.hasMany(UserProviderConfig, {
  foreignKey: 'user_id',
  as: 'providerConfigs',
  onDelete: 'CASCADE',
})

UserProviderConfig.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
})

// DOL model associations
PlatformModel.hasMany(PromptTemplate, {
  foreignKey: 'modelId',
  sourceKey: 'modelId',
  as: 'templates',
})

PromptTemplate.belongsTo(PlatformModel, {
  foreignKey: 'modelId',
  targetKey: 'modelId',
  as: 'model',
})

PlatformModel.hasMany(FeatureUpdate, {
  foreignKey: 'modelId',
  sourceKey: 'modelId',
  as: 'featureUpdates',
})

FeatureUpdate.belongsTo(PlatformModel, {
  foreignKey: 'modelId',
  targetKey: 'modelId',
  as: 'model',
})

// Export all models
export {
  sequelize,
  User,
  Project,
  UserProviderConfig,
  PlatformModel,
  PromptTemplate,
  FeatureUpdate,
}

// Export default for convenience
export default {
  sequelize,
  User,
  Project,
  UserProviderConfig,
  PlatformModel,
  PromptTemplate,
  FeatureUpdate,
}
