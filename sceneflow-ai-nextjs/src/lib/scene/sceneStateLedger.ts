/**
 * Scene State Ledger & Preceding-Shot Continuity Anchor
 *
 * Tracks cumulative visual state across all beats within a scene so that
 * when stitching 10–30 consecutive 10s shots inside a scene (or 300+ shots
 * across a 45m–60m episode):
 * 1. Lighting, atmosphere, and prop/wardrobe mutations introduced in Beat K
 *    persist into Beats K+1..N instead of resetting to default reference plates.
 * 2. Beat N+1 can attach Beat N's last frame (or start frame) as a
 *    [PRECEDING SHOT IN SCENE] visual continuity anchor when generating a new
 *    camera angle in the same location.
 */

import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface SceneBeatStateMutation {
  beatId: string
  sequenceIndex: number
  lightingState?: string
  wardrobeMutations: Record<string, string>
  activePropsByCharacter: Record<string, string[]>
  environmentMutations: string[]
  blockingAxis?: string
}

export interface CumulativeSceneStateAtBeat {
  beatIndex: number
  beatId: string
  activeLighting?: string
  wardrobeByCharacter: Record<string, string>
  propsInScene: string[]
  environmentNotes: string[]
  blockingAxis?: string
  precedingBeatId?: string
  precedingShotType?: string
  precedingCameraAngle?: string
  precedingFrozenMoment?: string
  precedingVisualAnchorUrl?: string
}

export interface PrecedingShotContinuityAnchor {
  precedingBeatId: string
  anchorImageUrl: string
  anchorRole: 'last_frame' | 'start_frame'
  referenceLabel: string
  promptContinuityDirective: string
}

const WARDROBE_MUTATION_REGEX =
  /\b(?:puts? on|takes? off|removes?|unbuttons?|buttons?|zips?|unzips?|drapes?|wraps?|wears?|holding|carries|clutches|picks? up|sets? down)\s+([^.,;]+)/i

const ENVIRONMENT_MUTATION_REGEX =
  /\b(?:lights?\s+(?:flicker|dim|turn\s+\w+|go\s+out)|rain\s+(?:starts|intensifies|stops)|alarms?\s+flash|smoke\s+fills|door\s+(?:opens|slams\s+shut))\b[^.,;]*/i

/**
 * Extract state mutations from a single beat's action, blocking, and prop interaction.
 */
export function extractBeatStateMutation(
  beat: SceneBeat,
  sequenceIndex: number
): SceneBeatStateMutation {
  const direction = beat.beatDirection
  const combinedText = [
    beat.actionDescription,
    direction?.blocking,
    direction?.propInteraction,
    direction?.frozenMoment,
  ]
    .filter(Boolean)
    .join('. ')

  const wardrobeMutations: Record<string, string> = {}
  const activePropsByCharacter: Record<string, string[]> = {}
  const environmentMutations: string[] = []

  const primaryCharacter =
    beat.character?.trim() ||
    (Array.isArray(direction?.castInFrame) && direction.castInFrame[0]?.trim()) ||
    ''

  if (primaryCharacter && combinedText) {
    const wardrobeMatch = combinedText.match(WARDROBE_MUTATION_REGEX)
    if (wardrobeMatch?.[0]) {
      wardrobeMutations[primaryCharacter] = wardrobeMatch[0].trim()
    }
  }

  if (primaryCharacter && Array.isArray(direction?.keyProps) && direction.keyProps.length > 0) {
    activePropsByCharacter[primaryCharacter] = direction.keyProps
      .map((p) => p.trim())
      .filter(Boolean)
  }

  if (combinedText) {
    const envMatch = combinedText.match(ENVIRONMENT_MUTATION_REGEX)
    if (envMatch?.[0]) {
      environmentMutations.push(envMatch[0].trim())
    }
  }

  return {
    beatId: beat.beatId,
    sequenceIndex,
    lightingState: direction?.lightingAccent?.trim() || undefined,
    wardrobeMutations,
    activePropsByCharacter,
    environmentMutations,
    blockingAxis: direction?.spatialRelationship?.trim() || undefined,
  }
}

/**
 * Build a cumulative state ledger across all ordered beats in a scene.
 * Beat N receives the accumulated lighting, wardrobe, prop, and axis state
 * established in Beats 0..N-1.
 */
