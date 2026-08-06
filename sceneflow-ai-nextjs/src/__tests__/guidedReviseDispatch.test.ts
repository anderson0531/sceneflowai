import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { STEP_LEASE_MS } from '@/lib/jobs/blueprintGuidedReviseWorkerState'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

const WORKER_ROUTE = 'src/app/api/internal/jobs/blueprint-guided-revise/step/route.ts'
const CLIENT_STEP_ROUTE = 'src/app/api/treatment/guided-revise/step/route.ts'
const DISPATCH = 'src/lib/jobs/dispatchBlueprintGuidedReviseStep.ts'

function maxDurationOf(relativePath: string): number {
  const match = readSource(relativePath).match(/export const maxDuration = (\d+)/)
  expect(match, `${relativePath} declares maxDuration`).toBeTruthy()
  return Number(match![1])
}

/**
 * The timeout these guard was not a slow step; it was nested lifetimes. Each step
 * awaited the next step's full response, and `after()` keeps a function alive
 * until its callback settles, so every function in the chain stayed open until
 * the last one finished and the 60s start route died first.
 */
describe('the worker acknowledges a step before running it', () => {
  const route = readSource(WORKER_ROUTE)

  it('responds 202 rather than waiting for the phase', () => {
    expect(route).toContain('status: 202')
    // The phase must not be awaited in the handler body, only inside after().
    const handlerStart = route.indexOf('export async function POST')
    const afterStart = route.indexOf('after(async () =>')
    const responseAt = route.indexOf('accepted: true')
    expect(afterStart).toBeGreaterThan(handlerStart)
    expect(responseAt).toBeGreaterThan(afterStart)
  })

  it('runs the phase inside after(), not inline', () => {
    const afterStart = route.indexOf('after(async () =>')
    const runAt = route.indexOf('runBlueprintGuidedReviseStep(')
    expect(afterStart).toBeGreaterThan(-1)
    expect(runAt).toBeGreaterThan(afterStart)
  })

  it('chains the next hop by awaiting the dispatch directly', () => {
    // scheduleBlueprintGuidedReviseStep would nest another after() inside this
    // one, which is the shape that chained the lifetimes together. Checked as
    // an import and a call, since the route names it in prose to explain why.
    expect(route).toContain('await postBlueprintGuidedReviseStep(')
    expect(route).not.toMatch(/^import .*scheduleBlueprintGuidedReviseStep.*$/m)
    expect(route).not.toMatch(/scheduleBlueprintGuidedReviseStep\s*\(/)
  })

  it('logs a failure nobody is awaiting', () => {
    expect(route).toContain('console.error')
  })
})

describe('the start route stays a queue-and-return', () => {
  const start = readSource('src/app/api/treatment/guided-revise/start/route.ts')

  it('schedules the first step without awaiting the job', () => {
    expect(start).toContain('scheduleBlueprintGuidedReviseStep(job.id)')
    expect(start).not.toContain('await runBlueprintGuidedReviseStep')
  })

  it('answers 202 so the client polls for the result', () => {
    expect(start).toContain('status: 202')
  })
})

describe('dispatch waits on a handshake, not on a phase', () => {
  const dispatch = readSource(DISPATCH)

  it('still awaits the fetch so the request is not dropped', () => {
    expect(dispatch).toContain('await fetch(')
    expect(dispatch).toContain('after(() => postBlueprintGuidedReviseStep(jobId))')
  })

  it('records why awaiting the phase would be wrong', () => {
    expect(dispatch).toContain('handshake')
  })
})

/**
 * The lease exists so a step claimed by one invocation is not re-run by another.
 * It only works while it outlives the invocation holding it, so the two numbers
 * have to move together.
 */
describe('the step lease outlives the worker invocation', () => {
  it('exceeds the internal worker maxDuration', () => {
    const workerSeconds = maxDurationOf(WORKER_ROUTE)
    expect(STEP_LEASE_MS).toBeGreaterThan(workerSeconds * 1000)
  })

  it('exceeds the client-driven step maxDuration', () => {
    const stepSeconds = maxDurationOf(CLIENT_STEP_ROUTE)
    expect(STEP_LEASE_MS).toBeGreaterThan(stepSeconds * 1000)
  })
})
