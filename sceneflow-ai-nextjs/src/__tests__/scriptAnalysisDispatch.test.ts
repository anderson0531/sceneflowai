import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  STEP_LEASE_MS,
  isStepLeaseHeld,
  readWorkerState,
  writeWorkerState,
  type ScriptAnalysisWorkerState,
} from '@/lib/jobs/scriptAnalysisWorkerState'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

const WORKER_ROUTE = 'src/app/api/internal/jobs/script-analysis/step/route.ts'
const CLIENT_STEP_ROUTE = 'src/app/api/vision/review-script/step/route.ts'
const DISPATCH = 'src/lib/jobs/dispatchScriptAnalysisStep.ts'

function maxDurationOf(relativePath: string): number {
  const match = readSource(relativePath).match(/export const maxDuration = (\d+)/)
  expect(match, `${relativePath} declares maxDuration`).toBeTruthy()
  return Number(match![1])
}

describe('script analysis worker acknowledges a step before running it', () => {
  const route = readSource(WORKER_ROUTE)

  it('responds 202 rather than waiting for the phase', () => {
    expect(route).toContain('status: 202')
    const handlerStart = route.indexOf('export async function POST')
    const afterStart = route.indexOf('after(async () =>')
    const responseAt = route.indexOf('accepted: true')
    expect(afterStart).toBeGreaterThan(handlerStart)
    expect(responseAt).toBeGreaterThan(afterStart)
  })

  it('runs the phase inside after(), not inline', () => {
    const afterStart = route.indexOf('after(async () =>')
    const runAt = route.indexOf('runScriptAnalysisStep(')
    expect(afterStart).toBeGreaterThan(-1)
    expect(runAt).toBeGreaterThan(afterStart)
  })

  it('chains the next hop by awaiting the dispatch directly', () => {
    expect(route).toContain('await postScriptAnalysisStep(')
    expect(route).not.toMatch(/^import .*scheduleScriptAnalysisStep.*$/m)
    expect(route).not.toMatch(/scheduleScriptAnalysisStep\s*\(/)
  })

  it('logs a failure nobody is awaiting', () => {
    expect(route).toContain('console.error')
  })
})

describe('script analysis start route stays a queue-and-return', () => {
  const start = readSource('src/app/api/vision/review-script/start/route.ts')

  it('schedules the first step without awaiting the job', () => {
    expect(start).toContain('scheduleScriptAnalysisStep(job.id)')
    expect(start).not.toContain('await runScriptAnalysisStep')
  })

  it('answers 202 so the client polls for the result', () => {
    expect(start).toContain('status: 202')
  })
})

describe('script analysis dispatch waits on a handshake, not on a phase', () => {
  const dispatch = readSource(DISPATCH)

  it('still awaits the fetch so the request is not dropped', () => {
    expect(dispatch).toContain('await fetch(')
    expect(dispatch).toContain('after(() => postScriptAnalysisStep(jobId))')
  })

  it('records why awaiting the phase would be wrong', () => {
    expect(dispatch).toContain('handshake')
  })
})

describe('script analysis step lease outlives the worker invocation', () => {
  it('exceeds the internal worker maxDuration', () => {
    const workerSeconds = maxDurationOf(WORKER_ROUTE)
    expect(STEP_LEASE_MS).toBeGreaterThan(workerSeconds * 1000)
  })

  it('exceeds the client-driven step maxDuration', () => {
    const stepSeconds = maxDurationOf(CLIENT_STEP_ROUTE)
    expect(STEP_LEASE_MS).toBeGreaterThan(stepSeconds * 1000)
  })

  it('is declared in vercel.json for the step route', () => {
    const vercel = readSource('vercel.json')
    expect(vercel).toContain('src/app/api/internal/jobs/script-analysis/step/route.ts')
    expect(vercel).toContain('src/app/api/vision/review-script/step/route.ts')
  })
})

describe('script analysis client ticks survive Vercel 508 self-fetch', () => {
  it('exposes a session-authenticated step route like guided-revise', () => {
    const route = readSource(CLIENT_STEP_ROUTE)
    expect(route).toContain('getSessionUserId')
    expect(route).toContain('runScriptAnalysisStep(')
    expect(route).toContain('maxDuration = 120')
  })

  it('vision page advances the job from the browser while active', () => {
    const visionPage = readSource(
      'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
    )
    expect(visionPage).toContain("/api/vision/review-script/step")
    expect(visionPage).toContain('508')
  })

  it('logs 508 body so recursion protection is diagnosable', () => {
    const dispatch = readSource(DISPATCH)
    expect(dispatch).toContain('Step dispatch returned')
    expect(dispatch).toContain('recursion protection')
  })
})

describe('script analysis worker state helpers', () => {
  const base: ScriptAnalysisWorkerState = {
    phase: 'scenes',
    chunkIndex: 0,
    sceneAnalysis: [],
    inFlightAt: null,
  }

  it('round-trips through payload._worker', () => {
    const payload = writeWorkerState({}, base)
    expect(readWorkerState(payload)).toEqual(base)
  })

  it('treats a fresh lease as held and an expired one as free', () => {
    const held = { ...base, inFlightAt: new Date().toISOString() }
    expect(isStepLeaseHeld(held)).toBe(true)

    const expired = {
      ...base,
      inFlightAt: new Date(Date.now() - STEP_LEASE_MS - 1).toISOString(),
    }
    expect(isStepLeaseHeld(expired)).toBe(false)
  })
})
