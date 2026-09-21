import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  POLISH_STEP_LEASE_MS,
  isPolishStepLeaseHeld,
  readPolishWorkerState,
  writePolishWorkerState,
  type ScenePolishWorkerState,
} from '@/lib/jobs/scenePolishWorkerState'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

const WORKER_ROUTE = 'src/app/api/internal/jobs/scene-polish/step/route.ts'
const CLIENT_STEP_ROUTE = 'src/app/api/vision/polish-scene/step/route.ts'
const DISPATCH = 'src/lib/jobs/dispatchScenePolishStep.ts'
const START = 'src/app/api/vision/polish-scene/start/route.ts'

function maxDurationOf(relativePath: string): number {
  const match = readSource(relativePath).match(/export const maxDuration = (\d+)/)
  expect(match, `${relativePath} declares maxDuration`).toBeTruthy()
  return Number(match![1])
}

describe('scene polish worker acknowledges a step before running it', () => {
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
    const runAt = route.indexOf('runScenePolishStep(')
    expect(afterStart).toBeGreaterThan(-1)
    expect(runAt).toBeGreaterThan(afterStart)
  })

  it('does not self-fetch the next hop (Vercel 508 INFINITE_LOOP_DETECTED)', () => {
    expect(route).not.toMatch(/await postScenePolishStep\s*\(/)
    expect(route).toContain('INFINITE_LOOP_DETECTED')
    expect(route).toContain('/api/vision/polish-scene/step')
  })
})

describe('scene polish start route stays a queue-and-return', () => {
  const start = readSource(START)

  it('schedules the first step without awaiting the job', () => {
    expect(start).toContain('scheduleScenePolishStep(job.id)')
    expect(start).not.toContain('await runScenePolishStep')
  })

  it('answers 202 so the client polls for the result', () => {
    expect(start).toContain('status: 202')
  })
})

describe('scene polish dispatch waits on a handshake, not on a phase', () => {
  const dispatch = readSource(DISPATCH)

  it('still awaits the fetch so the request is not dropped', () => {
    expect(dispatch).toContain('await fetch(')
    expect(dispatch).toContain('after(() => postScenePolishStep(jobId))')
  })

  it('records why awaiting the phase would be wrong', () => {
    expect(dispatch).toContain('handshake')
  })
})

describe('scene polish step lease outlives the worker invocation', () => {
  it('exceeds the internal worker maxDuration', () => {
    const workerSeconds = maxDurationOf(WORKER_ROUTE)
    expect(POLISH_STEP_LEASE_MS).toBeGreaterThan(workerSeconds * 1000)
  })

  it('exceeds the client-driven step maxDuration', () => {
    const stepSeconds = maxDurationOf(CLIENT_STEP_ROUTE)
    expect(POLISH_STEP_LEASE_MS).toBeGreaterThan(stepSeconds * 1000)
  })

  it('is declared in vercel.json for the step route', () => {
    const vercel = readSource('vercel.json')
    expect(vercel).toContain('src/app/api/internal/jobs/scene-polish/step/route.ts')
    expect(vercel).toContain('src/app/api/vision/polish-scene/step/route.ts')
  })
})

describe('scene polish client ticks survive Vercel 508 self-fetch', () => {
  it('exposes a session-authenticated step route', () => {
    const route = readSource(CLIENT_STEP_ROUTE)
    expect(route).toContain('getSessionUserId')
    expect(route).toContain('runScenePolishStep(')
    expect(route).toContain('maxDuration = 180')
  })

  it('vision page advances the job from the browser while active', () => {
    const visionPage = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(visionPage).toContain('/api/vision/polish-scene/step')
    expect(visionPage).toContain("jobType: 'scene_polish'")
  })
})

describe('scene polish worker state helpers', () => {
  const base: ScenePolishWorkerState = {
    phase: 'analyze',
    inFlightAt: null,
  }

  it('round-trips through payload._worker', () => {
    const payload = writePolishWorkerState({}, base)
    expect(readPolishWorkerState(payload)).toEqual(base)
  })

  it('treats a fresh lease as held and an expired one as free', () => {
    const held = { ...base, inFlightAt: new Date().toISOString() }
    expect(isPolishStepLeaseHeld(held)).toBe(true)

    const expired = {
      ...base,
      inFlightAt: new Date(Date.now() - POLISH_STEP_LEASE_MS - 1).toISOString(),
    }
    expect(isPolishStepLeaseHeld(expired)).toBe(false)
  })
})

describe('scene polish job type is registered', () => {
  it('registers scene_polish and delegates Inngest', () => {
    expect(readSource('src/models/GenerationJob.ts')).toContain("'scene_polish'")
    const worker = readSource('src/inngest/functions.ts')
    expect(worker).toContain('process-scene-polish')
    expect(worker).toContain('processScenePolish')
    expect(worker).toMatch(/inngestFunctions\s*=\s*\[[\s\S]*processScenePolish/)
    expect(worker).toContain('delegated: \'process-scene-polish\'')
  })
})
