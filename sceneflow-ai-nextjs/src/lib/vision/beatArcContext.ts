/**
 * Per-beat story context for storyboard frame generation.
 *
 * A beat frame used to be composed from its own action line plus the entire
 * scene description and every talent note in the scene. Each of a scene's
 * fifteen beats therefore received the same scene-wide brief and composed a
 * frame for "the scene", which is what made a continuous scene read as
 * unrelated fragments.
 *
 * This module narrows that brief: a beat is told which movement of the scene
 * it dramatizes, where it sits inside that movement, and what the frames
 * immediately before and after it hold — enough to carry continuity without
 * restating the whole scene.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  formatSceneArcBlock,
  getSceneMovements,
  resolveBeatMovement,
} from '@/lib/script/sceneMovements'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { buildSceneStagingText } from '@/lib/vision/frameGenerationContext'

export interface BeatArcContext {
  /** Every movement of the scene, with `>` on the one this beat belongs to. */
  sceneArc?: string
  /** The one sentence of the scene description this beat dramatizes. */
  movementSummary?: string
  /** Human-readable placement, e.g. "beat 2 of 4 in movement 3 of 4". */
  movementPosition?: string
  /** Frozen moment of the preceding beat, for screen direction and carried state. */
  previousBeatMoment?: string
  /** Frozen moment of the following beat, so this frame cuts cleanly into it. */
  nextBeatMoment?: string
  /**
   * Staging prose for this beat. Talent direction only when an arc exists —
   * the arc already carries this beat's portion of the scene description, and
   * repeating the whole description pulls the frame back toward the scene.
   */
  stagingText: string
}

function beatMoment(beat: SceneBeat | undefined): string | undefined {
  if (!beat) return undefined
  const moment =
    beat.beatDirection?.frozenMoment?.trim() ||
    beat.actionDescription?.trim() ||
    beat.line?.trim() ||
    ''
  if (!moment) return undefined
  return moment.length > 220 ? `${moment.slice(0, 219).trimEnd()}…` : moment
}

/** Talent direction without the scene description that the arc already carries. */
function talentOnlyStaging(scene: Record<string, unknown>): string {
  const direction =
    (scene?.sceneDirection as Record<string, unknown> | undefined) ??
    (scene?.detailedDirection as Record<string, unknown> | undefined)
  const talent = direction?.talent
  if (!talent) return ''
  if (typeof talent === 'string') return talent.trim()
  const row = talent as Record<string, unknown>
  return [
    typeof row.blocking === 'string' ? row.blocking : '',
    typeof row.emotionalBeat === 'string' ? row.emotionalBeat : '',
    ...(Array.isArray(row.keyActions) ? row.keyActions.map((a) => String(a)) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

export function buildBeatArcContext(
  scene: Record<string, unknown> | null | undefined,
  beatIndex: number,
  beats?: SceneBeat[]
): BeatArcContext {
  if (!scene) return { stagingText: '' }

  const sceneBeats = beats ?? getSceneBeats(scene)
  const movements = getSceneMovements(scene, sceneBeats)
  const resolved =
    movements.length > 0 ? resolveBeatMovement(movements, beatIndex) : undefined

  if (!resolved) {
    return { stagingText: buildSceneStagingText(scene) }
  }

  const { movement, positionInMovement, movementBeatCount, totalMovements } = resolved

  return {
    sceneArc: formatSceneArcBlock(movements, movement.index),
    movementSummary: movement.intent
      ? `${movement.summary} (${movement.intent})`
      : movement.summary,
    movementPosition: `beat ${positionInMovement} of ${movementBeatCount} in movement ${movement.index + 1} of ${totalMovements}`,
    previousBeatMoment: beatMoment(sceneBeats[beatIndex - 1]),
    nextBeatMoment: beatMoment(sceneBeats[beatIndex + 1]),
    stagingText: talentOnlyStaging(scene),
  }
}

/**
 * Arc context as prose lines for the rules-based prompt path, ordered so the
 * beat's own moment stays first and the surrounding story reads as support.
 */
export function formatBeatArcContextLines(context: BeatArcContext): string[] {
  const lines: string[] = []
  if (context.movementSummary) {
    lines.push(
      `This beat tells ONE moment of: ${context.movementSummary}${
        context.movementPosition ? ` (${context.movementPosition})` : ''
      }`
    )
  }
  if (context.previousBeatMoment) {
    lines.push(
      `Previous frame held: ${context.previousBeatMoment} — keep screen direction, eyelines, and carried state consistent with it, and show a different moment.`
    )
  }
  if (context.nextBeatMoment) {
    lines.push(`Next frame will hold: ${context.nextBeatMoment} — cut cleanly into it.`)
  }
  if (context.sceneArc) {
    lines.push(context.sceneArc)
  }
  return lines
}
