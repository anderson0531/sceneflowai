import { allocateVeoSplitDurations } from '@/lib/scene/veoDuration'

type TimelineLine = {
  estimatedDuration?: number
}

type SceneDataLike = {
  combinedAudioTimeline: TimelineLine[]
}

type DirectionLike = {
  estimated_duration?: number
  dialogue_indices?: number[]
  trigger_reason?: string
  [key: string]: any
}

/** Split direction rows when assigned timeline audio exceeds max clip duration. */
export function expandDirectionsForTimelineAudioBudget(
  rawDirections: DirectionLike[],
  sceneData: SceneDataLike,
  maxDuration: number
): DirectionLike[] {
  const tl = sceneData.combinedAudioTimeline
  const result: DirectionLike[] = []

  for (const dir of rawDirections) {
    const dialogueIndices: number[] = dir.dialogue_indices || []
    const audioSum = dialogueIndices.reduce((acc, i) => {
      const line = tl[i]
      return acc + (typeof line?.estimatedDuration === 'number' ? line.estimatedDuration : 0)
    }, 0)
    const est = typeof dir.estimated_duration === 'number' ? dir.estimated_duration : 0
    const originalDuration = Math.max(est, audioSum)

    if (originalDuration <= maxDuration + 0.2) {
      result.push(dir)
      continue
    }

    const subDurations = allocateVeoSplitDurations(originalDuration, maxDuration)
    const numParts = subDurations.length

    const dialoguePerPart =
      dialogueIndices.length <= 1 ? 1 : Math.ceil(dialogueIndices.length / numParts)

    for (let i = 0; i < numParts; i++) {
      const partDialogue =
        dialogueIndices.length === 1
          ? i === 0
            ? [...dialogueIndices]
            : []
          : dialogueIndices.slice(i * dialoguePerPart, (i + 1) * dialoguePerPart)

      result.push({
        ...dir,
        estimated_duration: subDurations[i],
        dialogue_indices: partDialogue,
        veoTimelineContinuation: dialogueIndices.length === 1 && numParts > 1 && i > 0,
        trigger_reason:
          i === 0
            ? dir.trigger_reason
            : `Continuation ${i + 1}/${numParts} — ${dir.trigger_reason || 'split for audio length'}`,
      })
    }
  }

  return result
}
