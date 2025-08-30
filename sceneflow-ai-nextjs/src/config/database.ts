import { sql } from '@vercel/postgres'
import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Also try to load from parent directory if .env.local doesn't exist
if (!process.env.DB_DATABASE_URL && !process.env.DATABASE_URL) {
  dotenv.config({ path: '../.env.local' })
}

// Database configuration
  // Environment check

let sequelize: Sequelize

if (process.env.DB_DATABASE_URL) {
      // Using DB_DATABASE_URL (Vercel Postgres) for connection
  // Use Vercel Postgres connection string with Sequelize
  sequelize = new Sequelize(process.env.DB_DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: { timestamps: true, underscored: true, freezeTableName: true }
  })
} else if (process.env.DATABASE_URL) {
      // Using DATABASE_URL (Supabase) for connection
  // Fallback to Supabase
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: { timestamps: true, underscored: true, freezeTableName: true }
  })
} else {
  throw new Error('No database connection string found. Please set DB_DATABASE_URL or DATABASE_URL')
}

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    // Database connection established successfully
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error)
    throw error
  }
}

// Sync database models
export const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ alter: true })
    // Database models synchronized successfully
  } catch (error) {
    console.error('❌ Database synchronization failed:', error)
    throw error
  }
}

// Export both Sequelize instance and Vercel Postgres client
export { sequelize, sql }