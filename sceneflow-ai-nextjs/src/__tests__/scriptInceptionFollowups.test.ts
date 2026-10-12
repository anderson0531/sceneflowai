import { describe, expect, it } from 'vitest'
import {
  requestSceneShotDirection,
  runScriptInceptionFollowups,
} from '@/lib/vision/scriptInceptionFollowups'

function sse(events: object[]): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('script inception follow-ups', () => {
  it('runs scene direction, then one shot-direction request per scene', async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = []
    const sceneProgress: number[] = []
    const shotProgress: number[] = []
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url)
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.push({ url: href, body })
      if (href.includes('attach-scene-directions')) {
        return sse([
          { type: 'progress', done: 2, total: 2 },
          { type: 'complete', attached: 2, deferred: 0, directionFailures: [1], cancelled: false },
        ])
      }
      return new Response(
        JSON.stringify({ optimized: 4, failed: 0, skipped: 1, scene: { sceneIndex: body.sceneIndex } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await runScriptInceptionFollowups({
      projectId: 'p1',
      sceneCount: 2,
      fetchImpl: fetchImpl as typeof fetch,
      onSceneDirectionProgress: (done) => sceneProgress.push(done),
      onShotDirectionProgress: (done) => shotProgress.push(done),
    })

    expect(calls.map((call) => call.url)).toEqual([
      '/api/vision/attach-scene-directions',
      '/api/vision/direct-scene-shots',
      '/api/vision/direct-scene-shots',
    ])
    expect(calls[1].body).toEqual({ projectId: 'p1', sceneIndex: 0 })
    expect(calls[2].body).toEqual({ projectId: 'p1', sceneIndex: 1 })
    expect(calls[1].body.force).toBeUndefined()
    expect(result.sceneDirection).toEqual({ attached: 2, failures: 1, deferred: 0 })
    expect(result.shotDirection).toEqual({ optimized: 8, failed: 0, scenesCompleted: 2 })
    expect(result.cancelled).toBe(false)
    expect(sceneProgress).toEqual([0, 2])
    expect(shotProgress).toEqual([0, 1, 2])
  })

  it('stops before the next scene when cancelled', async () => {
    const controller = new AbortController()
    const calls: string[] = []
    const fetchImpl = async (url: string | URL | Request) => {
      const href = String(url)
      calls.push(href)
      if (href.includes('attach-scene-directions')) {
        return sse([{ type: 'complete', attached: 1, deferred: 0, directionFailures: [], cancelled: false }])
      }
      controller.abort()
      throw new DOMException('The operation was aborted', 'AbortError')
    }
    const result = await runScriptInceptionFollowups({
      projectId: 'p1',
      sceneCount: 3,
      signal: controller.signal,
      fetchImpl: fetchImpl as typeof fetch,
    })
    expect(result.cancelled).toBe(true)
    expect(result.shotDirection.scenesCompleted).toBe(0)
    expect(calls.filter((url) => url.includes('direct-scene-shots'))).toHaveLength(1)
  })

  it('sends a forced rewrite for the Shot Direction Agent button', async () => {
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        projectId: 'p1',
        sceneIndex: 4,
        force: true,
      })
      return new Response(JSON.stringify({ optimized: 2, failed: 1, skipped: 0, scene: { ok: true } }))
    }
    const result = await requestSceneShotDirection({
      projectId: 'p1',
      sceneIndex: 4,
      force: true,
      fetchImpl: fetchImpl as typeof fetch,
    })
    expect(result.optimized).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.scene).toEqual({ ok: true })
  })
})
