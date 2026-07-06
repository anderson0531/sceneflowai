import type { DirectorQueueItem, SceneSegment } from './types'

export type PendingRetakeAction = {
  segmentId: string
  action: 'openDialog' | 'upload'
}

/**
 * True when a beat already has a completed generated/uploaded take.
 * Used to gate Take and Upload with a retake confirmation dialog.
 */
export function segmentHasCompletedTake(
  segment: SceneSegment,
  queueItem: Pick<DirectorQueueItem, 'status'> | undefined
): boolean {
  return queueItem?.status === 'complete' && !!segment.activeAssetUrl?.trim()
}

/**
 * Returns the pending retake action when confirmation is required, otherwise null.
 */
export function resolveRetakeConfirmation(
  segment: SceneSegment,
  queueItem: Pick<DirectorQueueItem, 'status'> | undefined,
  action: PendingRetakeAction['action']
): PendingRetakeAction | null {
  if (!segmentHasCompletedTake(segment, queueItem)) return null
  return { segmentId: segment.segmentId, action }
}
