import { generateText } from '@/lib/vertexai/gemini'
import { getAudienceResonanceModel } from '@/lib/config/modelConfig'
import { recommendationId } from '@/lib/script/audienceResonance/highImpact'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  formatPolishBeats,
  formatPolishEdgeBeat,
  polishSceneDescription,
  polishSceneHeading,
  polishSceneKeyProps,
  scenePolishBeatFingerprint,
} from './formatPolishBeats'
import {
  POLISH_CATEGORIES,
  type AnalyzeScenePolishInput,
  type PolishCategory,
  type PolishPriority,
  type PolishRecommendation,
  type ScenePolishAnalysis,
} from './types'

const PRIORITIES: readonly PolishPriority[] = ['high', 'medium', 'low']

export function isPolishCategory(value: unknown): value is PolishCategory {
  return typeof value === 'string' && (POLISH_CATEGORIES as readonly string[]).includes(value)
}

function uniquePositiveInts(values: unknown): number[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<number>()
  const out: number[] = []
  for (const value of values) {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(n) || n < 1 || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out.sort((a, b) => a - b)
}

export function buildPolishPrompt(input: AnalyzeScenePolishInput): string {
  const { scene, previousScene, nextScene, languageBlock } = input
  const heading = polishSceneHeading(scene)
  const description = polishSceneDescription(scene)
  const keyProps = polishSceneKeyProps(scene)
  const beatsText = formatPolishBeats(scene)

  return `You are a continuity editor for a filmed scene. Audience Resonance already scored craft (pacing, tension, character, visual potential). Your job is ONLY beat-to-beat mechanics: flow, alignment, and physical continuity on the ordered BEATS timeline.

SCENE HEADING: ${heading}

INTENDED STORY (scene description — what the beats should realize):
${description || 'No scene description provided.'}

SCENE KEY PROPS: ${keyProps.length > 0 ? keyProps.join(', ') : 'none listed'}

BEATS (source of truth — 1-based numbers; production shoots these, not the prose):
${beatsText}

PREVIOUS SCENE LAST BEAT (cut-in continuity only — do not rewrite that scene):
${previousScene ? formatPolishEdgeBeat(previousScene, 'last') : 'none'}

NEXT SCENE FIRST BEAT (cut-out continuity only — do not rewrite that scene):
${nextScene ? formatPolishEdgeBeat(nextScene, 'first') : 'none'}

WALK THE BEATS IN ORDER. Track each character's position, facing, and held props, plus door/damage/object state. Flag only genuine contradictions or missing causal links.

FLAG:
- prop_state: already holding / wearing / using something, then "picks up" / "grabs" / "takes" the same object; put down then still gripping; prop teleports
- action_order: duplicated pickup, restated staging, or an effect before its cause
- spatial: facing or position jumps with no turn, move, or cut that would explain it
- dialogue_mismatch: a line asserts an action that has not happened yet, or that already happened
- redundancy: adjacent beats restage the same visual without new information
- missing_link: a jump that needs a connecting beat (a put-down, a turn, a reaction) to read
- direction_conflict: beatDirection (props, prop-interaction, blocking, frozenMoment) contradicts the beat text
- beats that fail to realize the intended scene description

EXAMPLE (must flag): Beat 1 action "Gideon has a wrench in his hand" with prop-interaction "holds the wrench" then Beat 2 action "Gideon picks up the wrench". That is prop_state. Instruction: "Beat 2: Gideon already holds the wrench from Beat 1 — change 'picks up the wrench' to 'tightens his grip on the wrench'; keep Beat 1 as the pickup (or move the pickup to Beat 1 and start Beat 2 already holding it)."

DO NOT FLAG:
- Audience-craft notes (raise tension, add humor, deepen character, show-don't-tell as a theme)
- CONTINUE-join / frame-reorder warnings
- Valid "tightens his grip" / "adjusts the wrench" after already holding it
- Artistic repetition that is clearly a hold or insert
- Excluded beats

Each recommendation.text is a single Co-Director instruction that NAMES the beat numbers to edit and the concrete replacement (not "fix continuity"). reason is the short gap for the card.

If the timeline is aligned, return an empty recommendations array and notes that say the beat sequence looks aligned.

Return ONLY valid JSON:
{
  "notes": "<one sentence>",
  "recommendations": [
    {
      "text": "<Co-Director instruction naming Beat N>",
      "reason": "<short gap>",
      "priority": "high|medium|low",
      "category": "prop_state|action_order|spatial|dialogue_mismatch|redundancy|missing_link|direction_conflict",
      "beatIndices": [1, 2]
    }
  ]
}
${languageBlock ?? ''}`
}

export function parsePolishAnalysis(
  raw: string,
  scene: AnalyzeScenePolishInput['scene']
): Omit<ScenePolishAnalysis, 'analyzedAt' | 'beatFingerprint' | 'modelId' | 'requestedModelId'> {
  if (!raw) {
    return { notes: '', issueCount: 0, recommendations: [] }
  }
  let jsonText = raw.trim()
  const fenced = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) jsonText = fenced[1].trim()

  let payload: unknown
  try {
    payload = JSON.parse(jsonText)
  } catch {
    throw new Error('Failed to parse scene polish JSON')
  }

  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const beats = getSceneBeats(scene as Record<string, unknown>)
  const rawRecs = Array.isArray(record.recommendations) ? record.recommendations : []

  const recommendations: PolishRecommendation[] = rawRecs
    .map((entry, index) => {
      const rec = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
      const text = typeof rec.text === 'string' ? rec.text.trim() : ''
      if (!text) return null
      const beatIndices = uniquePositiveInts(rec.beatIndices).filter(
        (n) => beats.length === 0 || n <= beats.length
      )
      const beatIds = beatIndices
        .map((n) => beats[n - 1]?.beatId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
      const priority = PRIORITIES.includes(rec.priority as PolishPriority)
        ? (rec.priority as PolishPriority)
        : 'medium'
      const category = isPolishCategory(rec.category) ? rec.category : 'action_order'
      const reason = typeof rec.reason === 'string' ? rec.reason.trim() : undefined
      const recWithText = { text, reason, priority, category, beatIndices, beatIds }
      return {
        ...recWithText,
        id:
          typeof rec.id === 'string' && rec.id.trim()
            ? rec.id.trim()
            : recommendationId(recWithText, index),
      } satisfies PolishRecommendation
    })
    .filter((rec): rec is PolishRecommendation => rec !== null)

  const notes = typeof record.notes === 'string' ? record.notes.trim() : ''
  return {
    notes,
    issueCount: recommendations.length,
    recommendations,
  }
}

export async function analyzeScenePolish(
  input: AnalyzeScenePolishInput
): Promise<ScenePolishAnalysis> {
  const prompt = buildPolishPrompt(input)
  const result = await generateText(prompt, {
    model: getAudienceResonanceModel(),
    temperature: 0.1,
    maxOutputTokens: 4000,
    thinkingLevel: 'high',
    responseMimeType: 'application/json',
    timeoutMs: 60000,
    maxRetries: 1,
  })

  if (result.finishReason === 'SAFETY') {
    throw new Error('Scene polish was blocked by safety filters.')
  }
  if (result.finishReason === 'MAX_TOKENS') {
    throw new Error('Scene polish was truncated. Try a shorter scene.')
  }

  const parsed = parsePolishAnalysis(result.text, input.scene)
  return {
    ...parsed,
    beatFingerprint: scenePolishBeatFingerprint(input.scene),
    analyzedAt: new Date().toISOString(),
    modelId: result.modelId,
    requestedModelId: result.requestedModelId,
  }
}
