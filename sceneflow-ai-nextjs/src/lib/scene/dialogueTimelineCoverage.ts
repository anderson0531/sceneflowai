/**
 * Ensures combined-audio timeline indices are each assigned to exactly one segment
 * after LLM segmentation (handles duplicates and gaps deterministically).
 */

/** Coerce model output (numbers, numeric strings) to valid 0..timelineLength-1 indices. */
export function normalizeTimelineIndices(raw: unknown, timelineLength: number): number[] {
  if (!Array.isArray(raw) || timelineLength <= 0) return []
  const out: number[] = []
  for (const x of raw) {
    let n: number
    if (typeof x === 'number' && Number.isFinite(x)) {
      n = Math.trunc(x)
    } else if (typeof x === 'string') {
      const p = parseInt(x.trim(), 10)
      n = Number.isFinite(p) ? p : NaN
    } else {
      continue
    }
    if (n < 0 || n >= timelineLength) continue
    out.push(n)
  }
  return out
}

/**
 * Phase 1 (directions): same coverage rules as Phase 2 — each combined-audio index in exactly one row.
 * Drops rows that end up with no indices after deduping duplicates (duplicate "shots" from the model).
 */
export function repairPhase1DirectionsTimeline<T extends { dialogue_indices?: unknown }>(
  directions: T[],
  timelineLength: number,
  sceneId: string
): T[] {
  if (timelineLength <= 0 || directions.length === 0) return directions

  const mapped = directions.map((d, i) => ({
    sequence: i + 1,
    assigned_dialogue_indices: normalizeTimelineIndices(d.dialogue_indices, timelineLength),
    veoTimelineContinuation: (d as { veoTimelineContinuation?: boolean }).veoTimelineContinuation === true,
  }))
  const repaired = validateAndRepairTimelineDialogueCoverage(mapped, timelineLength, sceneId)
  const merged = directions.map((dir, i) => ({
    ...dir,
    dialogue_indices: repaired[i]?.assigned_dialogue_indices ?? [],
  }))

  return merged.filter((d, i) => {
    const idxs = (d as { dialogue_indices?: number[] }).dialogue_indices
    const continuation =
      (d as { veoTimelineContinuation?: boolean }).veoTimelineContinuation === true
    if ((!Array.isArray(idxs) || idxs.length === 0) && !continuation) {
      console.warn(
        `[Scene Segmentation] Phase 1: dropping direction ${i} with no audio indices after timeline repair (scene=${sceneId})`
      )
      return false
    }
    return true
  })
}

/**
 * @param timelineLength - `combinedAudioTimeline.length` from scene build
 * @param sceneId - for logs only
 */
export function validateAndRepairTimelineDialogueCoverage<
  T extends {
    sequence?: number
    assigned_dialogue_indices?: number[]
    /** When true, this row is a Veo duration continuation of the prior clip for the same audio — do not assign “missing” timeline indices here */
    veoTimelineContinuation?: boolean
  },
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
    let bestSi = -1
    let bestLoad = Number.POSITIVE_INFINITY
    for (let si = 0; si < ordered.length; si++) {
      if (ordered[si].veoTimelineContinuation) continue
      const load = ordered[si].assigned_dialogue_indices?.length ?? 0
      if (load < bestLoad) {
        bestLoad = load
        bestSi = si
      }
    }
    if (bestSi < 0) {
      console.warn(
        `[Scene Segmentation] Dialogue timeline repair scene=${sceneId}: no non-continuation segment for missing index ${idx} — attaching to segment 0`
      )
      bestSi = 0
    }
    const seg = ordered[bestSi]
    const next = [...(seg.assigned_dialogue_indices || []), idx]
    ordered[bestSi] = { ...seg, assigned_dialogue_indices: next } as T
  }

  return ordered
}
