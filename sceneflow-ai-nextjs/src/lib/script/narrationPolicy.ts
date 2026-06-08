/**
 * Narration policy: resolves Blueprint + format intent, builds prompt sections,
 * and enforces narration limits on generated scripts.
 */

import { toCanonicalName } from '@/lib/character/canonical'
import {
  applyBeatsToScene,
  isNarratorBeat,
} from '@/lib/script/beatMigration'
import { isCinematicBookendScene } from '@/lib/script/cinematicBookends'
import {
  getNarrationGuidelines,
  getSettingsForFormat,
  type NarrationMode,
} from '@/lib/script/scriptGenerationRules'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
  type SceneBeat,
} from '@/lib/script/segmentTypes'

const NARRATOR_ROLE_PATTERN = /narrator|voiceover|voice-over|v\.?o\.?/i

export type NarrationPolicy = {
  mode: NarrationMode
  /** True when format or Blueprint explicitly calls for voiceover. */
  allowNarration: boolean
  /** True when narration beats may appear in main content scenes (not just bookends). */
  allowPerSceneNarration: boolean
  maxNarrationPerScene: number
  allowedPositions: ('opening' | 'closing' | 'act_transition' | 'anywhere')[]
  blueprintHasNarrator: boolean
}

export function treatmentHasNarratorCharacter(
  treatment?: { character_descriptions?: Array<{ name?: string; role?: string }> }
): boolean {
  const chars = treatment?.character_descriptions ?? []
  return chars.some((c) => {
    const role = c.role ?? ''
    const name = c.name ?? ''
    return NARRATOR_ROLE_PATTERN.test(role) || NARRATOR_ROLE_PATTERN.test(name)
  })
}

export function resolveNarrationPolicy(opts: {
  format: string
  treatment?: { character_descriptions?: Array<{ name?: string; role?: string }> }
  contentIntent?: string
}): NarrationPolicy {
  const settings = getSettingsForFormat(opts.format)
  const mode = settings.narrationMode
  const guidelines = getNarrationGuidelines(mode)
  const blueprintHasNarrator = treatmentHasNarratorCharacter(opts.treatment)

  const allowNarration = mode !== 'minimal' || blueprintHasNarrator
  const allowPerSceneNarration =
    mode === 'narrative-driven' ||
    mode === 'moderate' ||
    (mode === 'minimal' && blueprintHasNarrator)

  return {
    mode,
    allowNarration,
    allowPerSceneNarration,
    maxNarrationPerScene: guidelines.maxNarrationPerScene,
    allowedPositions: guidelines.allowedPositions,
    blueprintHasNarrator,
  }
}

function isTitleBookend(scene: Record<string, unknown>): boolean {
  if (scene.cinematicType === 'title') return true
  const heading = String(scene.heading ?? '').toLowerCase()
  return (
    heading.includes('title sequence') ||
    heading.includes('title card') ||
    heading.includes('opening title')
  )
}

/** Whether a scene may retain any narration / NARRATOR content under the policy. */
export function sceneAllowsNarration(
  scene: Record<string, unknown>,
  sceneIndex: number,
  totalScenes: number,
  policy: NarrationPolicy
): boolean {
  if (policy.allowPerSceneNarration) return true

  if (policy.allowedPositions.includes('anywhere')) return true

  if (isTitleBookend(scene)) {
    return policy.allowedPositions.includes('opening')
  }

  if (isCinematicBookendScene(scene) && scene.cinematicType === 'outro') {
    return policy.allowedPositions.includes('closing')
  }

  if (sceneIndex === 0 && policy.allowedPositions.includes('opening')) return true
  if (sceneIndex === totalScenes - 1 && policy.allowedPositions.includes('closing')) {
    return true
  }

  return false
}

export function isNarratorDialogueEntry(entry: Record<string, unknown>): boolean {
  if (entry.kind === 'narration') return true
  if (entry.characterId === NARRATOR_CHARACTER_ID) return true
  if (
    typeof entry.character === 'string' &&
    toCanonicalName(entry.character) === toCanonicalName(NARRATOR_CHARACTER)
  ) {
    return true
  }
  if (typeof entry.character === 'string' && NARRATOR_ROLE_PATTERN.test(entry.character)) {
    return true
  }
  return false
}

