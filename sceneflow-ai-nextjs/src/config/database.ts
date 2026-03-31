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
const { conn: CONN, envName: connectionEnvName, isSupabasePooled } = chooseConnectionString()

// 2. Identify Cloud provider
const isCloudDatabase = !CONN.includes('localhost') && !CONN.includes('127.0.0.1');

// 3. Clean the connection ONLY if not pooled
let cleanConn = CONN;
if (!isSupabasePooled) {
  cleanConn = CONN.replace(/[&?]sslmode=[^&]*/g, '').replace(/[&?]$/, '');
  console.log(`[Database] Connection cleaned for non-pooled source.`);
} else {
  console.log(`[Database] Supabase Pooler detected: Preserving project reference parameters.`);
}

// --- 1. Force SSL for all non-local connections ---
const isLocal = CONN.includes('localhost') || CONN.includes('127.0.0.1');

const dialectOptions = {
  ssl: !isLocal ? {
    require: true,
    rejectUnauthorized: false, // THIS IS THE KEY: It tells Node to ignore the certificate chain error
  } : false,
  keepAlive: true,
};

const sequelizeOptions = {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions,
  // Ensure 'options' are undefined to let Supabase URL parameters take priority
  query: { options: undefined }, 
  pool: { max: 10, min: 0, acquire: 60000, idle: 10000 },
  logging: false,
  define: { underscored: true }
};

// --- 2. Ensure both assignment branches use the same options ---
if (connectionEnvName === 'DB_DATABASE_URL') {
  sequelize = new Sequelize(cleanConn, sequelizeOptions);
} else {
  sequelize = new Sequelize(cleanConn, sequelizeOptions);
}