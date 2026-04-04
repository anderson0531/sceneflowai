import { Sequelize } from 'sequelize'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const envSource =
  process.env.DATABASE_URL_DIRECT ? 'DATABASE_URL_DIRECT' :
  process.env.POSTGRES_URL_NON_POOLING ? 'POSTGRES_URL_NON_POOLING' :
  process.env.SUPABASE_DATABASE_URL ? 'SUPABASE_DATABASE_URL' :
  process.env.DATABASE_URL ? 'DATABASE_URL' : null

const rawConnectionString =
  process.env.DATABASE_URL_DIRECT ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL

if (!rawConnectionString || !envSource) {
  throw new Error('DATABASE_URL is missing. Please check your Vercel environment variables.')
}

try {
  const u = new URL(rawConnectionString)
  console.log(`[database] Using ${envSource} → host=${u.hostname}, port=${u.port || '5432'}, db=${u.pathname.slice(1) || 'postgres'}, user=${u.username}`)
} catch {
  console.log(`[database] Using ${envSource} (could not parse URL for logging)`)
}

function hostLooksLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return /localhost|127\.0\.0\.1/.test(url)
  }
}

/** project ref from https://<ref>.supabase.co */
function supabaseProjectRefFromEnv(): string | null {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim()
  if (explicit) return explicit

  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const) {
    const raw = process.env[key]
    if (!raw) continue
    try {
      const host = new URL(raw).hostname
      const m = host.match(/^([a-z0-9]{15,40})\.supabase\.co$/i)
      if (m) return m[1]
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * Parse postgres URL with WHATWG URL (no url.parse).
 * Omit sslmode in URI for remote hosts so pg v8 does not force verify-full.
 */
function parsePostgresUrl(connectionUrl: string): {
  host: string
  port: number
  username: string
  password: string
  database: string
} {
  const u = new URL(connectionUrl)
  const pathMatch = u.pathname.match(/^\/([^?]*)/)
  const rawDb = pathMatch?.[1]?.trim()
  const database = rawDb && rawDb.length > 0 ? rawDb : 'postgres'

  let username = decodeURIComponent(u.username)
  const host = u.hostname
  const port = Number.parseInt(u.port || '5432', 10)

  /**
   * Supavisor *session* pooler (shared): aws-0-<region>.pooler.supabase.com:5432
   * Docs: user must be postgres.<project_ref>, NOT plain postgres.
   * Plain postgres on this host → FATAL "Tenant or user not found".
   */
  const isSupavisorSessionHost =
    /\.pooler\.supabase\.com$/i.test(host) && port === 5432

  if (isSupavisorSessionHost && username === 'postgres') {
    const ref = supabaseProjectRefFromEnv()
    if (!ref) {
      throw new Error(
        'DATABASE_URL points at Supabase session pooler (pooler.supabase.com:5432) with user "postgres". ' +
          'Use the exact Session mode string from Supabase (Connect → Session pooling), or set SUPABASE_PROJECT_REF / NEXT_PUBLIC_SUPABASE_URL so the user can be set to postgres.<ref>. ' +
          'Alternatively set DATABASE_URL_DIRECT or POSTGRES_URL_NON_POOLING to the direct or non-pooling URL.'
      )
    }
    username = `postgres.${ref}`
  }

  return {
    host,
    port,
    username,
    password: decodeURIComponent(u.password),
    database,
  }
}

const isLocal = hostLooksLocal(rawConnectionString)
const strictTls = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'

const remoteSsl = {
  require: true as const,
  rejectUnauthorized: strictTls,
}

const pool = { max: 5, min: 0, acquire: 60000, idle: 10000 }
const define = { underscored: true }

export const sequelize = isLocal
  ? new Sequelize(rawConnectionString, {
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions: { ssl: false },
      hooks: {
        beforeConnect: async (config: any) => {
          if (config.query?.options) {
            delete config.query.options
          }
        },
      },
      pool,
      logging: false,
      define,
    })
  : (() => {
      const { host, port, username, password, database } = parsePostgresUrl(rawConnectionString)
      return new Sequelize(database, username, password, {
        dialect: 'postgres',
        dialectModule: pg,
        host,
        port,
        dialectOptions: {
          ssl: remoteSsl,
        },
        hooks: {
          beforeConnect: async (config: any) => {
            if (config.query?.options) {
              delete config.query.options
            }
            config.ssl = remoteSsl
          },
        },
        pool,
        logging: false,
        define,
      })
    })()

export const testConnection = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ DB Connected')
  } catch (err) {
    console.error('❌ DB Fail:', err)
    throw err
  }
}

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true })
}

export const connectionEnvName = 'DATABASE_URL'
export const selectedConnectionHost = 'supabase'
export const selectedConnectionIsPooled = false
