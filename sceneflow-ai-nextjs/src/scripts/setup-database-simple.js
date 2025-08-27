#!/usr/bin/env node

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: '.env.local' });

// Database configuration
console.log('🔍 Environment check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('NODE_ENV:', process.env.NODE_ENV);

let sequelize;

if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else {
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'sceneflow_ai',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
}

// Define basic models for setup
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  underscored: true
});

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'archived'),
    defaultValue: 'draft'
  }
}, {
  tableName: 'projects',
  underscored: true
});

const UserProviderConfig = sequelize.define('UserProviderConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  provider_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  api_key: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'user_provider_configs',
  underscored: true
});

// Define associations
User.hasMany(Project, {
  foreignKey: 'user_id',
  as: 'projects',
  onDelete: 'CASCADE'
});

Project.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(UserProviderConfig, {
  foreignKey: 'user_id',
  as: 'providerConfigs',
  onDelete: 'CASCADE'
});

UserProviderConfig.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

async function setupDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('🔄 Syncing database models...');
    await sequelize.sync({ force: true }); // This will drop and recreate all tables
    console.log('✅ Database models synchronized successfully.');

    console.log('🎉 Database setup completed!');
    console.log('\n📊 Created tables:');
    console.log('   - users');
    console.log('   - projects'); 
    console.log('   - user_provider_configs');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the setup
setupDatabase();
