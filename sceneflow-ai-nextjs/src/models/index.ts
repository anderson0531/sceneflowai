import { sequelize } from '../config/database'
import User from './User'
import AIPricing from './AIPricing'
import CreditLedger from './CreditLedger'
import AIUsage from './AIUsage'
import Project from './Project'
import UserProviderConfig from './UserProviderConfig'
import APIUsageLog from './APIUsageLog'
import PlatformModel from './PlatformModel'
import PromptTemplate from './PromptTemplate'
import FeatureUpdate from './FeatureUpdate'
import CollabSession from './CollabSession'
import CollabParticipant from './CollabParticipant'
import CollabScore from './CollabScore'
import CollabComment from './CollabComment'
import CollabRecommendation from './CollabRecommendation'
import CollabChatMessage from './CollabChatMessage'
import SubscriptionTier from './SubscriptionTier'
import RateCard from './RateCard'
import { ExportJob } from './ExportJob'

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

ExportJob.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
})

User.hasMany(ExportJob, {
  foreignKey: 'user_id',
  as: 'exportJobs',
})

ExportJob.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
})

Project.hasMany(ExportJob, {
  foreignKey: 'project_id',
  as: 'exportJobs',
})

// Subscription model associations
User.belongsTo(SubscriptionTier, {
  foreignKey: 'subscription_tier_id',
  as: 'subscriptionTier',
})

SubscriptionTier.hasMany(User, {
  foreignKey: 'subscription_tier_id',
  as: 'users',
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
  APIUsageLog,
  AIPricing,
  CreditLedger,
  AIUsage,
  CollabSession,
  CollabParticipant,
  CollabScore,
  CollabComment,
  CollabRecommendation,
  CollabChatMessage,
  SubscriptionTier,
  RateCard,
  ExportJob,
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
  APIUsageLog,
  AIPricing,
  CreditLedger,
  AIUsage,
  CollabSession,
  CollabParticipant,
  CollabScore,
  CollabComment,
  CollabRecommendation,
  CollabChatMessage,
  SubscriptionTier,
  RateCard,
  ExportJob,
}
