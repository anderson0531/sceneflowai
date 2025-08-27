const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.local' });

// Database configuration
console.log('🔍 Environment check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('NODE_ENV:', process.env.NODE_ENV);

let sequelize;

if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL for connection');
  // Use DATABASE_URL if provided
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else {
  // Use individual environment variables
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'sceneflow_ai',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Sync database models
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully.');
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    throw error;
  }
};

module.exports = { sequelize, testConnection, syncDatabase };
