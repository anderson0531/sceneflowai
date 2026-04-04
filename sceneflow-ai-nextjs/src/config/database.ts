import { Sequelize } from 'sequelize'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const rawConnectionString =
  process.env.DATABASE_URL_DIRECT ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL

if (!rawConnectionString) {
  throw new Error('DATABASE_URL is missing. Please check your Vercel environment variables.')
}

function hostLooksLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return /localhost|127\.0\.0\.1/.test(url)
  }
}

/**
 * Parse postgres URL with WHATWG URL (no url.parse).
 * Used for remote hosts so we never pass sslmode=* in the URI to pg:
 * pg v8 + pg-connection-string treats require/prefer as verify-full unless
 * uselibpqcompat is set, which breaks Supabase/poolers with SELF_SIGNED_CERT_IN_CHAIN.
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

  return {
    host: u.hostname,
    port: Number.parseInt(u.port || '5432', 10),
    username: decodeURIComponent(u.username),
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
