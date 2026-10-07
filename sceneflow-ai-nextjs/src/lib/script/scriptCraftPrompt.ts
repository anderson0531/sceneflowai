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
 * Shared length philosophy. In `chunked` mode the assigned scene count is a
 * floor so a Blueprint beat is not collapsed into one scene. Beat count inside
 * a scene is not a quota: write the shots the story needs, and split past the
 * technical per-scene ceiling.
 */
export function buildLongformScriptLengthBlock(opts?: { chunked?: boolean }): string {
  if (opts?.chunked) {
    return `SCENE DEPTH (COUNT IS A FLOOR, COMPOSITION IS YOURS):
• Return at least the assigned number of scenes. You may add continuation scenes when one logical scene needs more than ${MAX_BEATS_PER_SCENE} beats. Do not merge or drop assigned scenes.
• You are creatively unbound within each scene. Compose the exact number of beats the story needs. Do not pad to a quota and do not compress action to fit ${MAX_BEATS_PER_SCENE} beats.
• If a logical scene needs more than ${MAX_BEATS_PER_SCENE} beats, split it into sequential parts (Scene 1A, Scene 1B) that share cast, location, time of day, and environment. No part exceeds ${MAX_BEATS_PER_SCENE} beats.
• A planning hint is ~${TARGET_BEATS_PER_SCENE} beats per scene. Missing that hint is not a failure. Filling the ceiling is not the target.
• JSON "duration" fields are estimates you report after writing, not targets to hit.
• Intervening action beats only when they add NEW visual information — never to pad runtime.`
  }
  return `SCRIPT LENGTH (STORY DETERMINES LENGTH):
• Write a complete longform script. Give characters, action, and story turns as much room as they need.
• Decompose each Blueprint beat into multiple scenes; never collapse an entire Blueprint beat into one scene.
• You are creatively unbound. Compose the exact number of beats the treatment needs. A planning hint is ~${TARGET_BEATS_PER_SCENE} beats per scene. That hint is not a quota to fill, and ${MAX_BEATS_PER_SCENE} beats is not a box to compress into.
• If one logical scene needs more than ${MAX_BEATS_PER_SCENE} beats, split it into sequential parts (Scene 1A, Scene 1B) that share cast, location, time of day, and environment. No part exceeds ${MAX_BEATS_PER_SCENE} beats. A single long beats[] is split by the system the same way.
• Approximate Blueprint runtime guides how much story there is (~8s per beat), not a hard seconds-per-scene target.
• JSON "duration" fields are estimates you report after writing, not targets to hit.
• Intervening action beats only when they add NEW visual information — never to pad runtime.`
}

/**
 * Beat volume for scene revision.
 *
 * The target is a density hint. MAX_BEATS_PER_SCENE is the technical
 * per-scene ceiling: a composition past it is split into the next scene, not
 * cut down to fit. A scene set below the script-wide hint was set there
 * because the default produced invented business, so that block still forbids
 * padding toward the hint.
 */
export function buildRevisionBeatVolumeBlock(targetBeats = TARGET_BEATS_PER_SCENE): string {
  if (targetBeats < TARGET_BEATS_PER_SCENE) {
    return `BEAT VOLUME (TARGET IS ${targetBeats} FOR THIS SCENE; OVER ${MAX_BEATS_PER_SCENE} BEATS IS SPLIT):
• Aim for ~${targetBeats} beats in the revised scene. This scene has been set deliberately short, below the ${TARGET_BEATS_PER_SCENE}-beat figure used elsewhere in the script.
• Do NOT pad toward ${TARGET_BEATS_PER_SCENE}. A scene of this kind does not contain that much story, and beats invented to reach a number add nothing an audience will feel.
• Going a beat or two over is acceptable when the story genuinely needs it. Do not invent a long sequence to fill a box.
• If the honest composition exceeds ${MAX_BEATS_PER_SCENE} beats, keep those beats. The system splits the overflow into the next scene. Do not drop shots to fit the technical limit.
• Spend the beats you have on what is worth seeing. Fewer, stronger images beat a longer sequence of filler.
• Intervening action beats only when they add NEW visual information — never to pad runtime.`
  }
  return `BEAT VOLUME (TARGET IS ${targetBeats}; OVER ${MAX_BEATS_PER_SCENE} BEATS IS SPLIT):
• You are creatively unbound. Compose the exact number of beats this scene needs to flow. Aim near ~${targetBeats} beats when that serves the story. Do not pad to the number and do not cut action to stay under ${MAX_BEATS_PER_SCENE}.
• The original beat count is NOT a target to match. Returning a thin scene because the original was thin is a failure when the story needed more room — and filling the ceiling is not the target either.
• If the honest composition exceeds ${MAX_BEATS_PER_SCENE} beats, keep writing and return every beat. The system splits the overflow into the next scene (Scene NA, Scene NB) and carries cast, location, time of day, and environment forward.
• You have room to add the beats the story needs to land: reactions, reversals, and visual turns the original skipped.
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
