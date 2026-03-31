import { Sequelize } from 'sequelize'
import pg from 'pg'
import dotenv from 'dotenv'

// 1. Setup Environment
dotenv.config({ path: '.env.local' })
if (!process.env.DB_DATABASE_URL && !process.env.DATABASE_URL) {
  dotenv.config({ path: '../.env.local' })
}

const isVercelBuild = process.env.NEXT_PHASE === 'phase-production-build'

function readFirst(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]
    if (value && String(value).trim().length > 0) return value
  }
  return undefined
}

// 2. Selection Logic
function chooseConnectionString() {
  const rawConn = readFirst([
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL',
    'Neon_DATABASE_URL'
  ]);

  if (!rawConn) {
    if (isVercelBuild) return { conn: 'postgresql://localhost:5432/dummy', env: 'build-dummy', isPooled: false };
    throw new Error('No database connection string found.');
  }

  const isPooled = rawConn.includes('pooler.supabase.com') || rawConn.includes('pooler');
  return { conn: rawConn, env: 'selected-env', isPooled };
}

const { conn: CONN, env: connectionEnvName, isPooled: isSupabasePooled } = chooseConnectionString();

// 3. SSL and Cloud Detection
// Force SSL for everything non-local to bypass certificate chain issues
const isLocal = CONN.includes('localhost') || CONN.includes('127.0.0.1');

const dialectOptions = {
  ssl: !isLocal ? {
    require: true,
    rejectUnauthorized: false, // Fixes SELF_SIGNED_CERT_IN_CHAIN
  } : false,
  keepAlive: true,
  statement_timeout: 60000,
};

// 4. Sequelize Options
const sequelizeOptions = {
  dialect: 'postgres' as const,
  dialectModule: pg,
  dialectOptions,
  // Fixes 'Tenant not found' by allowing Supabase URL parameters to remain primary
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

// 5. THE SINGLE DECLARATION (Previously causing the crash)
const sequelize = new Sequelize(CONN, sequelizeOptions);

// 6. Diagnostics
let selectedConnectionHost = 'unknown';
try {
  const url = new URL(CONN);
  selectedConnectionHost = url.hostname;
} catch {}

const selectedConnectionIsPooled = isSupabasePooled;

// 7. NAMED EXPORTS
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