import { sequelize, ensureDatabaseConnection } from '../config/database';
import '../models'; // Import all models to register them

let isInitialized = false;

export async function initializeDatabase() {
  if (isInitialized) {
    return sequelize;
  }

  try {
    // Test the connection
    await ensureDatabaseConnection('initializeDatabase');
    console.log('✅ Database connection established successfully.');
    
    // Sync models (only in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized successfully.');
    }
    
    isInitialized = true;
    return sequelize;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  if (isInitialized) {
    await sequelize.close();
    isInitialized = false;
    console.log('🔌 Database connection closed.');
  }
}

// Auto-initialize when this module is imported
if (typeof window === 'undefined') {
  // Only run on server side
  initializeDatabase().catch(console.error);
}
