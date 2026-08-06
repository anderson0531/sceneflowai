import { readFileSync } from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.fn()

vi.mock('@/models', () => ({
  sequelize: {
    query: (...args: unknown[]) => query(...args),
  },
}))

import { hasColumns, hasTables } from '@/lib/database/schemaProbe'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

/**
 * The probe exists to keep idempotent DDL off the request path. Cold starts reset
 * the module guards on the lazy migrations, so a user request was paying for
 * roughly twenty sequential ALTERs that had nothing left to do.
 */
describe('hasColumns', () => {
  beforeEach(() => query.mockReset())

  it('is true when every column is present', async () => {
    query.mockResolvedValue([{ column_name: 'a' }, { column_name: 'b' }])
    expect(await hasColumns('users', ['a', 'b'])).toBe(true)
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('is false when one is missing, so the migration still runs', async () => {
    query.mockResolvedValue([{ column_name: 'a' }])
    expect(await hasColumns('users', ['a', 'b'])).toBe(false)
  })

  it('answers in a single round trip regardless of column count', async () => {
    query.mockResolvedValue([])
    await hasColumns('users', ['a', 'b', 'c', 'd', 'e'])
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('falls back to running the migration when the probe fails', async () => {
    // An unexpected driver result stands in for any probe failure: the point is
    // that a broken probe must not be read as "column present".
    query.mockResolvedValue(undefined)
    expect(await hasColumns('users', ['a'])).toBe(false)
  })

  it('needs no query for an empty list', async () => {
    expect(await hasColumns('users', [])).toBe(true)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('hasTables', () => {
  beforeEach(() => query.mockReset())

  it('is true only when every table exists', async () => {
    query.mockResolvedValue([{ table_name: 'generation_jobs' }])
    expect(await hasTables(['generation_jobs'])).toBe(true)
    expect(await hasTables(['generation_jobs', 'notifications'])).toBe(false)
  })

  it('falls back to running the migration when the probe fails', async () => {
    query.mockResolvedValue(undefined)
    expect(await hasTables(['generation_jobs'])).toBe(false)
  })
})

describe('the lazy migrations probe before issuing DDL', () => {
  it('users subscription columns short-circuit when present', () => {
    const source = readSource('src/lib/database/migrateUsersSubscription.ts')
    expect(source).toContain('hasColumns')
    const probeAt = source.indexOf("hasColumns('users'")
    const alterAt = source.indexOf('ALTER TABLE users')
    expect(probeAt).toBeGreaterThan(-1)
    expect(probeAt).toBeLessThan(alterAt)
  })

  it('credit ledger short-circuits when the column is present', () => {
    const source = readSource('src/lib/database/migrateCreditLedger.ts')
    const probeAt = source.indexOf("hasColumns('credit_ledger'")
    const alterAt = source.indexOf('ALTER TABLE credit_ledger')
    expect(probeAt).toBeGreaterThan(-1)
    expect(probeAt).toBeLessThan(alterAt)
  })

  it('job tables short-circuit when both exist', () => {
    const source = readSource('src/lib/jobs/jobService.ts')
    const probeAt = source.indexOf("hasTables(['generation_jobs', 'notifications'])")
    const createAt = source.indexOf('CREATE TABLE IF NOT EXISTS generation_jobs')
    expect(probeAt).toBeGreaterThan(-1)
    expect(probeAt).toBeLessThan(createAt)
    // The guard has to be set on the skip path too, or every call re-probes.
    const body = source.slice(probeAt, createAt)
    expect(body).toContain('notificationsSchemaCompleted = true')
  })
})
