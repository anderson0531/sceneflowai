/**
 * Deep-merge visionPhase.references so a stale PUT cannot wipe library rows,
 * unless the writer dropped object ids or replaced the object list.
 *
 * Dropped object ids are stored as tombstones on the references slice so a
 * later PUT of the new catalog cannot resurrect the previous rows.
 */

export type VisionPhaseReferenceRow = {
  id?: string
  imageUrl?: string
  [key: string]: unknown
}

export type VisionPhaseReferencesSlice = {
  sceneReferences?: VisionPhaseReferenceRow[]
  objectReferences?: VisionPhaseReferenceRow[]
  locationReferences?: VisionPhaseReferenceRow[]
  objectDuplicateIgnores?: string[]
  droppedObjectReferenceIds?: string[]
  /**
   * PUT-only: incoming objectReferences is the full library. Omitted ids are
   * tombstoned even when the client no longer remembers them.
   */
  replaceObjectReferences?: boolean
}

export type PickPersistedImageUrl = (incoming: unknown, existing: unknown) => string | undefined

function asRows(value: unknown): VisionPhaseReferenceRow[] {
  return Array.isArray(value) ? (value as VisionPhaseReferenceRow[]) : []
}

export function uniqueReferenceIds(ids: Iterable<string> | undefined): string[] {
  return [...new Set([...(ids ?? [])].map(String).filter(Boolean))].sort()
}

export function mergeDroppedObjectReferenceIds(
  existing: Iterable<string> | undefined,
  incoming: Iterable<string> | undefined,
  extra?: Iterable<string>
): string[] {
  return uniqueReferenceIds([...(existing ?? []), ...(incoming ?? []), ...(extra ?? [])])
}

function mergeRowList(
  existing: VisionPhaseReferenceRow[],
  incoming: VisionPhaseReferenceRow[],
  pickImageUrl: PickPersistedImageUrl,
  droppedIds?: Iterable<string>
): VisionPhaseReferenceRow[] {
  const dropped = new Set(uniqueReferenceIds(droppedIds))
  const existingById = new Map(
    existing.filter((row) => row?.id).map((row) => [row.id as string, row])
  )
  let merged = incoming
    .filter((row) => !row?.id || !dropped.has(String(row.id)))
    .map((incomingRef) => {
      const existingRef = incomingRef?.id ? existingById.get(incomingRef.id) : undefined
      if (!existingRef) return incomingRef
      return {
        ...existingRef,
        ...incomingRef,
        imageUrl: pickImageUrl(incomingRef.imageUrl, existingRef.imageUrl),
      }
    })

  const incomingIds = new Set(incoming.map((row) => row?.id).filter(Boolean) as string[])
  const preserved = existing.filter(
    (row) => row?.id && !incomingIds.has(row.id) && !dropped.has(String(row.id))
  )
  if (preserved.length > 0) {
    merged = [...merged, ...preserved]
  }
  return merged
}

/** Ids present on the previous library list but missing from the next one. */
export function droppedReferenceIds(
  previous: Array<{ id?: string }> | undefined,
  next: Array<{ id?: string }> | undefined
): string[] {
  const nextIds = new Set(
    (next ?? []).map((row) => String(row?.id ?? '')).filter(Boolean)
  )
  return uniqueReferenceIds(
    (previous ?? [])
      .map((row) => String(row?.id ?? ''))
      .filter((id) => id && !nextIds.has(id))
  )
}

/**
 * PUT payload for visionPhase.references, including drop ids when the object
 * library shrank so the server merge cannot resurrect omitted rows.
 */
export function visionReferencesPutPayload(args: {
  sceneReferences: VisionPhaseReferenceRow[]
  objectReferences: VisionPhaseReferenceRow[]
  locationReferences: VisionPhaseReferenceRow[]
  objectDuplicateIgnores?: string[]
  previousObjectReferences?: Array<{ id?: string }>
  extraDroppedIds?: string[]
  previousDroppedObjectReferenceIds?: string[]
  replaceObjectReferences?: boolean
}): VisionPhaseReferencesSlice {
  const dropped = mergeDroppedObjectReferenceIds(
    args.previousDroppedObjectReferenceIds,
    droppedReferenceIds(args.previousObjectReferences, args.objectReferences),
    args.extraDroppedIds
  )
  return {
    sceneReferences: args.sceneReferences,
    objectReferences: args.objectReferences,
    locationReferences: args.locationReferences,
    ...(Array.isArray(args.objectDuplicateIgnores)
      ? { objectDuplicateIgnores: args.objectDuplicateIgnores }
      : {}),
    ...(dropped.length > 0 ? { droppedObjectReferenceIds: dropped } : {}),
    ...(args.replaceObjectReferences ? { replaceObjectReferences: true } : {}),
  }
}

export function mergeVisionPhaseReferences(
  existing: VisionPhaseReferencesSlice | undefined,
  incoming: VisionPhaseReferencesSlice | undefined,
  pickImageUrl: PickPersistedImageUrl
): VisionPhaseReferencesSlice {
  const existingSlice = existing || {}
  const incomingSlice = incoming || {}
  const nextIgnores = Array.isArray(incomingSlice.objectDuplicateIgnores)
    ? incomingSlice.objectDuplicateIgnores
    : existingSlice.objectDuplicateIgnores

  const existingObjectRefs = asRows(existingSlice.objectReferences)
  const incomingObjectRefs = asRows(incomingSlice.objectReferences)
  const incomingObjectIds = new Set(
    incomingObjectRefs.map((row) => row?.id).filter(Boolean) as string[]
  )
  const omittedWhenReplace = incomingSlice.replaceObjectReferences
    ? existingObjectRefs
        .map((row) => String(row?.id ?? ''))
        .filter((id) => id && !incomingObjectIds.has(id))
    : []
  const tombstones = mergeDroppedObjectReferenceIds(
    existingSlice.droppedObjectReferenceIds,
    incomingSlice.droppedObjectReferenceIds,
    omittedWhenReplace
  )

  return {
    sceneReferences: mergeRowList(
      asRows(existingSlice.sceneReferences),
      asRows(incomingSlice.sceneReferences),
      pickImageUrl
    ),
    objectReferences: mergeRowList(
      existingObjectRefs,
      incomingObjectRefs,
      pickImageUrl,
      tombstones
    ),
    locationReferences: mergeRowList(
      asRows(existingSlice.locationReferences),
      asRows(incomingSlice.locationReferences),
      pickImageUrl
    ),
    ...(Array.isArray(nextIgnores) ? { objectDuplicateIgnores: nextIgnores } : {}),
    ...(tombstones.length > 0 ? { droppedObjectReferenceIds: tombstones } : {}),
  }
}
