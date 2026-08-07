import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Production default is DB_POOL_MAX=1. A query issued outside an open transaction
 * while that transaction holds the only slot waits on acquire until the 60s
 * timeout — which is exactly how guided-revise start hung after logging
 * "Auto-running credit_ledger migration..." and never reached after() dispatch.
 */
describe('pool max=1 + nested acquire', () => {
  it('times out when a second checkout is requested while the first is held', async () => {
    let inUse = 0
    const max = 1
    const acquireTimeoutMs = 150

    async function acquire(): Promise<void> {
      const started = Date.now()
      while (inUse >= max) {
        if (Date.now() - started > acquireTimeoutMs) {
          throw new Error('ConnectionAcquireTimeoutError')
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
      inUse += 1
    }

    function release(): void {
      inUse -= 1
    }

    await acquire() // transaction holds the only slot
    await expect(acquire()).rejects.toThrow('ConnectionAcquireTimeoutError')
    release()
    await expect(acquire()).resolves.toBeUndefined()
    release()
  })
})

function methodBody(source: string, methodName: string): string {
  const start = source.indexOf(`static async ${methodName}(`)
  expect(start).toBeGreaterThan(-1)
  const next = source.indexOf('static async ', start + 1)
  return next === -1 ? source.slice(start) : source.slice(start, next)
}

describe('CreditService runs credit_ledger migration before opening a transaction', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/services/CreditService.ts'),
    'utf8'
  )

  for (const methodName of ['charge', 'chargeWithPriority', 'grantCredits'] as const) {
    it(`${methodName} probes/migrates outside the transaction`, () => {
      const body = methodBody(source, methodName)
      const migrateAt = body.indexOf('await ensureCreditLedgerMigrationRan()')
      const txAt = body.indexOf('sequelize.transaction')
      expect(migrateAt).toBeGreaterThan(-1)
      expect(txAt).toBeGreaterThan(-1)
      expect(migrateAt).toBeLessThan(txAt)

      const afterTx = body.slice(txAt)
      expect(afterTx).not.toContain('await ensureCreditLedgerMigrationRan()')
    })
  }
})

describe('CreditService awaits project budget increment (pool max=1 safe)', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/services/CreditService.ts'),
    'utf8'
  )

  for (const methodName of ['charge', 'chargeWithPriority'] as const) {
    it(`${methodName} awaits incrementProjectCreditsUsed instead of void`, () => {
      const body = methodBody(source, methodName)
      expect(body).toContain('await incrementProjectCreditsUsed(')
      expect(body).not.toMatch(/void\s+incrementProjectCreditsUsed\(/)
    })
  }
})
