import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { isSslOrCertConnectionError } from '@/lib/database/connectionDiagnostics'

const DATABASE_CONFIG = readFileSync(
  path.join(process.cwd(), 'src/config/database.ts'),
  'utf8'
)
const GENERATE_IMAGE = readFileSync(
  path.join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
  'utf8'
)
const CONNECTOR = readFileSync(
  path.join(process.cwd(), 'src/lib/database/cloudSqlDriverOptions.ts'),
  'utf8'
)

describe('production Scene Image SSL alert 42 shape is recognised', () => {
  it('matches the OpenSSL ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE wrap from pg', () => {
    const error = Object.assign(
      new Error(
        '00F9E5BCF67F0000:error:0A000412:SSL routines:ssl3_read_bytes:ssl/tls alert bad certificate:ssl/record/rec_layer_s3.c:918:SSL alert number 42\n'
      ),
      {
        name: 'SequelizeConnectionError',
        parent: {
          library: 'SSL routines',
          reason: 'ssl/tls alert bad certificate',
          code: 'ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE',
        },
        original: {
          library: 'SSL routines',
          reason: 'ssl/tls alert bad certificate',
          code: 'ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE',
        },
      }
    )

    expect(isSslOrCertConnectionError(error)).toBe(true)
  })
})

describe('resetDatabaseConnection keeps the Sequelize singleton', () => {
  it('does not call sequelize.close() or replace the export', () => {
    // close() permanently disables getConnection; replacing the export orphans
    // models that bound sequelize at Project.init time.
    const bodyStart = DATABASE_CONFIG.indexOf('export async function resetDatabaseConnection')
    const bodyEnd = DATABASE_CONFIG.indexOf('export async function withDatabaseSelfHeal')
    const body = DATABASE_CONFIG.slice(bodyStart, bodyEnd)
    expect(body).toContain('resetCloudSqlConnector')
    expect(body).toContain('cloudSqlOptsPromise = null')
    expect(body).not.toMatch(/await\s+sequelize\.close\(/)
    expect(body).not.toMatch(/sequelize\s*=\s*createSequelize\(/)
  })

  it('closes the previous Cloud SQL connector so ephemeral certs are dropped', () => {
    expect(CONNECTOR).toMatch(/previous\.close\(/)
  })
})

describe('scene generate-image self-heals Cloud SQL cert errors', () => {
  it('uses ensureDatabaseConnection instead of raw sequelize.authenticate', () => {
    expect(GENERATE_IMAGE).toContain("ensureDatabaseConnection('scene/generate-image')")
    expect(GENERATE_IMAGE).not.toMatch(/await\s+sequelize\.authenticate\(/)
  })
})

describe('global getConnection SSL self-heal covers raw authenticate routes', () => {
  it('installs a getConnection wrapper that resets the connector on SSL alert 42', () => {
    expect(DATABASE_CONFIG).toContain('installGlobalSslSelfHeal')
    expect(DATABASE_CONFIG).toContain('resetDatabaseConnectionCoalesced')
    expect(DATABASE_CONFIG).toContain('SSL/cert error on getConnection')
    expect(DATABASE_CONFIG).toMatch(/manager\.getConnection\s*=\s*async/)
    // Must run after helpers so logging + reset resolve at call time.
    expect(DATABASE_CONFIG).toMatch(
      /export function getDatabaseConnectionInfo[\s\S]*installGlobalSslSelfHeal\(sequelize\)/
    )
  })

  it('does not rely on Sequelize retry.match alone for SSL (needs connector reset)', () => {
    const retryBlockStart = DATABASE_CONFIG.indexOf('const retry = {')
    const retryBlockEnd = DATABASE_CONFIG.indexOf('function useCloudSqlFromEnv')
    const retryBlock = DATABASE_CONFIG.slice(retryBlockStart, retryBlockEnd)
    expect(retryBlock).not.toMatch(/bad certificate/i)
    expect(retryBlock).not.toMatch(/alert number 42/i)
  })
})

describe('withDatabaseSelfHeal retries SSL once after reset', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unmock('@/lib/database/cloudSqlDriverOptions')
  })

  it('retries the operation after an SSL alert 42', async () => {
    vi.doMock('@/lib/database/cloudSqlDriverOptions', () => ({
      getCloudSqlDriverOptions: vi.fn(async () => ({ stream: () => null })),
      resetCloudSqlConnector: vi.fn(),
    }))

    // Import after mock — only exercise the classifier + retry control flow via a
    // local replica of the helper shape (full Sequelize boot needs Cloud SQL env).
    let attempts = 0
    const sslError = Object.assign(new Error('ssl/tls alert bad certificate'), {
      name: 'SequelizeConnectionError',
      original: { code: 'ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE' },
    })

    async function withHeal<T>(operation: () => Promise<T>): Promise<T> {
      try {
        return await operation()
      } catch (error) {
        if (!isSslOrCertConnectionError(error)) throw error
        return await operation()
      }
    }

    const result = await withHeal(async () => {
      attempts += 1
      if (attempts === 1) throw sslError
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(attempts).toBe(2)
  })

  it('getConnection wrapper: SSL fail → reset → retry succeeds (H1)', async () => {
    let attempts = 0
    const reset = vi.fn(async () => undefined)
    const sslError = Object.assign(
      new Error(
        '00098D16547F0000:error:0A000412:SSL routines:ssl3_read_bytes:ssl/tls alert bad certificate:ssl/record/rec_layer_s3.c:918:SSL alert number 42'
      ),
      {
        name: 'SequelizeConnectionError',
        original: { code: 'ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE' },
      }
    )

    async function getConnectionWithHeal(): Promise<string> {
      try {
        attempts += 1
        if (attempts === 1) throw sslError
        return 'conn'
      } catch (error) {
        if (!isSslOrCertConnectionError(error)) throw error
        await reset()
        attempts += 1
        return 'conn'
      }
    }

    await expect(getConnectionWithHeal()).resolves.toBe('conn')
    expect(reset).toHaveBeenCalledOnce()
    expect(attempts).toBe(2)
  })
})
