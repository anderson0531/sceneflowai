/**
 * Direction prompts need the beat timeline. Clients often send only
 * heading/action/dialogue, which made the director invent a short shot list
 * against an empty beat count. Prefer a non-empty list from the request, then
 * the scene already stored on the project.
 */
export function mergeSceneForDirection(
  dbScene: Record<string, unknown> | null | undefined,
  requestScene: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const db = dbScene && typeof dbScene === 'object' ? dbScene : {}
  const req = requestScene && typeof requestScene === 'object' ? requestScene : {}

  const preferList = (key: string): unknown => {
    const fromReq = req[key]
    if (Array.isArray(fromReq) && fromReq.length > 0) return fromReq
    const fromDb = db[key]
    if (Array.isArray(fromDb) && fromDb.length > 0) return fromDb
    return fromReq ?? fromDb
  }

  return {
    ...db,
    ...req,
    beats: preferList('beats'),
    sceneMovements: preferList('sceneMovements'),
    dialogue: preferList('dialogue'),
    characters: preferList('characters'),
  }
}
