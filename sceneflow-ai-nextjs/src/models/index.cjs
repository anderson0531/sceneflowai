const { sequelize } = require('../config/database.cjs');
const User = require('./User').default;
const Project = require('./Project').default;
const UserProviderConfig = require('./UserProviderConfig').default;

// Define model associations
User.hasMany(Project, {
  foreignKey: 'user_id',
  as: 'projects',
  onDelete: 'CASCADE',
});

Project.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(UserProviderConfig, {
  foreignKey: 'user_id',
  as: 'providerConfigs',
  onDelete: 'CASCADE',
});

UserProviderConfig.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Export all models
module.exports = {
  sequelize,
  User,
  Project,
  UserProviderConfig,
};
