import { Sequelize } from 'sequelize'
import pg from 'pg'
import dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getCloudSqlDriverOptions, resetCloudSqlConnector } from '@/lib/database/cloudSqlDriverOptions'
import {
  logDatabaseConnectionFailure,
  isSslOrCertConnectionError,
  isTransientConnectionCapacityError,
} from '@/lib/database/connectionDiagnostics'

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
  // Optional legacy path: connector uses inline credentials from cloudSqlDriverOptions.ts.
  // Writing to /tmp is best-effort only (Vercel /tmp is limited; ENOSPC must not block DB).
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
  } catch (error) {
    console.warn(
      '[database] Skipped writing GCP credentials to /tmp (connector uses inline auth):',
      error instanceof Error ? error.message : error
    )
  }
}

ensureGoogleApplicationCredentialsFile()

/**
 * Pool size is per *instance*, and every serverless instance gets its own module
 * scope, so the ceiling the database sees is `max` x live instances — not `max`.
 * At the previous max of 5, a dozen warm instances alone could exhaust a small
 * Cloud SQL tier, surfacing as "remaining connection slots are reserved…" on
 * whichever request connects next.
 *
 * One per instance by default, because the usual escape hatch does not apply
 * here: an idle instance is frozen between invocations, so the `idle`/`evict`
 * reapers do not run and its sockets stay open on the server the whole time it
 * is warm. Holding a second connection therefore doubles the resting footprint
 * for a pool that short queries rarely need concurrently.
 *
 * Caveat — Fluid Compute can run concurrent requests on the same isolate. With
 * max=1 those requests serialize on the pool; a second checkout waits until
 * `acquire` (60s) and fails as SequelizeConnectionAcquireTimeoutError. Prefer
 * serializing fire-and-forget DB work (await budget increments) and raise
 * DB_POOL_MAX only when a pooler or larger tier can absorb the peak.
 *
 * `maxUses: 1` is the piece that actually frees slots under freeze: when a
 * request returns its connection to the pool, sequelize-pool destroys it
 * instead of parking it idle. A warm instance that then freezes holds *zero*
 * Cloud SQL sockets. Without this, max=1 still accumulates one zombie socket
 * per warm instance until Vercel recycles the isolate — which is how production
 * hit 53300 again after the max=1 deploy.
 *
 * Do not rely on `idle: 0` for the same effect: sequelize-pool coerces a falsy
 * idleTimeoutMillis to 30000 (`factory.idleTimeoutMillis || 30000`), so zero
 * never means "destroy immediately".
 *
 * This is mitigation, not a cure. Concurrent in-flight requests across many
 * cold starts can still saturate `max_connections`. A sustained burst needs a
 * pooler (PgBouncer / Cloud SQL Auth Proxy) or a larger tier. DB_POOL_MAX raises
 * the per-instance cap without a code change once either is in place.
 */
function poolMaxFromEnv(): number {
  const raw = Number.parseInt(process.env.DB_POOL_MAX ?? '', 10)
  if (Number.isFinite(raw) && raw > 0) return raw
  return 1
}

const pool = {
  max: poolMaxFromEnv(),
  min: 0,
  acquire: 60000,
  // Kept non-zero only as a backstop for long-lived local processes; on Vercel
  // the freeze window prevents eviction from running, so maxUses does the work.
  idle: 10000,
  evict: 5000,
  // Destroy the socket after each checkout. Critical for serverless freeze.
  maxUses: 1,
}
const define = { underscored: true }

/**
 * Retry queries that fail only because the server is at `max_connections`.
 *
 * Applied on the Sequelize instance rather than at call sites: the ~72 routes
 * that touch the database call `sequelize.authenticate()` and the models
 * directly, so a wrapper helper would have to be threaded through every one of
 * them to help. Sequelize routes model calls and `authenticate()` through the
 * same query path, so configuring it here covers all of them at once.
 *
 * Slots free up as other requests finish, so the wait is short. Message wording
 * differs across server versions, and pg's own pool says "too many clients".
 */
const retry = {
  match: [
    /remaining connection slots are reserved/i,
    /too many clients already/i,
    /too many connections/i,
  ],
  // Six attempts over roughly four seconds. Long enough to ride out a burst of
  // cold starts, short enough to stay well inside the 60s acquire timeout.
  max: 6,
  backoffBase: 150,
  backoffExponent: 1.6,
}

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

function logCloudSqlStartupDiagnostics(): void {
  if (!cloudSqlEnabled) return

  const hasJson = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
      process.env.GCP_SERVICE_ACCOUNT_KEY?.trim()
  )
  const hasFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)

  if (!hasJson && !hasFile) {
    console.error(
      '[database] Cloud SQL is enabled but no GCP credentials are configured. ' +
        'Set GOOGLE_APPLICATION_CREDENTIALS_JSON (or GCP_SERVICE_ACCOUNT_KEY). ' +
        'Missing/invalid credentials typically surface as TLS alert 42 (bad_certificate). ' +
        'Ensure the service account has roles/cloudsql.client and redeploy after rotating keys.'
    )
    return
  }

  if (hasJson) {
    try {
      const raw =
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
        process.env.GCP_SERVICE_ACCOUNT_KEY?.trim()!
      const creds = parseGoogleServiceAccountJson(raw)
      const email = typeof creds.client_email === 'string' ? creds.client_email : 'unknown'
      console.log(`[database] Cloud SQL auth: service account ${email}`)
    } catch {
      console.error(
        '[database] GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON. ' +
          'Cloud SQL connector auth will fail (often as bad_certificate / alert 42).'
      )
    }
  }
}

