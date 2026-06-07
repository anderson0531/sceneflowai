/**
 * Ensures every generated script has title sequence and closing credits scenes.
 * Injects fallback bookend scenes when the LLM omits them.
 */

import { mintBeatId } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface TreatmentContext {
  title?: string
  logline?: string
  genre?: string | string[]
  tone?: string
  author_writer?: string
}

export interface CinematicBookendsResult {
  scenes: Record<string, unknown>[]
  injectedTitle: boolean
  injectedOutro: boolean
}

function isTitleScene(scene: Record<string, unknown>): boolean {
  if (scene.cinematicType === 'title') return true
  const heading = String(scene.heading ?? '').toLowerCase()
  return (
    heading.includes('title sequence') ||
    heading.includes('title card') ||
    heading.includes('opening title')
  )
}

function isOutroScene(scene: Record<string, unknown>): boolean {
  if (scene.cinematicType === 'outro') return true
  const heading = String(scene.heading ?? '').toLowerCase()
  return (
    heading.includes('credits') ||
    heading.includes('outro') ||
    heading.includes('end title')
  )
}

function formatGenre(genre?: string | string[]): string {
  if (!genre) return 'drama'
  return Array.isArray(genre) ? genre.join('/') : genre
}

function buildTitleBeats(treatment: TreatmentContext): SceneBeat[] {
  const title = treatment.title?.trim() || 'UNTITLED'
  const genre = formatGenre(treatment.genre)
  const author = treatment.author_writer?.trim()

  const beats: SceneBeat[] = [
    {
      beatId: mintBeatId(),
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: `Wide cinematic opening: atmospheric visual motif establishing ${genre} tone, slow camera drift, dramatic lighting.`,
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: `Title card reveal: bold centered typography displaying "${title}" over genre-appropriate motion graphics.`,
    },
  ]

  if (author) {
    beats.push({
      beatId: mintBeatId(),
      sequenceIndex: beats.length,
      kind: 'action',
      actionDescription: `Secondary title card: elegant credit text "Written by ${author}" fades in below the main title.`,
    })
  }

  beats.push({
    beatId: mintBeatId(),
    sequenceIndex: beats.length,
    kind: 'action',
    actionDescription: 'Final title beat: title holds on screen then dissolves into the opening atmosphere.',
  })

  return beats.map((beat, index) => ({ ...beat, sequenceIndex: index }))
}

function buildOutroBeats(treatment: TreatmentContext): SceneBeat[] {
  const title = treatment.title?.trim() || 'UNTITLED'
  const genre = formatGenre(treatment.genre)
  const author = treatment.author_writer?.trim()

  const creditNote = author ? `Written by ${author}. ` : ''

  return [
    {
      beatId: mintBeatId(),
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: `Closing visual: lingering ${genre} atmosphere shot fading from the final story moment.`,
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: `Credits roll: professional end credits with scrolling typography — THE END. ${creditNote}Production credits over cinematic background.`,
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 2,
      kind: 'action',
      actionDescription: `End card: "${title}" logo holds on screen, fade to black.`,
    },
  ]
}

function buildTitleScene(treatment: TreatmentContext): Record<string, unknown> {
  const title = treatment.title?.trim() || 'UNTITLED'
  const beats = buildTitleBeats(treatment)
  const actionSummary = beats
    .map((b) => b.actionDescription)
    .filter(Boolean)
    .join('\n\n')

  const creditLines: Array<Record<string, unknown>> = [
    { id: 'credit-title', name: title, role: '', isPrimary: true },
  ]
  if (treatment.author_writer?.trim()) {
    creditLines.push({
      id: 'credit-author',
      name: treatment.author_writer.trim(),
      role: 'Written by',
      isPrimary: false,
    })
  }

  return {
    id: `cinematic-title-fallback-${Date.now()}`,
    heading: 'INT. TITLE SEQUENCE - DAY',
    location: 'TITLE SEQUENCE',
    timeOfDay: 'DAY',
    interior: true,
    characters: [],
    dialogue: [],
    cinematicType: 'title',
    creditLines,
    duration: 20,
    action: `[TITLE SEQUENCE]\n${actionSummary}`,
    beats,
    visualDescription: 'Cinematic title sequence with bold centered typography and genre-appropriate motion.',
  }
}

function buildOutroScene(treatment: TreatmentContext): Record<string, unknown> {
  const beats = buildOutroBeats(treatment)
  const actionSummary = beats
    .map((b) => b.actionDescription)
    .filter(Boolean)
    .join('\n\n')

  const creditLines: Array<Record<string, unknown>> = []
  if (treatment.author_writer?.trim()) {
    creditLines.push({
      id: 'credit-author',
      name: treatment.author_writer.trim(),
      role: 'Written by',
      isPrimary: false,
    })
  }

  return {
    id: `cinematic-outro-fallback-${Date.now()}`,
    heading: 'INT. CREDITS - DAY',
    location: 'CREDITS',
    timeOfDay: 'DAY',
    interior: true,
    characters: [],
    dialogue: [],
    cinematicType: 'outro',
    creditLines,
    duration: 25,
    action: `[OUTRO / CREDITS]\n${actionSummary}`,
    beats,
    visualDescription: 'Professional closing credits sequence with elegant typography.',
  }
}

/** Prepend title and append credits scenes when missing; renumber sceneNumber. */
export function ensureCinematicBookends(
  scenes: Record<string, unknown>[],
  treatment: TreatmentContext
): CinematicBookendsResult {
  let result = [...scenes]
  let injectedTitle = false
  let injectedOutro = false

  if (!result.some(isTitleScene)) {
    result = [buildTitleScene(treatment), ...result]
    injectedTitle = true
  }

  if (!result.some(isOutroScene)) {
    result = [...result, buildOutroScene(treatment)]
    injectedOutro = true
  }

  result = result.map((scene, idx) => ({ ...scene, sceneNumber: idx + 1 }))

  return { scenes: result, injectedTitle, injectedOutro }
}

export function isCinematicBookendScene(scene: Record<string, unknown>): boolean {
  return isTitleScene(scene) || isOutroScene(scene)
}
