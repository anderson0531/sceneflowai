import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const SOURCE = readFileSync(
  path.join(process.cwd(), 'src/lib/credits/projectBudget.ts'),
  'utf8'
)

/**
 * Production Express bursts hit SequelizeConnectionAcquireTimeoutError on the
 * old findByPk + save path when void-fired from CreditService under pool max=1.
 * Guards below lock the hardened shape: one UPDATE, retry on acquire timeout.
 */
describe('incrementProjectCreditsUsed is pool-safe under Express concurrency', () => {
  it('uses a single atomic UPDATE instead of findByPk + save', () => {
    expect(SOURCE).toMatch(/UPDATE projects/i)
    expect(SOURCE).toMatch(/jsonb_set/)
    expect(SOURCE).toMatch(/RETURNING \(metadata->>'creditsUsed'\)/i)

    const incrementBodyStart = SOURCE.indexOf('export async function incrementProjectCreditsUsed')
    const incrementBodyEnd = SOURCE.indexOf('export async function setProjectCreditsUsed')
    const incrementBody = SOURCE.slice(incrementBodyStart, incrementBodyEnd)
    expect(incrementBody).not.toContain('Project.findByPk')
    expect(incrementBody).not.toContain('.save()')
  })

  it('retries transient acquire / capacity errors', () => {
    expect(SOURCE).toContain('isConnectionAcquireTimeoutError')
    expect(SOURCE).toContain('isTransientConnectionCapacityError')
    expect(SOURCE).toMatch(/INCREMENT_RETRY_ATTEMPTS\s*=\s*4/)
  })

  it('baselines from the same fallbacks as getProjectCreditsUsed', () => {
    expect(SOURCE).toContain("metadata->>'creditsUsed'")
    expect(SOURCE).toContain("{creationHub,metrics,creditsUsed}")
    expect(SOURCE).toContain('{productionCosts,totalCredits}')
  })
})
