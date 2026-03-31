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

const { conn: CONN, envName: connectionEnvName, isSupabasePooled } = chooseConnectionString()

// LOG which connection string we're actually using (with password masked)
const maskedConn = CONN.replace(/:([^@]+)@/, ':****@')
console.log(`[Database] Using connection from: ${connectionEnvName}`)
console.log(`[Database] Connection string (masked): ${maskedConn}`)
console.log(`[Database] Timestamp: ${new Date().toISOString()}`)
console.log(`[Database] Provider: ${maskedConn.includes('supabase') ? 'Supabase' : maskedConn.includes('neon') ? 'Neon' : 'Other'}`)
console.log(`[Database] Connection status: DB link removed, using manual config`)

// Configure SSL for cloud providers (Supabase, Neon)
// Detect cloud database from connection string hostname
const isCloudDatabase = 
  CONN.includes('supabase.co') || 
  CONN.includes('supabase.com') || 
  CONN.includes('neon.tech') || 
  CONN.includes('pooler') || 
  CONN.includes('.rds.')

// Only clean the connection if it's NOT a Supabase pooled connection
let cleanConn = CONN;
if (!isSupabasePooled) {
  cleanConn = CONN.replace(/[&?]sslmode=[^&]*/g, '').replace(/[&?]$/, '');
  console.log(`[Database] Connection cleaned for non-pooled source.`);
} else {
  console.log(`[Database] Supabase Pooler detected: Preserving project reference parameters.`);
}
// SSL configuration for pg driver - force bypass all certificate validation
const dialectOptions = {
  ssl: isCloudDatabase ? {
    require: true,
    rejectUnauthorized: false, // Prevents self-signed cert errors
  } : false,
  // ADD THIS: Prevents the "Tenant not found" FATAL errors from hanging the pool
  keepAlive: true,
  statement_timeout: 60000,
}

const sequelizeOptions = {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions,
  // THE FIX: If pooled, we tell Sequelize not to inject extra options 
  // that would conflict with the 'options=reference' in the URL.
  query: isSupabasePooled ? { options: undefined } : undefined,
  pool: { max: isSupabasePooled ? 10 : 3, min: 0, acquire: 30000, idle: 10000 },
  logging: false,
  define: { underscored: true }
};

if (connectionEnvName === 'DB_DATABASE_URL') {
  sequelize = new Sequelize(cleanConn as string, sequelizeOptions)
} else if (cleanConn) {
  sequelize = new Sequelize(cleanConn as string, sequelizeOptions)
}

// Provide sanitized connection info for diagnostics
let selectedConnectionHost = 'unknown'
let selectedConnectionIsPooled = false
try {
  if (cleanConn) {
    const parsed = new URL(cleanConn)
    selectedConnectionHost = parsed.hostname
    selectedConnectionIsPooled = /pooler|prisma/i.test(parsed.hostname)
  }
} catch {}

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

// Export Sequelize instance and diagnostics
export { sequelize, connectionEnvName, selectedConnectionHost, selectedConnectionIsPooled }