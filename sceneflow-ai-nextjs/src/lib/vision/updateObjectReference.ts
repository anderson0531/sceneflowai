export type ObjectReferenceLike = {
  id: string
  imageUrl?: string
  updatedAt?: string
  [key: string]: unknown
}

/** Patch one object/prop reference by id (use objectReferencesRef.current in batch flows). */
export function updateObjectReferenceInList<T extends ObjectReferenceLike>(
  references: T[],
  referenceId: string,
  patch: Partial<T>
): T[] {
  return references.map((ref) =>
    ref.id === referenceId ? { ...ref, ...patch } : ref
  )
}
