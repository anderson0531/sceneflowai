/**
 * Script-level direction for the Production Studio Direct Script dialog.
 * Pure helpers stay here so tests can cover them without calling the model.
 */

export type ScriptRevisionDepth = 'polish' | 'rewrite' | 'refactor'

export type ScriptRewriteTemplate = {
  id: string
  label: string
  text: string
}

export const SCRIPT_REWRITE_TEMPLATES: ScriptRewriteTemplate[] = [
  {
    id: 'improve-pacing',
    label: 'Improve Overall Pacing',
    text: 'Improve the pacing across all scenes. Tighten slow sections and expand rushed moments.',
  },
  {
    id: 'strengthen-arc',
    label: 'Strengthen Narrative Arc',
    text: 'Strengthen the overall narrative arc. Ensure clear setup, conflict escalation, and satisfying resolution.',
  },
  {
    id: 'character-consistency',
    label: 'Character Consistency',
    text: 'Ensure character voices and behaviors are consistent throughout the script.',
  },
  {
    id: 'tone-coherence',
    label: 'Unify Tone',
    text: 'Unify the tone and mood across all scenes to create a cohesive viewing experience.',
  },
  {
    id: 'visual-cohesion',
    label: 'Visual Cohesion',
    text: 'Improve visual storytelling consistency and create a unified visual style.',
  },
  {
    id: 'dialogue-polish',
    label: 'Polish All Dialogue',
    text: 'Polish dialogue throughout the script for naturalness, subtext, and character voice.',
  },
  {
    id: 'emotional-beats',
    label: 'Emotional Beats',
    text: 'Strengthen emotional beats and ensure proper build-up to key moments.',
  },
  {
    id: 'scene-transitions',
    label: 'Scene Transitions',
    text: 'Improve transitions between scenes for better flow and continuity.',
  },
]

/** Minute chips for "What is the target duration?". Keep-current is a separate choice. */
export const SCRIPT_DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90] as const

const IMPERATIVE =
  /^(add|cut|remove|rewrite|tighten|strengthen|clarify|show|reduce|expand|merge|shorten|lengthen|fix|make|give|let|raise|lower|build|earn|ground|replace|turn|shift|slow|speed|vary|connect|drop|trim|open|close|reveal|hide|focus|keep|preserve|increase|decrease|improve|polish|refactor|restructure|simplify|deepen|unify|ensure|avoid|stop|start|use|write|change|adjust|balance|pace|dramatize|dramatise)\b/i

export type ScriptDirectionRecommendation = {
  id: string
  text: string
  priority?: string
  category?: string
}

type ReviewRecommendationInput =
  | string
  | { text?: string; priority?: string; category?: string }

type DirectScriptReviewInput = {
  recommendations?: ReviewRecommendationInput[]
  improvements?: unknown[]
} | null
  | undefined

/**
 * Turn a diagnostic "area for improvement" into an instruction the rewrite can apply.
 * Lines that already start with a verb are kept. Others become "Fix: …".
 */
export function improvementToRecommendation(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  if (IMPERATIVE.test(trimmed)) return trimmed
  const body = trimmed.replace(/[.]+$/, '')
  return `Fix: ${body}.`
}

function recommendationText(rec: ReviewRecommendationInput): string {
  if (typeof rec === 'string') return rec.trim()
  return (rec?.text || '').trim()
}

/**
 * Addable direction from an Audience Resonance review.
 * Script-level recommendations are already the fixes. When a review only has
 * diagnostic improvements, those lines are converted into recommendations.
 */
export function scriptDirectionRecommendations(
  review: DirectScriptReviewInput
): ScriptDirectionRecommendation[] {
  if (!review) return []

  const recs = Array.isArray(review.recommendations) ? review.recommendations : []
  const fromRecs = recs
    .map((rec, index) => {
      const text = recommendationText(rec)
      const priority = typeof rec === 'object' && rec ? rec.priority : undefined
      const category = typeof rec === 'object' && rec ? rec.category : undefined
      return {
        id: `rec-${index}`,
        text,
        priority,
        category,
      }
    })
    .filter((rec) => rec.text)

  if (fromRecs.length > 0) return fromRecs

  const improvements = Array.isArray(review.improvements) ? review.improvements : []
  return improvements
    .map((item, index) => {
      const raw =
        typeof item === 'string'
          ? item
          : item && typeof item === 'object' && 'text' in item
            ? String((item as { text?: unknown }).text ?? '')
            : ''
      return {
        id: `imp-${index}`,
        text: improvementToRecommendation(raw),
      }
    })
    .filter((rec) => rec.text)
}

export type StructuralActionLike = {
  action: string
  sceneNumbers: number[]
}

/**
 * Drop merge, cut, and rewrite actions that touch a locked scene.
 * Scene numbers are 1-based, matching the structural planner.
 */
export function filterStructuralActions<T extends StructuralActionLike>(
  actions: T[],
  preserveSceneNumbers: number[]
): T[] {
  if (!preserveSceneNumbers.length) return actions
  const locked = new Set(preserveSceneNumbers)
  return actions.filter((action) => {
    if (action.action !== 'merge' && action.action !== 'cut' && action.action !== 'rewrite') {
      return true
    }
    return !action.sceneNumbers.some((n) => locked.has(n))
  })
}

export const PRESERVE_SCENE_FLAG = '_directScriptPreserveId'

export function stampPreservedScenes<T extends Record<string, unknown>>(
  scenes: T[],
  preserveSceneIndices: number[]
): { scenes: T[]; originals: Map<string, T> } {
  const locked = new Set(preserveSceneIndices)
  const originals = new Map<string, T>()
  const stamped = scenes.map((scene, index) => {
    if (!locked.has(index)) return scene
    const id = `preserve-${index}`
    originals.set(id, scene)
    return { ...scene, [PRESERVE_SCENE_FLAG]: id }
  })
  return { scenes: stamped, originals }
}

export function restorePreservedScenes<T extends Record<string, unknown>>(
  scenes: T[],
  originals: Map<string, T>
): T[] {
  if (originals.size === 0) return scenes
  return scenes.map((scene) => {
    const id = scene?.[PRESERVE_SCENE_FLAG]
    if (typeof id !== 'string' || !originals.has(id)) return scene
    return originals.get(id) as T
  })
}
