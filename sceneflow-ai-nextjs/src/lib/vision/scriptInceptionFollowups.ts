export interface SceneShotDirectionResult {
  optimized: number
  failed: number
  skipped: number
  requested?: number
  scene?: unknown
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: string }).name
  return name === 'AbortError'
}

export async function requestSceneShotDirection(args: {
  projectId: string
  sceneIndex: number
  /** Rewrite shots that already have user or director stamps. */
  force?: boolean
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}): Promise<SceneShotDirectionResult> {
  const response = await (args.fetchImpl ?? fetch)('/api/vision/direct-scene-shots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: args.projectId,
      sceneIndex: args.sceneIndex,
      ...(args.force ? { force: true } : {}),
    }),
    signal: args.signal,
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    optimized?: number
    failed?: number
    skipped?: number
    requested?: number
    scene?: unknown
  }
  if (!response.ok) throw new Error(data.error || 'Shot direction failed')
  return {
    optimized: data.optimized ?? 0,
    failed: data.failed ?? 0,
    skipped: data.skipped ?? 0,
    requested: data.requested,
    scene: data.scene,
  }
}

export interface ScriptInceptionFollowupResult {
  cancelled: boolean
  sceneDirection: {
    attached: number
    failures: number
    deferred: number
    error?: string
  }
  shotDirection: {
    optimized: number
    failed: number
    scenesCompleted: number
  }
}

async function readSseEvents(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void
): Promise<void> {
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Scene direction failed')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response stream')
  const decoder = new TextDecoder()
  let buffer = ''

  const drain = (final: boolean) => {
    const parts = buffer.split('\n\n')
    buffer = final ? '' : (parts.pop() ?? '')
    const events = final ? parts : parts
    for (const part of events) {
      const line = part
        .split('\n')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith('data:'))
      if (!line) continue
      onEvent(JSON.parse(line.slice(line.indexOf(':') + 1).trim()) as Record<string, unknown>)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      drain(true)
      break
    }
    buffer += decoder.decode(value, { stream: true })
    drain(false)
  }
}

/**
 * After a script is saved: scene direction for every scene, then shot
 * direction one scene at a time. Cancel stops the next scene; the scene
 * already in flight finishes on the server and is persisted there.
 */
export async function runScriptInceptionFollowups(args: {
  projectId: string
  sceneCount: number
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  onSceneDirectionProgress?: (done: number, total: number) => void
  onShotDirectionProgress?: (done: number, total: number) => void
}): Promise<ScriptInceptionFollowupResult> {
  const fetchImpl = args.fetchImpl ?? fetch
  const result: ScriptInceptionFollowupResult = {
    cancelled: args.signal?.aborted === true,
    sceneDirection: { attached: 0, failures: 0, deferred: 0 },
    shotDirection: { optimized: 0, failed: 0, scenesCompleted: 0 },
  }
  if (args.sceneCount <= 0 || args.signal?.aborted) return result

  args.onSceneDirectionProgress?.(0, args.sceneCount)
  try {
    const response = await fetchImpl('/api/vision/attach-scene-directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: args.projectId }),
      signal: args.signal,
    })
    await readSseEvents(response, (event) => {
      if (event.type === 'progress') {
        args.onSceneDirectionProgress?.(
          Number(event.done) || 0,
          Number(event.total) || args.sceneCount
        )
      } else if (event.type === 'complete') {
        result.sceneDirection.attached = Number(event.attached) || 0
        result.sceneDirection.deferred = Number(event.deferred) || 0
        result.sceneDirection.failures = Array.isArray(event.directionFailures)
          ? event.directionFailures.length
          : 0
        if (event.cancelled === true) result.cancelled = true
      } else if (event.type === 'error') {
        result.sceneDirection.error = String(event.error || 'Scene direction failed')
      }
    })
  } catch (error) {
    if (args.signal?.aborted || isAbortError(error)) {
      result.cancelled = true
      return result
    }
    result.sceneDirection.error = error instanceof Error ? error.message : 'Scene direction failed'
  }

  if (result.cancelled || args.signal?.aborted) {
    result.cancelled = true
    return result
  }

  args.onShotDirectionProgress?.(0, args.sceneCount)
  for (let sceneIndex = 0; sceneIndex < args.sceneCount; sceneIndex += 1) {
    if (args.signal?.aborted) {
      result.cancelled = true
      break
    }
    try {
      const directed = await requestSceneShotDirection({
        projectId: args.projectId,
        sceneIndex,
        signal: args.signal,
        fetchImpl,
      })
      result.shotDirection.optimized += directed.optimized
      result.shotDirection.failed += directed.failed
      result.shotDirection.scenesCompleted += 1
      args.onShotDirectionProgress?.(sceneIndex + 1, args.sceneCount)
    } catch (error) {
      if (args.signal?.aborted || isAbortError(error)) {
        result.cancelled = true
        break
      }
      result.shotDirection.failed += 1
      result.shotDirection.scenesCompleted += 1
      args.onShotDirectionProgress?.(sceneIndex + 1, args.sceneCount)
    }
  }

  return result
}
