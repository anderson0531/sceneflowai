import { Sequelize } from 'sequelize'
import pg from 'pg'
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
const isVercelBuild = process.env.NEXT_PHASE === 'phase-production-build'

// Prefer Neon/Vercel-style vars, fall back to legacy
function readFirst(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]
    if (value && String(value).trim().length > 0) return value
  }
  return undefined
}

function chooseConnectionString(): { conn: string; envName: string; isSupabasePooled: boolean } {
  const DATABASE_URL = readFirst(['DATABASE_URL', 'Neon_DATABASE_URL', 'POSTGRES_URL_NON_POOLING']);
  
  if (!DATABASE_URL) {
    if (isVercelBuild) return { conn: 'postgresql://localhost', envName: 'build-dummy', isSupabasePooled: false };
    throw new Error('No database connection string found.');
  }

  const isSupabasePooled = DATABASE_URL.includes('pooler.supabase.com');

  // If it's Supabase, we return it raw immediately to preserve the ?options=reference...
  if (isSupabasePooled) {
    return { conn: DATABASE_URL, envName: 'DATABASE_URL (Supabase Pooled)', isSupabasePooled: true };
  }

  // ... (keep your existing de-pooling logic for non-Supabase URLs here)
  return { conn: DATABASE_URL, envName: 'DATABASE_URL', isSupabasePooled: false };
}

// 1. Get the connection info (isSupabasePooled is declared here)
const { conn: CONN, env: connectionEnvName, isPooled: isSupabasePooled } = chooseConnectionString();

// 3. SSL and Cloud Detection
// Force SSL for everything non-local to bypass certificate chain issues
const isLocal = CONN.includes('localhost') || CONN.includes('127.0.0.1');

const dialectOptions = {
  ssl: !isLocal ? {
    require: true,
    rejectUnauthorized: false, // THIS IS THE KEY: It tells Node to ignore the certificate chain error
  } : false,
  keepAlive: true,
  statement_timeout: 60000,
};

// 4. Sequelize Options
const sequelizeOptions = {
  dialect: 'postgres' as const,
  dialectModule: pg,
  dialectOptions,
  // Ensure 'options' are undefined to let Supabase URL parameters take priority
  query: isSupabasePooled ? { options: undefined } : undefined, 
  pool: { 
    max: isSupabasePooled ? 15 : 5, 
    min: 0, 
    acquire: 60000, 
    idle: 10000 
  },
  logging: false,
  define: { 
    timestamps: true,
    underscored: true, 
    freezeTableName: true 
  }
};

// 5. Instance Initialization
const sequelize = new Sequelize(CONN, sequelizeOptions);

// 6. Diagnostics
let selectedConnectionHost = 'unknown';
try {
  const url = new URL(CONN);
  selectedConnectionHost = url.hostname;
} catch {}

const selectedConnectionIsPooled = isSupabasePooled;

// 7. NAMED EXPORTS (Crucial for the build to pass)
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized.');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};

export { 
  sequelize, 
  connectionEnvName, 
  selectedConnectionHost, 
  selectedConnectionIsPooled 
};