export interface DirectorDialogInitArgs {
  isOpen: boolean
  wasOpen: boolean
  currentSegmentId: string
  lastInitializedSegmentId: string | null
}

/**
 * Initialize dialog state only when:
 * - dialog transitions from closed to open, or
 * - a different segment is shown while already open.
 */
export function shouldInitializeDirectorDialogState(args: DirectorDialogInitArgs): boolean {
  const { isOpen, wasOpen, currentSegmentId, lastInitializedSegmentId } = args
  if (!isOpen) return false
  if (!wasOpen) return true
  return lastInitializedSegmentId !== currentSegmentId
}
