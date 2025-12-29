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
// Compliance Layer models
import VoiceConsent from './VoiceConsent'
import UserVoiceClone from './UserVoiceClone'
import ModerationEvent from './ModerationEvent'

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

// Subscription model associations
User.belongsTo(SubscriptionTier, {
  foreignKey: 'subscription_tier_id',
  as: 'subscriptionTier',
})

SubscriptionTier.hasMany(User, {
  foreignKey: 'subscription_tier_id',
  as: 'users',
})

// Compliance Layer model associations
User.hasMany(VoiceConsent, {
  foreignKey: 'user_id',
  as: 'voiceConsents',
  onDelete: 'CASCADE',
})

VoiceConsent.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
})

User.hasMany(UserVoiceClone, {
  foreignKey: 'user_id',
  as: 'voiceClones',
  onDelete: 'CASCADE',
})

UserVoiceClone.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
})

UserVoiceClone.belongsTo(VoiceConsent, {
  foreignKey: 'consent_id',
  as: 'consent',
})

VoiceConsent.hasOne(UserVoiceClone, {
  foreignKey: 'consent_id',
  as: 'voiceClone',
})

User.hasMany(ModerationEvent, {
  foreignKey: 'user_id',
  as: 'moderationEvents',
  onDelete: 'CASCADE',
})

ModerationEvent.belongsTo(User, {
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
  // Compliance Layer models
  VoiceConsent,
  UserVoiceClone,
  ModerationEvent,
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
  // Compliance Layer models
  VoiceConsent,
  UserVoiceClone,
  ModerationEvent,
}
