/**
 * Blueprint script-craft priorities: emphasis for longform generation and
 * scene revision. These are not duration knobs.
 */

import { MAX_BEATS_PER_SCENE, TARGET_BEATS_PER_SCENE } from '@/lib/script/sceneDecomposition'

export const SCRIPT_CRAFT_PRIORITIES = [
  'characterDepth',
  'actionClarity',
  'subtext',
  'dialogueRichness',
  'visualFirst',
] as const

export type ScriptCraftPriority = (typeof SCRIPT_CRAFT_PRIORITIES)[number]

export type ScriptCraftSource = {
  scriptCraft?: unknown
  scriptCraftNotes?: unknown
} | null | undefined

const PRIORITY_SET = new Set<string>(SCRIPT_CRAFT_PRIORITIES)

const PRIORITY_GUIDANCE: Record<ScriptCraftPriority, string> = {
  characterDepth:
    'Give characters room: interior contradiction, relationship texture, and choices that reveal who they are. Do not flatten people into plot functions.',
  actionClarity:
    'Prefer specific blocking, geography, and consequential physical action over montage padding or generic coverage. The audience should always know where bodies are and what changed.',
  subtext:
    'Let dialogue and behavior carry implication. Avoid on-the-nose exposition; what is unsaid should still be readable.',
  dialogueRichness:
    'Write distinctive, playable speech with rhythm, interruption, and character-specific diction. Lines should do more than advance plot.',
  visualFirst:
    'Show story through image, gesture, and staging before defaulting to talk. Use silence and visual turns as first-class storytelling.',
}

export function isScriptCraftPriority(value: unknown): value is ScriptCraftPriority {
  return typeof value === 'string' && PRIORITY_SET.has(value)
}

export function parseScriptCraftPriorities(raw: unknown): ScriptCraftPriority[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<ScriptCraftPriority>()
  const out: ScriptCraftPriority[] = []
  for (const item of raw) {
    if (!isScriptCraftPriority(item) || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

export function parseScriptCraftNotes(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Shared length philosophy. In `chunked` mode the scene count is assigned by the
 * caller, so the wording must not invite the model to decide its own length —
 * that licence is what let it collapse a Blueprint beat into a single scene.
 */
export function buildLongformScriptLengthBlock(opts?: { chunked?: boolean }): string {
  if (opts?.chunked) {
    return `SCENE DEPTH (COUNT IS ASSIGNED, DEPTH IS YOURS):
• The number of scenes in your slice is FIXED by the assignment below. Do not merge, drop, or add scenes to it.
• Give characters, action, and story turns as much room as they need WITHIN each assigned scene.
• Aim for ~${TARGET_BEATS_PER_SCENE} beats per scene. A scene may grow up to ${MAX_BEATS_PER_SCENE} when the story earns it, but must never exceed that cap.
• Fill each scene to its assigned beat target — a thin scene is a failure, not a stylistic choice, and filling the ceiling is not the target.
• JSON "duration" fields are estimates you report after writing, not targets to hit.
• Intervening action beats only when they add NEW visual information — never to pad runtime.`
  }
  return `SCRIPT LENGTH (STORY DETERMINES LENGTH):
• Write a complete longform script. Give characters, action, and story turns as much room as they need.
• Decompose each Blueprint beat into multiple scenes; never collapse an entire Blueprint beat into one scene.
• Aim for ~${TARGET_BEATS_PER_SCENE} beats per scene. Each scene MUST stay at or below ${MAX_BEATS_PER_SCENE} beats — split across consecutive scenes when a beat needs more.
• Approximate Blueprint runtime guides beat volume (~8s per beat), not a hard seconds-per-scene target.
• JSON "duration" fields are estimates you report after writing, not targets to hit.
• Intervening action beats only when they add NEW visual information — never to pad runtime.`
}

export function buildScriptCraftPromptBlock(source: ScriptCraftSource): string {
  const priorities = parseScriptCraftPriorities(source?.scriptCraft)
  const notes = parseScriptCraftNotes(source?.scriptCraftNotes)
  if (priorities.length === 0 && !notes) return ''

  const lines: string[] = [
    '=== SCRIPT CRAFT PRIORITIES (BLUEPRINT) ===',
    'These are emphasis for story quality, not duration limits. Honor them throughout.',
  ]

  if (priorities.length > 0) {
    for (const priority of priorities) {
      lines.push(`• ${priority}: ${PRIORITY_GUIDANCE[priority]}`)
    }
  }

  if (notes) {
    lines.push(`Additional craft notes from the Blueprint:\n${notes}`)
  }

  return `\n${lines.join('\n')}\n`
}
