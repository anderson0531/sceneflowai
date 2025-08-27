#!/usr/bin/env node

const { sequelize } = require('../config/database.cjs');
require('../models/index.cjs'); // Import all models to register them

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
