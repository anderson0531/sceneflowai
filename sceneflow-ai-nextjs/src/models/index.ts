import { sequelize } from '../config/database'
import User from './User'
import Project from './Project'
import UserProviderConfig from './UserProviderConfig'

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

// Export all models
export {
  sequelize,
  User,
  Project,
  UserProviderConfig,
}

// Export default for convenience
export default {
  sequelize,
  User,
  Project,
  UserProviderConfig,
}
