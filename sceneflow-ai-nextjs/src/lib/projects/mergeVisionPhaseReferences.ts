/**
 * Deep-merge visionPhase.references so a stale PUT cannot wipe library rows,
 * unless the writer explicitly dropped object ids (duplicate merge/delete).
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
}

export type PickPersistedImageUrl = (incoming: unknown, existing: unknown) => string | undefined

function asRows(value: unknown): VisionPhaseReferenceRow[] {
  return Array.isArray(value) ? (value as VisionPhaseReferenceRow[]) : []
}

function mergeRowList(
  existing: VisionPhaseReferenceRow[],
  incoming: VisionPhaseReferenceRow[],
  pickImageUrl: PickPersistedImageUrl,
  droppedIds?: Iterable<string>
): VisionPhaseReferenceRow[] {
  const existingById = new Map(
    existing.filter((row) => row?.id).map((row) => [row.id as string, row])
  )
  let merged = incoming.map((incomingRef) => {
    const existingRef = incomingRef?.id ? existingById.get(incomingRef.id) : undefined
    if (!existingRef) return incomingRef
    return {
      ...existingRef,
      ...incomingRef,
      imageUrl: pickImageUrl(incomingRef.imageUrl, existingRef.imageUrl),
    }
  })

  const incomingIds = new Set(incoming.map((row) => row?.id).filter(Boolean) as string[])
  const dropped = new Set([...(droppedIds ?? [])].map(String).filter(Boolean))
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
  return [
    ...new Set(
      (previous ?? [])
        .map((row) => String(row?.id ?? ''))
        .filter((id) => id && !nextIds.has(id))
    ),
  ]
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
}): VisionPhaseReferencesSlice {
  const dropped = [
    ...droppedReferenceIds(args.previousObjectReferences, args.objectReferences),
    ...(args.extraDroppedIds ?? []),
  ].filter(Boolean)
  return {
    sceneReferences: args.sceneReferences,
    objectReferences: args.objectReferences,
    locationReferences: args.locationReferences,
    ...(Array.isArray(args.objectDuplicateIgnores)
      ? { objectDuplicateIgnores: args.objectDuplicateIgnores }
      : {}),
    ...(dropped.length > 0 ? { droppedObjectReferenceIds: [...new Set(dropped)] } : {}),
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

  return {
    sceneReferences: mergeRowList(
      asRows(existingSlice.sceneReferences),
      asRows(incomingSlice.sceneReferences),
      pickImageUrl
    ),
    objectReferences: mergeRowList(
      asRows(existingSlice.objectReferences),
      asRows(incomingSlice.objectReferences),
      pickImageUrl,
      incomingSlice.droppedObjectReferenceIds
    ),
    locationReferences: mergeRowList(
      asRows(existingSlice.locationReferences),
      asRows(incomingSlice.locationReferences),
      pickImageUrl
    ),
    ...(Array.isArray(nextIgnores) ? { objectDuplicateIgnores: nextIgnores } : {}),
  }
}