function stripNarrationFromScene(scene: Record<string, unknown>): Record<string, unknown> {
  const filteredDialogue = Array.isArray(scene.dialogue)
    ? (scene.dialogue as Array<Record<string, unknown>>).filter((d) => !isNarratorDialogueEntry(d))
    : []

  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const filteredBeats = (scene.beats as SceneBeat[]).filter((b) => !isNarratorBeat(b))
    const base = { ...scene, dialogue: filteredDialogue, narration: '' }
    return applyBeatsToScene(base, filteredBeats)
  }

  return {
    ...scene,
    narration: '',
    dialogue: filteredDialogue,
  }
}

/** Post-generation safety net: remove narration from scenes the policy disallows. */
export function enforceNarrationPolicyOnScenes(
  scenes: Record<string, unknown>[],
  policy: NarrationPolicy
): Record<string, unknown>[] {
  const total = scenes.length
  return scenes.map((scene, index) => {
    if (sceneAllowsNarration(scene, index, total, policy)) {
      return scene
    }
    return stripNarrationFromScene(scene)
  })
}

export function buildNarrationPromptSection(policy: NarrationPolicy): string {
  if (policy.mode === 'narrative-driven') {
    return `
NARRATION REQUIREMENTS (NARRATIVE-DRIVEN):
• Narration is a core storytelling device for this format
• Include "narration" beats and/or scene.narration where they add context visuals cannot convey
• Use character "NARRATOR" for narration beats
• Balance narration with action beats — never more than 2 consecutive spoken beats without an action beat`
  }

  if (policy.mode === 'moderate') {
    return `
NARRATION REQUIREMENTS (MODERATE):
• Use narration sparingly — max ONE narration block per scene
• Prefer at opening, act transitions, and closing
• Include "narration" field or narration beats only when they add information action cannot show
• Convert internal monologue into action/reaction shots when possible`
  }

  if (policy.blueprintHasNarrator) {
    return `
NARRATION REQUIREMENTS (BLUEPRINT NARRATOR):
• A Narrator character is defined in the Blueprint — use NARRATOR dialogue/narration beats only when that character would speak
• Do NOT add omniscient voiceover to every scene — reserve narration for moments the Blueprint implies
• Middle scenes should still prioritize visual storytelling and character dialogue`
  }

  return `
NARRATION REQUIREMENTS (VISUAL / MINIMAL — CRITICAL):
• Do NOT add voiceover or narration to main content scenes
• scene.narration MUST be "" (empty string) for all scenes except optional title-sequence hook
• Do NOT include kind: "narration" beats in main content scenes
• Do NOT use character "NARRATOR" in dialogue for middle scenes
• Show the story through action lines and character dialogue — the audience must SEE, not be TOLD
• Optional: ONE brief narration beat in the title sequence (scene 1) only — never in bookend credits`
}

export function buildNarrationSchemaExample(policy: NarrationPolicy): string {
  if (policy.allowPerSceneNarration) {
    return `        {"kind": "narration", "character": "NARRATOR", "line": "[calm, measured] Voiceover when appropriate..."},`
  }
  return `        /* NO narration beats in main content scenes — action and dialogue only */`
}

export function buildNarrationLegacyFieldHint(policy: NarrationPolicy): string {
  if (policy.allowPerSceneNarration) {
    return '"narration": "Optional legacy narration summary",'
  }
  return '"narration": "",  // MUST be empty for visual-first formats'
}

export function buildBeatTimelineNarrationRules(policy: NarrationPolicy): string {
  if (policy.mode === 'narrative-driven') {
    return `• Each scene MUST include an ordered "beats" array mixing kind: "dialogue", "action", "narration"
• "narration" beats use character "NARRATOR" with spoken line`
  }

  if (policy.allowPerSceneNarration) {
    return `• Each scene MUST include an ordered "beats" array mixing kind: "dialogue", "action", and optional "narration"
• Use "narration" beats sparingly (max one per scene)`
  }

  return `• Each scene MUST include an ordered "beats" array with kind: "dialogue" and "action" ONLY
• Do NOT include kind: "narration" beats in main content scenes
• Optional single narration beat in title sequence (cinematicType: "title") only`
}

