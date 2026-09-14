/**
 * Rebuild a script PUT immediately before it goes on the wire.
 *
 * `handleScriptChange` stamps `scriptUpdatedAt` when the save is enqueued.
 * If that PUT waits behind another write, a 20s-old snapshot + timestamp is
 * what the timestamp guard sees. Replacing the script from the live ref and
 * minting a fresh timestamp at send time is what keeps a dialogue edit from
 * looking stale.
 */

export type RefreshQueuedScriptPutOptions = {
  liveScript?: unknown
  nowIso?: string
  /** Replace `visionPhase.script` with `liveScript`. Default: true when liveScript is set. */
  replaceScript?: boolean
}

type VisionPhaseBody = {
  metadata?: {
    visionPhase?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function isScriptWriterPut(body: unknown): body is VisionPhaseBody {
  if (!body || typeof body !== 'object') return false
  const metadata = (body as VisionPhaseBody).metadata
  const vision = metadata?.visionPhase
  if (!vision || typeof vision !== 'object') return false
  if (!('script' in vision) || vision.script == null) return false
  if (!('scriptUpdatedAt' in vision)) return false
  return true
}

export function refreshQueuedScriptPut<T extends Record<string, any>>(
  body: T,
  options: RefreshQueuedScriptPutOptions = {}
): T {
  if (!isScriptWriterPut(body)) return body

  const nowIso = options.nowIso ?? new Date().toISOString()
  const replaceScript =
    options.replaceScript !== false && options.liveScript != null
  const vision = body.metadata!.visionPhase as Record<string, unknown>
  const nextVision: Record<string, unknown> = {
    ...vision,
    scriptUpdatedAt: nowIso,
  }

  if (replaceScript) {
    nextVision.script = options.liveScript
  }

  return {
    ...body,
    metadata: {
      ...body.metadata,
      visionPhase: nextVision,
    },
  }
}

export function putResponseIndicatesStaleScriptWrite(
  payload: unknown,
  sentScriptUpdatedAt?: string
): boolean {
  if (!payload || typeof payload !== 'object') return false
  const body = payload as {
    staleScriptWriteBlocked?: unknown
    project?: { metadata?: { visionPhase?: { scriptUpdatedAt?: unknown } } }
  }
  if (body.staleScriptWriteBlocked === true) return true
  if (!sentScriptUpdatedAt) return false
  const serverAt = body.project?.metadata?.visionPhase?.scriptUpdatedAt
  if (typeof serverAt !== 'string') return false
  const sent = new Date(sentScriptUpdatedAt).getTime()
  const server = new Date(serverAt).getTime()
  if (!Number.isFinite(sent) || !Number.isFinite(server)) return false
  return server > sent
}
