import { Sequelize } from 'sequelize'
import pg from 'pg'
import dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getCloudSqlDriverOptions } from '@/lib/database/cloudSqlDriverOptions'

dotenv.config({ path: '.env.local' })

function parseGoogleServiceAccountJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    const fixed = raw.replace(
      /("private_key"\s*:\s*")([\s\S]*?)("\s*,\s*"client_email")/,
      (_match, start: string, keyBody: string, end: string) =>
        `${start}${keyBody.replace(/\r?\n/g, '\\n')}${end}`
    )
    return JSON.parse(fixed) as Record<string, unknown>
  }
}

function ensureGoogleApplicationCredentialsFile(): void {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()) {
    return
  }
  try {
    const credentials = parseGoogleServiceAccountJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    const dir = join(tmpdir(), 'sceneflow-gcp')
    mkdirSync(dir, { recursive: true })
    const credPath = join(dir, 'application_default_credentials.json')
    writeFileSync(credPath, JSON.stringify(credentials), { mode: 0o600 })
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath
  } catch {
    /* fall back to inline credentials in getCloudSqlConnector */
  }
}

ensureGoogleApplicationCredentialsFile()

const pool = { max: 5, min: 0, acquire: 60000, idle: 10000 }
const define = { underscored: true }

function useCloudSqlFromEnv(): boolean {
  return Boolean(
    process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME?.trim() &&
      process.env.DB_USER?.trim() &&
      process.env.DB_PASSWORD &&
      process.env.DB_NAME?.trim()
  )
}

const cloudSqlEnabled = useCloudSqlFromEnv()

const directEnvSource = cloudSqlEnabled
  ? null
  : process.env.DATABASE_URL_DIRECT
    ? 'DATABASE_URL_DIRECT'
    : process.env.POSTGRES_URL_NON_POOLING
      ? 'POSTGRES_URL_NON_POOLING'
      : process.env.SUPABASE_DATABASE_URL
        ? 'SUPABASE_DATABASE_URL'
        : process.env.DATABASE_URL
          ? 'DATABASE_URL'
          : null

const rawConnectionString = cloudSqlEnabled
  ? null
  : process.env.DATABASE_URL_DIRECT ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL

if (!cloudSqlEnabled && (!rawConnectionString || !directEnvSource)) {
  throw new Error(
    'Database config missing. Set CLOUD_SQL_INSTANCE_CONNECTION_NAME + DB_USER + DB_PASSWORD + DB_NAME, or DATABASE_URL.'
  )
}

if (cloudSqlEnabled) {
  console.log(
    `[database] Using Cloud SQL → instance=${process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME}, db=${process.env.DB_NAME}, user=${process.env.DB_USER}`
  )
} else {
  try {
    const u = new URL(rawConnectionString!)
    console.log(
      `[database] Using ${directEnvSource} → host=${u.hostname}, port=${u.port || '5432'}, db=${u.pathname.slice(1) || 'postgres'}, user=${u.username}`
    )
  } catch {
    console.log(`[database] Using ${directEnvSource} (could not parse URL for logging)`)
  }
}

function hostLooksLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return /localhost|127\.0\.0\.1/.test(url)
  }
}

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

const strictTls = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
const remoteSsl = {
  require: true as const,
  rejectUnauthorized: strictTls,
}

let cloudSqlOptsPromise: ReturnType<typeof getCloudSqlDriverOptions> | null = null

function ensureCloudSqlOpts() {
  if (!cloudSqlOptsPromise) {
    cloudSqlOptsPromise = getCloudSqlDriverOptions(
      process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME!.trim()
    )
  }
  return cloudSqlOptsPromise
}

function createSequelize(): Sequelize {
  if (cloudSqlEnabled) {
    return new Sequelize(process.env.DB_NAME!, process.env.DB_USER!, process.env.DB_PASSWORD!, {
      dialect: 'postgres',
      dialectModule: pg,
      host: '127.0.0.1',
      port: 5432,
      dialectOptions: {},
      hooks: {
        beforeConnect: async (config: Record<string, unknown>) => {
          const opts = await ensureCloudSqlOpts()
          config.stream = opts.stream
          const dialectOptions =
            config.dialectOptions && typeof config.dialectOptions === 'object'
              ? (config.dialectOptions as Record<string, unknown>)
              : {}
          dialectOptions.stream = opts.stream
          config.dialectOptions = dialectOptions
          if (config.query && typeof config.query === 'object') {
            const query = config.query as Record<string, unknown>
            if (query.options) delete query.options
          }
        },
      },
      pool,
      logging: false,
      define,
    })
  }

  const isLocal = hostLooksLocal(rawConnectionString!)
  if (isLocal) {
    return new Sequelize(rawConnectionString!, {
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions: { ssl: false },
      hooks: {
        beforeConnect: async (config: Record<string, unknown>) => {
          if (config.query && typeof config.query === 'object') {
            const query = config.query as Record<string, unknown>
            if (query.options) delete query.options
          }
        },
      },
      pool,
      logging: false,
      define,
    })
  }

  const { host, port, username, password, database } = parsePostgresUrl(rawConnectionString!)
  return new Sequelize(database, username, password, {
    dialect: 'postgres',
    dialectModule: pg,
    host,
    port,
    dialectOptions: {
      ssl: remoteSsl,
    },
    hooks: {
      beforeConnect: async (config: Record<string, unknown>) => {
        if (config.query && typeof config.query === 'object') {
          const query = config.query as Record<string, unknown>
          if (query.options) delete query.options
        }
        config.ssl = remoteSsl
      },
    },
    pool,
    logging: false,
    define,
  })
}

export const sequelize = createSequelize()

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

export const connectionEnvName = cloudSqlEnabled
  ? 'CLOUD_SQL_INSTANCE_CONNECTION_NAME'
  : (directEnvSource ?? 'DATABASE_URL')

export const selectedConnectionHost = cloudSqlEnabled
  ? 'cloud-sql'
  : rawConnectionString && hostLooksLocal(rawConnectionString)
    ? 'local'
    : 'direct'

export const selectedConnectionIsPooled = false

export function getDatabaseConnectionInfo() {
  if (cloudSqlEnabled) {
    return {
      mode: 'cloud-sql' as const,
      envSource: 'CLOUD_SQL_INSTANCE_CONNECTION_NAME' as const,
      host: process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
    }
  }

  let envHost = 'unknown'
  if (rawConnectionString) {
    try {
      envHost = new URL(rawConnectionString).hostname
    } catch {
      /* ignore */
    }
  }

  return {
    mode: selectedConnectionHost === 'local' ? ('local' as const) : ('direct' as const),
    envSource: directEnvSource ?? 'DATABASE_URL',
    host: envHost,
    database: undefined,
    user: undefined,
  }
}