export function buildSceneStateLedger(
  beats: SceneBeat[],
  options?: {
    /** Map of beatId -> generated lastFrameUrl or startFrameUrl for visual anchoring. */
    visualFrameByBeatId?: Record<string, { startFrameUrl?: string; lastFrameUrl?: string }>
  }
): CumulativeSceneStateAtBeat[] {
  let currentLighting: string | undefined
  let currentAxis: string | undefined
  const wardrobeByCharacter: Record<string, string> = {}
  const activePropSet = new Set<string>()
  const environmentNotes: string[] = []

  const ledger: CumulativeSceneStateAtBeat[] = []

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const prevBeat = i > 0 ? beats[i - 1] : undefined
    const prevFrames = prevBeat ? options?.visualFrameByBeatId?.[prevBeat.beatId] : undefined
    const precedingVisualAnchorUrl =
      prevFrames?.lastFrameUrl?.trim() ||
      prevFrames?.startFrameUrl?.trim() ||
      (prevBeat as SceneBeat & { storyboardImageUrl?: string })?.storyboardImageUrl?.trim() ||
      undefined

    const mutation = extractBeatStateMutation(beat, i)
    if (mutation.lightingState) {
      currentLighting = mutation.lightingState
    }
    if (mutation.blockingAxis) {
      currentAxis = mutation.blockingAxis
    }
    for (const [charName, state] of Object.entries(mutation.wardrobeMutations)) {
      wardrobeByCharacter[charName] = state
    }
    for (const props of Object.values(mutation.activePropsByCharacter)) {
      for (const p of props) activePropSet.add(p)
    }
    for (const envNote of mutation.environmentMutations) {
      if (!environmentNotes.includes(envNote)) {
        environmentNotes.push(envNote)
      }
    }

    ledger.push({
      beatIndex: i,
      beatId: beat.beatId,
      activeLighting: currentLighting,
      wardrobeByCharacter: { ...wardrobeByCharacter },
      propsInScene: Array.from(activePropSet),
      environmentNotes: [...environmentNotes],
      blockingAxis: currentAxis,
      precedingBeatId: prevBeat?.beatId,
      precedingShotType: prevBeat?.beatDirection?.shotType?.trim() || undefined,
      precedingCameraAngle: prevBeat?.beatDirection?.cameraAngle?.trim() || undefined,
      precedingFrozenMoment: prevBeat?.beatDirection?.frozenMoment?.trim() || undefined,
      precedingVisualAnchorUrl,
    })
  }

  return ledger
}

/**
 * Compile a concise continuity clause for Beat N from the cumulative scene state ledger.
 */
export function compileSceneStateContinuityClause(
  state: CumulativeSceneStateAtBeat | null | undefined
): string {
  if (!state || state.beatIndex === 0) return ''

  const clauses: string[] = []

  if (state.precedingShotType) {
    const fromAngle = state.precedingCameraAngle ? ` (${state.precedingCameraAngle})` : ''
    clauses.push(`Shot continuity from preceding ${state.precedingShotType}${fromAngle}`)
  }

  if (state.blockingAxis) {
    clauses.push(`Maintain 180-degree axis: ${state.blockingAxis}`)
  }

  if (state.activeLighting) {
    clauses.push(`Consistent scene lighting: ${state.activeLighting}`)
  }

  const wardrobeEntries = Object.entries(state.wardrobeByCharacter)
  if (wardrobeEntries.length > 0) {
    const summary = wardrobeEntries.map(([name, w]) => `${name} (${w})`).join(', ')
    clauses.push(`Carryover state: ${summary}`)
  }

  if (state.environmentNotes.length > 0) {
    clauses.push(`Environment state: ${state.environmentNotes.join('; ')}`)
  }

  return clauses.join('. ')
}

/**
 * Resolve the Preceding-Shot Continuity Anchor for keyframe generation so Beat N+1
 * inherits Beat N's exact lighting, color temperature, and set state when cutting
 * to a new angle in the same scene.
 */
export function resolvePrecedingShotContinuityAnchor(
  currentBeat: SceneBeat,
  state: CumulativeSceneStateAtBeat | null | undefined
): PrecedingShotContinuityAnchor | null {
  if (!state || !state.precedingBeatId || !state.precedingVisualAnchorUrl) {
    return null
  }

  const targetShot = currentBeat.beatDirection?.shotType?.trim() || 'next camera setup'
  const targetAngle = currentBeat.beatDirection?.cameraAngle?.trim()
  const cameraDesc = targetAngle ? `${targetShot} (${targetAngle})` : targetShot

  return {
    precedingBeatId: state.precedingBeatId,
    anchorImageUrl: state.precedingVisualAnchorUrl,
    anchorRole: 'last_frame',
    referenceLabel:
      'PRECEDING SHOT IN SCENE — Match lighting temperature, background atmosphere, and wardrobe state',
    promptContinuityDirective: `Match the exact lighting temperature, room atmosphere, and character wardrobe state from the PRECEDING SHOT reference while cutting the camera to ${cameraDesc}.`,
  }
}
