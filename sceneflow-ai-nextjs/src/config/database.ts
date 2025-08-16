import { Sequelize } from 'sequelize'

// Database configuration
const sequelize = new Sequelize({
  dialect: 'postgres', // or 'mysql', 'sqlite', 'mariadb', 'mssql'
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
})

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connection established successfully.')
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error)
    throw error
  }
}

// Sync database models
export const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ alter: true })
    console.log('✅ Database models synchronized successfully.')
  } catch (error) {
    console.error('❌ Database synchronization failed:', error)
    throw error
  }
}

export { sequelize }
