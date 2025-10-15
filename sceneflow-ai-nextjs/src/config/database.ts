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

function chooseConnectionString(): { conn: string; envName: string } {
  // Highest priority: explicit unpooled values
  const EXPLICIT_UNPOOLED = readFirst(['DATABASE_URL_UNPOOLED', 'Neon_DATABASE_URL_UNPOOLED'])
  if (EXPLICIT_UNPOOLED) {
    return { conn: EXPLICIT_UNPOOLED, envName: 'DATABASE_URL_UNPOOLED' }
  }
  const NON_POOLING = readFirst(['POSTGRES_URL_NON_POOLING', 'Neon_POSTGRES_URL_NON_POOLING'])
  if (NON_POOLING) {
    return { conn: NON_POOLING, envName: 'POSTGRES_URL_NON_POOLING' }
  }

  // Next: DATABASE_URL. If it's a pooled/prisma host, try to de-pooled it using PGHOST_UNPOOLED
  const DATABASE_URL = readFirst(['DATABASE_URL', 'Neon_DATABASE_URL'])
  if (DATABASE_URL) {
    const raw = DATABASE_URL
    try {
      const url = new URL(raw)
      const isPrismaProxy = /prisma/i.test(url.hostname)
      const isPooled = /pooler/i.test(url.hostname)

      // If prisma proxy and PG creds are available, build a clean unpooled DSN
      const PGHOST_UNPOOLED = readFirst(['PGHOST_UNPOOLED', 'Neon_PGHOST_UNPOOLED'])
      const PGUSER = readFirst(['PGUSER', 'Neon_PGUSER'])
      const PGPASSWORD = readFirst(['PGPASSWORD', 'Neon_PGPASSWORD'])
      const PGDATABASE = readFirst(['PGDATABASE', 'Neon_PGDATABASE'])
      if (isPrismaProxy && PGHOST_UNPOOLED && PGUSER && PGPASSWORD && PGDATABASE) {
        const built = new URL('postgresql://localhost')
        built.username = encodeURIComponent(PGUSER)
        built.password = encodeURIComponent(PGPASSWORD)
        built.hostname = PGHOST_UNPOOLED
        built.pathname = `/${PGDATABASE}`
        built.searchParams.set('sslmode', 'require')
        return { conn: built.toString(), envName: 'PG* (constructed unpooled)' }
      }

      // If prisma proxy but Vercel/Neon POSTGRES URLs are available, prefer NON_POOLING first
      if (isPrismaProxy) {
        const NON_POOLING2 = readFirst(['POSTGRES_URL_NON_POOLING', 'Neon_POSTGRES_URL_NON_POOLING'])
        if (NON_POOLING2) {
          return { conn: NON_POOLING2, envName: 'POSTGRES_URL_NON_POOLING' }
        }
      }
      const POSTGRES_URL = readFirst(['POSTGRES_URL', 'Neon_POSTGRES_URL'])
      if (isPrismaProxy && POSTGRES_URL) {
        try {
          const neon = new URL(POSTGRES_URL)
          // attempt to de-pooled by stripping "-pooler" if present
          neon.hostname = neon.hostname.replace('-pooler.', '.')
          return { conn: neon.toString(), envName: 'POSTGRES_URL (derived unpooled)' }
        } catch {
          return { conn: POSTGRES_URL, envName: 'POSTGRES_URL' }
        }
      }

      // Otherwise, if pooled and an unpooled host is provided, swap host only
      if ((isPrismaProxy || isPooled) && PGHOST_UNPOOLED) {
        url.hostname = PGHOST_UNPOOLED
        return { conn: url.toString(), envName: 'DATABASE_URL→PGHOST_UNPOOLED' }
      }

      return { conn: raw, envName: 'DATABASE_URL' }
    } catch {
      return { conn: raw, envName: 'DATABASE_URL' }
    }
  }

  // Fallbacks
  const POSTGRES_URL2 = readFirst(['POSTGRES_URL', 'Neon_POSTGRES_URL'])
  if (POSTGRES_URL2) {
    return { conn: POSTGRES_URL2, envName: 'POSTGRES_URL' }
  }
  const DB_URL = readFirst(['DB_URL'])
  if (DB_URL) {
    return { conn: DB_URL, envName: 'DB_URL' }
  }
  const DB_DATABASE_URL = readFirst(['DB_DATABASE_URL'])
  if (DB_DATABASE_URL) {
    return { conn: DB_DATABASE_URL, envName: 'DB_DATABASE_URL' }
  }

  if (isVercelBuild) {
    // During `next build` on Vercel, allow missing DB and use a dummy local connection
    // to avoid throwing at build time. Actual runtime will still require valid env.
    return { conn: 'postgresql://user:pass@localhost:5432/dummy', envName: 'build-dummy' }
  }
  throw new Error('No database connection string found. Please set DATABASE_URL or DATABASE_URL_UNPOOLED')
}

const { conn: CONN, envName: connectionEnvName } = chooseConnectionString()

// LOG which connection string we're actually using (with password masked)
const maskedConn = CONN.replace(/:([^@]+)@/, ':****@')
console.log(`[Database] Using connection from: ${connectionEnvName}`)
console.log(`[Database] Connection string (masked): ${maskedConn}`)
console.log(`[Database] Timestamp: ${new Date().toISOString()}`)
console.log(`[Database] Provider: ${maskedConn.includes('supabase') ? 'Supabase' : maskedConn.includes('neon') ? 'Neon' : 'Other'}`)
console.log(`[Database] Connection status: DB link removed, using manual config`)

// Configure SSL for cloud providers (Supabase, Neon)
const dialectOptions = {
  ssl: process.env.NODE_ENV === 'production' ? {
    require: true,
    rejectUnauthorized: false // Accept cloud provider certificates
  } : false
}

if (connectionEnvName === 'DB_DATABASE_URL') {
  sequelize = new Sequelize(CONN as string, {
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: { timestamps: true, underscored: true, freezeTableName: true }
  })
} else if (CONN) {
  sequelize = new Sequelize(CONN as string, {
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: { timestamps: true, underscored: true, freezeTableName: true }
  })
}

// Provide sanitized connection info for diagnostics
let selectedConnectionHost = 'unknown'
let selectedConnectionIsPooled = false
try {
  if (CONN) {
    const parsed = new URL(CONN)
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