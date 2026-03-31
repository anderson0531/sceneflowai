import { Sequelize } from 'sequelize'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// 1. Grab the direct URL or fallback to the standard one
const connectionString = 
  process.env.DATABASE_URL_DIRECT || 
  process.env.POSTGRES_URL_NON_POOLING || 
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Please check your Vercel environment variables.');
}

// 2. Simplest SSL bypass: If it's not localhost, trust the cert.
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: !isLocal ? {
      require: true,
      rejectUnauthorized: false, // Fixes the self-signed cert issue
    } : false,
  },
  // Supavisor fixes:
  // We disable Sequelize's default behavior of setting session variables
  // which causes the "Tenant not found" error on pooled connections.
  hooks: {
    beforeConnect: async (config: any) => {
      // This ensures we don't try to send 'options' as a separate command
      if (config.query && config.query.options) {
        delete config.query.options;
      }
    }
  },
  pool: { max: 5, min: 0, acquire: 60000, idle: 10000 },
  logging: false,
  define: { underscored: true }
});

// 3. Simple Exports
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB Connected');
  } catch (err) {
    console.error('❌ DB Fail:', err);
    throw err;
  }
};

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true });
};

export const connectionEnvName = 'DATABASE_URL';
export const selectedConnectionHost = 'supabase';
export const selectedConnectionIsPooled = false;