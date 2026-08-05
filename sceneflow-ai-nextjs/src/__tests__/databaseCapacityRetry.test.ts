import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  isTransientConnectionCapacityError,
  isSslOrCertConnectionError,
} from '@/lib/database/connectionDiagnostics'

const CONFIG = readFileSync(
  path.join(process.cwd(), 'src/config/database.ts'),
  'utf8'
)

describe('connection-capacity errors are recognised', () => {
  // Wording differs by server version, and pg's own pool phrases it differently
  // again. Production reported the first of these.
  it.each([
    'remaining connection slots are reserved for non-replication superuser connections',
    'remaining connection slots are reserved for roles with the SUPERUSER attribute',
    'sorry, too many clients already',
    'FATAL: too many connections for role "sceneflow_app"',
  ])('matches %s', (message) => {
    expect(isTransientConnectionCapacityError(new Error(message))).toBe(true)
  })

  it('matches the SQLSTATE even when the message is unfamiliar', () => {
    expect(
      isTransientConnectionCapacityError(Object.assign(new Error('nope'), { code: '53300' }))
    ).toBe(true)
  })

  it('reads the code off a wrapped Sequelize error', () => {
    const wrapped = Object.assign(new Error('SequelizeConnectionError'), {
      original: { code: '53300' },
    })
    expect(isTransientConnectionCapacityError(wrapped)).toBe(true)
  })

  it('leaves unrelated failures alone, so they are not retried', () => {
    expect(isTransientConnectionCapacityError(new Error('syntax error at or near'))).toBe(false)
    expect(isTransientConnectionCapacityError(new Error('bad_certificate'))).toBe(false)
  })

  it('stays distinct from the SSL classifier, which resets the connector', () => {
    const capacity = new Error('remaining connection slots are reserved')
    expect(isTransientConnectionCapacityError(capacity)).toBe(true)
    // Resetting the pool would throw away healthy connections for no reason.
    expect(isSslOrCertConnectionError(capacity)).toBe(false)
  })
})

describe('pool is sized for serverless', () => {
  it('defaults to one, because a frozen instance holds its sockets open', () => {
    expect(CONFIG).toMatch(/function poolMaxFromEnv[\s\S]*?return 1\n\}/)
    expect(CONFIG).not.toContain('const pool = { max: 5')
  })

  it('is overridable without a code change', () => {
    expect(CONFIG).toContain('DB_POOL_MAX')
  })

  it('reaps idle connections so warm instances stop holding slots', () => {
    expect(CONFIG).toContain('evict:')
  })
})

describe('retry is configured on Sequelize, not at call sites', () => {
  // ~72 routes call sequelize.authenticate() and the models directly, so a
  // wrapper helper would reach none of them.
  it('every Sequelize instance gets the retry config', () => {
    const instances = CONFIG.match(/new Sequelize\(/g) ?? []
    const attached = CONFIG.match(/^\s*retry,$/gm) ?? []
    expect(instances.length).toBeGreaterThan(0)
    expect(attached.length).toBe(instances.length)
  })

  it('matches the capacity wording rather than retrying everything', () => {
    expect(CONFIG).toMatch(/remaining connection slots are reserved/i)
    expect(CONFIG).toMatch(/too many clients already/i)
  })

  it('backs off within the acquire timeout', () => {
    const max = Number(CONFIG.match(/max: (\d+),\n\s*backoffBase/)?.[1])
    const base = Number(CONFIG.match(/backoffBase: (\d+)/)?.[1])
    const exponent = Number(CONFIG.match(/backoffExponent: ([\d.]+)/)?.[1])
    let total = 0
    for (let i = 0; i < max; i++) total += base * exponent ** i
    expect(total).toBeLessThan(60000)
  })
})
