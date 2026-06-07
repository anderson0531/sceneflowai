import type { ParsedScript } from './scriptParser'

export type CompletenessGapSeverity = 'error' | 'warning' | 'info'

export type CompletenessGapCode =
  | 'NO_SCENES'
  | 'SCENE_NO_CONTENT'
  | 'SCENE_MISSING_HEADING'
  | 'CHARACTER_NO_DIALOGUE'
  | 'SHORT_RUNTIME'
  | 'MISSING_TITLE'
  | 'UNBALANCED_SCENES'

export interface CompletenessGap {
  type: CompletenessGapSeverity
  code: CompletenessGapCode
  message: string
  sceneNumber?: number
  characterName?: string
  suggestion?: string
}

export interface CompletenessResult {
  isComplete: boolean
  completenessScore: number
  gaps: CompletenessGap[]
}

const MIN_RUNTIME_SECONDS = 60
const GENERIC_HEADINGS = new Set(['', 'UNTITLED SCENE', 'SCENE', 'UNKNOWN'])

function isGenericTitle(title: string): boolean {
  const t = title.trim().toUpperCase()
  return !t || t === 'UNTITLED' || t === 'UNTITLED SCRIPT' || t === 'IMPORTED SCRIPT'
}

function isGenericHeading(heading: string): boolean {
  const h = heading.trim().toUpperCase()
  return GENERIC_HEADINGS.has(h) || h === 'INT. - DAY' || h === 'EXT. - DAY'
}

/** Assess parsed script content gaps (post-parse, separate from format validation). */
export function assessScriptCompleteness(parsed: ParsedScript): CompletenessResult {
  const gaps: CompletenessGap[] = []
  const scenes = parsed.scenes || []
  const characters = parsed.characters || []
  const totalDuration = parsed.metadata?.totalDuration || 0

  if (scenes.length === 0) {
    gaps.push({
      type: 'error',
      code: 'NO_SCENES',
      message: 'No scenes were parsed from the script',
      suggestion: 'Add scene headings (INT./EXT.) and content before importing',
    })
  }

  if (isGenericTitle(parsed.title || '')) {
    gaps.push({
      type: 'warning',
      code: 'MISSING_TITLE',
      message: 'Script title is missing or generic',
      suggestion: 'Add a Title: line on the title page or at the top of the file',
    })
  }

  if (totalDuration > 0 && totalDuration < MIN_RUNTIME_SECONDS) {
    gaps.push({
      type: 'warning',
      code: 'SHORT_RUNTIME',
      message: `Estimated runtime is under ${MIN_RUNTIME_SECONDS} seconds`,
      suggestion: 'Add more scenes or dialogue, or confirm this is intentional for a short clip',
    })
  }

  for (const scene of scenes) {
    const hasAction = !!scene.action?.trim()
    const hasDialogue = Array.isArray(scene.dialogue) && scene.dialogue.length > 0
    if (!hasAction && !hasDialogue) {
      gaps.push({
        type: 'warning',
        code: 'SCENE_NO_CONTENT',
        message: `Scene ${scene.sceneNumber} has no action or dialogue`,
        sceneNumber: scene.sceneNumber,
        suggestion: 'Add action description or character dialogue for this scene',
      })
    }
    if (isGenericHeading(scene.heading || '')) {
      gaps.push({
        type: 'warning',
        code: 'SCENE_MISSING_HEADING',
        message: `Scene ${scene.sceneNumber} has a missing or generic heading`,
        sceneNumber: scene.sceneNumber,
        suggestion: 'Use a standard heading like "INT. LOCATION - DAY"',
      })
    }
  }

  for (const character of characters) {
    if (character.dialogueCount === 0) {
      gaps.push({
        type: 'info',
        code: 'CHARACTER_NO_DIALOGUE',
        message: `${character.name} appears but has no dialogue`,
        characterName: character.name,
        suggestion: 'Add dialogue or remove unused character cues',
      })
    }
  }

  if (scenes.length > 1 && totalDuration > 0) {
    const maxScene = scenes.reduce((max, s) => (s.duration > max.duration ? s : max), scenes[0])
    if (maxScene.duration / totalDuration > 0.5) {
      gaps.push({
        type: 'info',
        code: 'UNBALANCED_SCENES',
        message: `Scene ${maxScene.sceneNumber} is over half the total runtime`,
        sceneNumber: maxScene.sceneNumber,
        suggestion: 'Consider splitting long scenes for clearer storyboard pacing',
      })
    }
  }

  const errorCount = gaps.filter((g) => g.type === 'error').length
  const warningCount = gaps.filter((g) => g.type === 'warning').length
  const infoCount = gaps.filter((g) => g.type === 'info').length

  let score = 100
  score -= errorCount * 35
  score -= warningCount * 12
  score -= infoCount * 4
  score = Math.max(0, Math.min(100, score))

  const isComplete = errorCount === 0 && warningCount === 0

  return {
    isComplete,
    completenessScore: score,
    gaps,
  }
}

export function getCompletenessStatus(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}

export function hasErrorLevelGaps(gaps: CompletenessGap[]): boolean {
  return gaps.some((g) => g.type === 'error')
}

export function hasImprovableGaps(gaps: CompletenessGap[]): boolean {
  return gaps.some((g) => g.type === 'error' || g.type === 'warning')
}