/** Count narration words across legacy fields, dialogue, and beats (for Script AR). */
export function countNarrationWordsInScene(scene: Record<string, unknown>): number {
  let words = 0

  const countText = (text: unknown) => {
    if (typeof text !== 'string' || !text.trim()) return
    words += text.trim().split(/\s+/).filter((w) => w.length > 0).length
  }

  countText(scene.narration)

  if (Array.isArray(scene.dialogue)) {
    for (const d of scene.dialogue as Array<Record<string, unknown>>) {
      if (isNarratorDialogueEntry(d)) {
        countText(d.line ?? d.text)
      }
    }
  }

  if (Array.isArray(scene.beats)) {
    for (const beat of scene.beats as SceneBeat[]) {
      if (isNarratorBeat(beat)) {
        countText(beat.line)
      }
    }
  }

  return words
}

export function calculateShowVsTellMetrics(
  scenes: Array<Record<string, unknown>>
): { ratio: number; narrationWords: number; actionWords: number; dialogueWords: number } {
  let narrationWords = 0
  let actionWords = 0
  let dialogueWords = 0

  for (const scene of scenes) {
    narrationWords += countNarrationWordsInScene(scene)

    if (scene.action) {
      actionWords += String(scene.action)
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length
    }

    if (Array.isArray(scene.dialogue)) {
      for (const d of scene.dialogue as Array<Record<string, unknown>>) {
        if (isNarratorDialogueEntry(d)) continue
        const line = d.line ?? d.text
        if (typeof line === 'string') {
          dialogueWords += line.split(/\s+/).filter((w: string) => w.length > 0).length
        }
      }
    }
  }

  const totalWords = narrationWords + actionWords + dialogueWords
  const ratio = totalWords > 0 ? (narrationWords / totalWords) * 100 : 0

  return { ratio, narrationWords, actionWords, dialogueWords }
}

export function buildScriptARShowVsTellGuidance(policy: NarrationPolicy): {
  autoScoreCap: number
  autoCapReason: string
  formatContext: string
} {
  if (policy.mode === 'narrative-driven') {
    return {
      autoScoreCap: 100,
      autoCapReason: '',
      formatContext:
        'This is a narrative-driven format (documentary/news). Voiceover and narration are expected storytelling tools. Do NOT penalize appropriate narration or recommend removing voiceover unless it is clearly redundant.',
    }
  }

  if (!policy.allowNarration && !policy.blueprintHasNarrator) {
    return {
      autoScoreCap: 100,
      autoCapReason: '',
      formatContext:
        'This is a visual-first fiction/drama script. Narration was NOT requested in the Blueprint. Do NOT recommend adding voiceover. Only recommend removing narration if it is clearly excessive omniscient telling in middle scenes.',
    }
  }

  return {
    autoScoreCap: 100,
    autoCapReason: '',
    formatContext:
      'Narration may be used sparingly per format guidelines. Evaluate show-vs-tell fairly for this content type.',
  }
}

export function applyShowVsTellAutoCap(
  ratio: number,
  policy: NarrationPolicy
): { autoScoreCap: number; autoCapReason: string } {
  if (policy.mode === 'narrative-driven') {
    return { autoScoreCap: 100, autoCapReason: '' }
  }

  if (ratio > 40) {
    return {
      autoScoreCap: 82,
      autoCapReason: `Narration comprises ${ratio.toFixed(1)}% of content (>40%). Consider reducing narration.`,
    }
  }
  if (ratio > 30) {
    return {
      autoScoreCap: 92,
      autoCapReason: `Narration comprises ${ratio.toFixed(1)}% of content (>30%). Some narration reduction recommended.`,
    }
  }
  if (ratio > 20) {
    return {
      autoScoreCap: 95,
      autoCapReason: `Narration comprises ${ratio.toFixed(1)}% of content (>20%). Minor narration adjustment may help.`,
    }
  }
  return { autoScoreCap: 100, autoCapReason: '' }
}
