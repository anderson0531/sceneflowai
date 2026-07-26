/**
 * Records when a Gemini text request did not run on the model that was asked
 * for. A stale model id used to degrade silently to gemini-2.5-flash behind a
 * single console.warn, which made "the AI feels weaker than it should" almost
 * impossible to diagnose.
 */

export type ModelDowngradeReason = 'model_not_found' | 'quota_exhausted'

export type ModelDowngradeEvent = {
  requestedModel: string
  resolvedModel: string
  reason: ModelDowngradeReason
  httpStatus?: number
  at: string
}

const MAX_EVENTS = 50
const events: ModelDowngradeEvent[] = []

export function recordModelDowngrade(input: {
  requestedModel: string
  resolvedModel: string
  reason: ModelDowngradeReason
  httpStatus?: number
}): void {
  const event: ModelDowngradeEvent = { ...input, at: new Date().toISOString() }

  events.unshift(event)
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS

  // console.error rather than warn: a downgrade silently changes output quality
  // and should surface in error dashboards, not scroll past in info logs.
  console.error(
    '[Vertex Gemini] MODEL DOWNGRADE',
    JSON.stringify({
      requested: event.requestedModel,
      resolved: event.resolvedModel,
      reason: event.reason,
      status: event.httpStatus,
    })
  )
}

/** Most recent downgrades, newest first. Process-local and best-effort. */
export function getRecentModelDowngrades(): ModelDowngradeEvent[] {
  return [...events]
}
