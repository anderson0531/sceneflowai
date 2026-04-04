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
 * node-pg honors sslmode from the URI. verify-full / verify-ca commonly fail on
 * Supabase / poolers with SELF_SIGNED_CERT_IN_CHAIN unless you install their CA.
 * We relax to no-verify for non-local hosts unless DATABASE_SSL_REJECT_UNAUTHORIZED=true.
 */
function normalizeRemoteConnectionString(url: string): string {
  let out = url
  out = out.replace(/([?&])sslmode=verify-full/gi, '$1sslmode=no-verify')
  out = out.replace(/([?&])sslmode=verify-ca/gi, '$1sslmode=no-verify')
  if (!/sslmode=/i.test(out)) {
    out += (out.includes('?') ? '&' : '?') + 'sslmode=no-verify'
  }
  return out
}

const isLocal = hostLooksLocal(rawConnectionString)
const connectionString = isLocal ? rawConnectionString : normalizeRemoteConnectionString(rawConnectionString)

const strictTls = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
const sslOption = isLocal
  ? false
  : {
      require: true,
      rejectUnauthorized: strictTls,
    }

export const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: sslOption,
  },
  hooks: {
    beforeConnect: async (config: any) => {
      if (config.query?.options) {
        delete config.query.options
      }
      // Ensure pg sees SSL even if URI parsing or bundling drops dialectOptions
      if (!isLocal) {
        config.ssl = sslOption
      }
    },
  },
  pool: { max: 5, min: 0, acquire: 60000, idle: 10000 },
  logging: false,
  define: { underscored: true },
})

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