if (cloudSqlEnabled) {
  console.log(
    `[database] Using Cloud SQL → instance=${process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME}, db=${process.env.DB_NAME}, user=${process.env.DB_USER}`
  )
  logCloudSqlStartupDiagnostics()
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
      retry,
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
      retry,
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
    retry,
    logging: false,
    define,
  })
}

export let sequelize = createSequelize()

/**
 * Refresh Cloud SQL mTLS without replacing the Sequelize singleton.
 *
 * Models (e.g. Project) bind `sequelize` at init time. Calling `sequelize.close()`
 * permanently disables that connection manager, and `sequelize = createSequelize()`
 * leaves models pointing at the closed instance — so authenticate on the new
 * export can succeed while Project.findByPk still fails with alert 42 / closed CM.
 *
 * Drain pooled sockets, drop the connector + cached stream factory, and keep the
 * same Sequelize instance so the next checkout runs beforeConnect with a fresh cert.
 */
export async function resetDatabaseConnection(): Promise<void> {
  console.warn('[database] Resetting Cloud SQL connector after SSL/cert error (keeping Sequelize instance)')
  cloudSqlOptsPromise = null
  resetCloudSqlConnector()
  try {
    const pool = sequelize.connectionManager?.pool as
      | { drain?: () => Promise<unknown>; destroyAllNow?: () => Promise<unknown> }
      | undefined
    if (pool?.drain && pool?.destroyAllNow) {
      await pool.drain()
      await pool.destroyAllNow()
    }
  } catch {
    /* pool may already be empty */
  }
}

/** Coalesce concurrent SSL resets so parallel Fluid requests share one connector refresh. */
let sslResetInFlight: Promise<void> | null = null

async function resetDatabaseConnectionCoalesced(): Promise<void> {
  if (!sslResetInFlight) {
    sslResetInFlight = resetDatabaseConnection().finally(() => {
      sslResetInFlight = null
    })
  }
  await sslResetInFlight
}

/**
 * Global SSL alert-42 self-heal on every connection checkout.
 *
 * Capacity exhaustion is already retried via Sequelize `retry.match`. SSL alert 42
 * (stale Cloud SQL ephemeral client cert on warm Fluid isolates) needs a connector
 * reset first — a bare retry reuses the same bad cert. Wrapping getConnection covers
 * all ~72 routes that call `sequelize.authenticate()` or models directly, without
 * threading `ensureDatabaseConnection` through each call site.
 */
function installGlobalSslSelfHeal(instance: Sequelize): void {
  const manager = instance.connectionManager as {
    getConnection: (options?: unknown) => Promise<unknown>
  }
  const originalGetConnection = manager.getConnection.bind(manager)

  manager.getConnection = async (options?: unknown) => {
    try {
      return await originalGetConnection(options)
    } catch (error) {
      if (!isSslOrCertConnectionError(error)) throw error

      // #region agent log
      console.warn(
        '[database] SSL/cert error on getConnection — resetting Cloud SQL connector and retrying once',
        { hypothesisId: 'H1', runId: 'ssl-alert42-global' }
      )
      // #endregion
      logDatabaseConnectionFailure(
        error,
        'getConnection (retrying after connector reset)',
        getDatabaseConnectionInfo
      )
      await resetDatabaseConnectionCoalesced()
      return await originalGetConnection(options)
    }
  }
}

export async function withDatabaseSelfHeal<T>(
  operation: () => Promise<T>,
  context = 'database'
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Capacity is already retried by the Sequelize `retry` config, which covers
    // every caller rather than only the few that use this helper. Reaching here
    // means the retries were exhausted, so say what to change and stop.
    if (isTransientConnectionCapacityError(error)) {
      console.error(
        `[database] ${context}: still at connection capacity after ${retry.max} attempts. ` +
          `Lower DB_POOL_MAX (currently ${pool.max}) or raise the instance's max_connections.`
      )
      throw error
    }

    if (!isSslOrCertConnectionError(error)) {
      logDatabaseConnectionFailure(error, context, getDatabaseConnectionInfo)
      throw error
    }

    // getConnection already self-heals once; this path remains for callers that
    // wrap non-checkout work, and as a second chance if the first reset raced.
    logDatabaseConnectionFailure(error, `${context} (retrying after connector reset)`, getDatabaseConnectionInfo)
    await resetDatabaseConnectionCoalesced()

    try {
      return await operation()
    } catch (retryError) {
      logDatabaseConnectionFailure(retryError, `${context} (after connector reset)`, getDatabaseConnectionInfo)
      throw retryError
    }
  }
}

export async function ensureDatabaseConnection(context = 'ensureDatabaseConnection'): Promise<void> {
  await withDatabaseSelfHeal(() => sequelize.authenticate(), context)
}

export const testConnection = async () => {
  try {
    await ensureDatabaseConnection('testConnection')
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
      hasGcpCredentialsJson: Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
          process.env.GCP_SERVICE_ACCOUNT_KEY?.trim()
      ),
      hasGcpCredentialsFile: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
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
    sslRejectUnauthorized: strictTls,
  }
}

// Install after helpers exist so getConnection can log + reset with full context.
installGlobalSslSelfHeal(sequelize)
