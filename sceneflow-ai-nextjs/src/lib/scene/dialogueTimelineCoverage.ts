/**
 * Ensures combined-audio timeline indices are each assigned to exactly one segment
 * after LLM segmentation (handles duplicates and gaps deterministically).
 */

/**
 * @param timelineLength - `combinedAudioTimeline.length` from scene build
 * @param sceneId - for logs only
 */
export function validateAndRepairTimelineDialogueCoverage<
  T extends { sequence?: number; assigned_dialogue_indices?: number[] },
>(segments: T[], timelineLength: number, sceneId: string): T[] {
  if (timelineLength <= 0 || segments.length === 0) {
    return segments
  }

  const expected = new Set<number>()
  for (let i = 0; i < timelineLength; i++) expected.add(i)

  const ordered = [...segments].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))

  const firstOwner = new Map<number, number>() // index -> segment position in ordered
  for (let si = 0; si < ordered.length; si++) {
    const arr = [...(ordered[si].assigned_dialogue_indices || [])]
    const deduped: number[] = []
    for (const idx of arr) {
      if (typeof idx !== 'number' || idx < 0 || idx >= timelineLength) continue
      if (firstOwner.has(idx)) continue
      firstOwner.set(idx, si)
      deduped.push(idx)
    }
    ordered[si] = { ...ordered[si], assigned_dialogue_indices: deduped } as T
  }

  const covered = new Set(firstOwner.keys())
  const missing: number[] = []
  for (const i of expected) {
    if (!covered.has(i)) missing.push(i)
  }

  const duplicateCount =
    segments.reduce((acc, s) => acc + (s.assigned_dialogue_indices?.length || 0), 0) - covered.size

  if (missing.length > 0 || duplicateCount > 0) {
    console.warn(
      `[Scene Segmentation] Dialogue timeline repair scene=${sceneId}: ` +
        `missing indices=${JSON.stringify(missing)}, removed duplicate assignments≈${duplicateCount}`
    )
  }

  if (missing.length === 0) {
    return ordered
  }

  for (const idx of missing) {
    let bestSi = 0
    let bestLoad = Number.POSITIVE_INFINITY
    for (let si = 0; si < ordered.length; si++) {
      const load = ordered[si].assigned_dialogue_indices?.length ?? 0
      if (load < bestLoad) {
        bestLoad = load
        bestSi = si
      }
    }
    const seg = ordered[bestSi]
    const next = [...(seg.assigned_dialogue_indices || []), idx]
    ordered[bestSi] = { ...seg, assigned_dialogue_indices: next } as T
  }

  return ordered
}
