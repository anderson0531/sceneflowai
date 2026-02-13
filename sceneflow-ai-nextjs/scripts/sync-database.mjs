/**
 * Database Schema Sync Script
 * 
 * Run this script to sync the Sequelize models with the database.
 * Uses `alter: true` to add new columns without dropping existing data.
 * 
 * Usage: node scripts/sync-database.mjs
 */

import { Sequelize, DataTypes } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') })

// Build connection string from individual vars if DATABASE_URL not set
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DATABASE || 'postgres'}`

console.log('Connecting to database...')
console.log('Host:', process.env.POSTGRES_HOST)

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
})

// Define Series model with the new resonance_analysis field
const Series = sequelize.define('series', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  logline: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  target_audience: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  },
  max_episodes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
  },
  production_bible: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  episode_blueprints: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  resonance_analysis: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    comment: 'Cached resonance analysis with scores, insights, and episode engagement data',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'series',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})

async function syncDatabase() {
  try {
    await sequelize.authenticate()
    console.log('✓ Database connection established')
    
    // Sync with alter to add new columns without dropping data
    console.log('Syncing Series model (alter mode)...')
    await Series.sync({ alter: true })
    
    console.log('✓ Database schema synced successfully!')
    console.log('✓ resonance_analysis column added to series table')
    
    // Verify the column exists
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'series' AND column_name = 'resonance_analysis'
    `)
    
    if (results.length > 0) {
      console.log('✓ Verified: resonance_analysis column exists')
      console.log('  Type:', results[0].data_type)
    } else {
      console.log('⚠ Warning: Column verification failed')
    }
    
  } catch (error) {
    console.error('✗ Error syncing database:', error.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

syncDatabase()
