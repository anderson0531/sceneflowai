export interface SegmentSeed {
  startTime: number
  endTime: number
  reason?: string
}

export interface SegmentPlan {
  segments: SegmentSeed[]
  analysis?: {
    keyframeNotes?: string[]
    naturalBreaks?: string[]
    durationSeconds: number
  }
}

export interface SegmentationInput {
  sceneDirection: any
  sceneScript: any
  targetSegmentDuration: number
}

export interface PromptContext {
  sceneDirection: any
  sceneScript: any
  segmentPlan: SegmentPlan
  projectMetadata?: any
}

export interface SegmentPrompt {
  segmentId: string
  sequenceIndex: number
  startTime: number
  endTime: number
  reason?: string
  prompt: string
}

export interface PromptGenerationResult {
  segments: SegmentPrompt[]
  tokensUsed?: {
    input: number
    output: number
  }
}

export async function generateSegmentPlan({
  sceneDirection,
  sceneScript,
  targetSegmentDuration,
}: SegmentationInput): Promise<SegmentPlan> {
  const totalDuration = estimateSceneDuration(sceneScript)
  const segmentCount = Math.max(1, Math.ceil(totalDuration / targetSegmentDuration))

  const segments: SegmentSeed[] = Array.from({ length: segmentCount }, (_, index) => {
    const startTime = Number((index * targetSegmentDuration).toFixed(2))
    const endTime =
      index === segmentCount - 1
        ? totalDuration
        : Number(Math.min((index + 1) * targetSegmentDuration, totalDuration).toFixed(2))

    return {
      startTime,
      endTime,
      reason: `Auto-balanced segment ${index + 1}`,
    }
  })

  return {
    segments,
    analysis: {
      durationSeconds: totalDuration,
    },
  }
}

function estimateSceneDuration(sceneScript: any): number {
  const DEFAULT_DURATION = 60
  if (!sceneScript) return DEFAULT_DURATION

  const narration = sceneScript.narration || sceneScript.action || ''
  let words = narration.split(/\s+/).filter(Boolean).length

  if (Array.isArray(sceneScript.dialogue)) {
    for (const line of sceneScript.dialogue) {
      if (line?.line) {
        words += line.line.split(/\s+/).filter(Boolean).length
      }
    }
  }

  if (words === 0) {
    return DEFAULT_DURATION
  }

  const wordsPerMinute = 150
  const durationMinutes = words / wordsPerMinute
  return Math.max(15, Math.round(durationMinutes * 60))
}

export async function generateSegmentPrompts(
  context: PromptContext
): Promise<PromptGenerationResult> {
  const { segmentPlan } = context
  const segments: SegmentPrompt[] = segmentPlan.segments.map((segment, index) => ({
    segmentId: `segment-${index}`,
    sequenceIndex: index,
    startTime: segment.startTime,
    endTime: segment.endTime,
    reason: segment.reason,
    prompt: buildFallbackPrompt(context, segment, index),
  }))
  return {
    segments,
    tokensUsed: {
      input: 0,
      output: segments.reduce((acc, item) => acc + item.prompt.split(/\s+/).length, 0),
    },
  }
}

function buildFallbackPrompt(
  context: PromptContext,
  segment: SegmentSeed,
  index: number
): string {
  const { sceneDirection, sceneScript } = context
  const sceneHeading =
    typeof sceneDirection?.heading === 'string'
      ? sceneDirection.heading
      : sceneDirection?.heading?.text || 'Untitled scene'
  const action = sceneScript?.action || sceneScript?.visualDescription || 'Describe scene action here.'
  return [
    `[TASK: Generate a cinematic video segment.]`,
    `[SEGMENT_INDEX: ${index + 1}]`,
    `[TIME: ${segment.startTime.toFixed(1)}s to ${segment.endTime.toFixed(1)}s]`,
    `[SCENE_HEADING: ${sceneHeading}]`,
    `[ACTION: ${action}]`,
    `[NOTE: Replace with AI generated prompt once LLM integration is configured.]`,
  ].join(' ')
}

