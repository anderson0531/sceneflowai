import { generateText } from '@/lib/vertexai/gemini'
import { getAudienceResonanceModel } from '@/lib/config/modelConfig'
import { buildScriptARShowVsTellGuidance } from '@/lib/script/narrationPolicy'
import type { AnalysisContext, SceneAnalysis } from './types'
import { halveSceneChunk, type SceneChunk } from './chunkPlan'

/**
 * Thinking tokens share max_output_tokens on Gemini 3. Reserve a block for
 * high thinking, then budget per scene so the JSON is not cut off.
 */
const THINKING_RESERVE_TOKENS = 8192
const TOKENS_PER_SCENE = 2000
export const SCENE_PASS_OUTPUT_CAP = 32768

export function scenePassOutputTokens(sceneCount: number, forceCap = false): number {
  if (forceCap) return SCENE_PASS_OUTPUT_CAP
  const count = Math.max(1, sceneCount)
  return Math.min(SCENE_PASS_OUTPUT_CAP, THINKING_RESERVE_TOKENS + count * TOKENS_PER_SCENE)
}

export type ScenePassResult = {
  sceneAnalysis: SceneAnalysis[]
  modelId?: string
  requestedModelId?: string
}

function formatScene(scene: any, sceneNumber: number): string {
  const heading = scene?.heading || 'Untitled'
  const action = scene?.action || 'No action'
  const narration = (scene?.narration || '').trim()
  const dialogue = (scene?.dialogue || [])
    .map((d: any) => `${d?.character || 'UNKNOWN'}: ${d?.line || ''}`)
    .join('\n  ')

  return [
    `Scene ${sceneNumber}: ${heading}`,
    `Action: ${action}`,
    narration ? `Narration: ${narration}` : '',
    dialogue ? `Dialogue:\n  ${dialogue}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildAudienceContext(targetDemographic?: string): string {
  const trimmed = targetDemographic?.trim()
  if (!trimmed) return ''

  const culturallySpecific = /Cultural specificity:/i.test(trimmed)
  const culturalInstruction = culturallySpecific
    ? '\n\nThis audience is CULTURALLY SPECIFIC. Rigorously validate cultural authenticity: character names and identities, language/dialect, customs, faith, humor, and setting. Flag generic, culturally-neutral, or stereotyped elements, and give concrete, culturally-grounded fixes that name the exact element to change.'
    : ''

  return `\nCRITICAL CONTEXT — TARGET AUDIENCE PROFILE:\n${trimmed}\n\nJudge every scene SPECIFICALLY for the audience above.${culturalInstruction}`
}

type ScenePassOptions = {
  /** Single-scene retry already used the full output cap. */
  retriedSingle?: boolean
}

/**
 * Analyzes one chunk of scenes. Every scene in the chunk gets its own entry.
 * A truncated response is split in half and retried inside this call so a
 * durable step recovers instead of repeating the same overflowing prompt.
 */
export async function analyzeSceneChunk(
  context: AnalysisContext,
  chunk: SceneChunk,
  options?: ScenePassOptions
): Promise<ScenePassResult> {
  const { scenesForAnalysis, script, narrationPolicy, targetDemographic, languageBlock } = context
  const scenes = scenesForAnalysis.slice(chunk.startIndex, chunk.endIndex)
  if (!scenes.length) return { sceneAnalysis: [] }

  const { formatContext } = buildScriptARShowVsTellGuidance(narrationPolicy)
  const sceneBlocks = scenes
    .map((scene, i) => formatScene(scene, chunk.startIndex + i + 1))
    .join('\n---\n')

  const firstNumber = chunk.sceneNumbers[0]
  const lastNumber = chunk.sceneNumbers[chunk.sceneNumbers.length - 1]
  const beatLine =
    typeof chunk.blueprintBeatIndex === 'number'
      ? `- Blueprint beat ${chunk.blueprintBeatIndex + 1}${
          chunk.blueprintBeatTitle ? `: ${chunk.blueprintBeatTitle}` : ''
        }. Score only the scenes from this beat that are listed below.`
      : ''

  const prompt = `You are an expert screenplay analyst scoring individual scenes against a deduction rubric.${buildAudienceContext(targetDemographic)}

SCRIPT CONTEXT (for continuity only — score only the scenes listed below):
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Total scenes in script: ${scenesForAnalysis.length}
- You are scoring scenes ${firstNumber} through ${lastNumber}.
${beatLine}

FORMAT / NARRATION CONTEXT:
${formatContext}
Narration policy mode: ${narrationPolicy.mode}${narrationPolicy.blueprintHasNarrator ? ' (Blueprint defines a Narrator character)' : ''}.

SCENES TO ANALYZE:
${sceneBlocks}

## REQUIREMENTS

Analyze EVERY scene listed above — return exactly ${scenes.length} entries, one per scene, using the scene numbers given.

For each scene provide:
- score (1-100): 100 minus the sum of pointsDeducted across that scene's recommendations.
- storyWeight (1-100): narrative importance. Climax or major turning point 80-100, standard scene 40-70, minor transition 10-30.
- pacing: slow | moderate | fast
- tension: low | medium | high
- characterDevelopment: minimal | moderate | strong
- visualPotential: low | medium | high
- notes: one sentence naming what works, or the single most impactful fix.
- recommendations: list EVERY genuine, actionable fix this scene needs — do not stop at an arbitrary number, and do not pad with filler. Each must be a concrete instruction that can be applied on its own, with a priority (high | medium | low) and pointsDeducted (high 10-15, medium 5-9, low 1-4).

Return ONLY valid JSON:
{
  "sceneAnalysis": [
    {"sceneNumber": ${firstNumber}, "sceneHeading": "<heading>", "score": <1-100>, "storyWeight": <1-100>, "pacing": "slow|moderate|fast", "tension": "low|medium|high", "characterDevelopment": "minimal|moderate|strong", "visualPotential": "low|medium|high", "notes": "<one sentence>", "recommendations": [{"text": "<specific fix>", "priority": "high|medium|low", "pointsDeducted": <number>}]}
  ]
}
${languageBlock ?? ''}`

  const maxOutputTokens = scenePassOutputTokens(scenes.length, options?.retriedSingle === true)

  const result = await generateText(prompt, {
    model: getAudienceResonanceModel(),
    temperature: 0.1,
    maxOutputTokens,
    thinkingLevel: 'high',
    responseMimeType: 'application/json',
    timeoutMs: 180000,
    maxRetries: 1,
    seed: context.contentSeed + chunk.index + (options?.retriedSingle ? 1 : 0),
  })

  if (result.finishReason === 'SAFETY') {
    throw new Error(
      `Scene analysis for scenes ${firstNumber}-${lastNumber} was blocked by safety filters.`
    )
  }
  if (result.finishReason === 'MAX_TOKENS') {
    const halves = halveSceneChunk(chunk)
    if (halves) {
      console.warn(
        `[Audience Resonance] Scenes ${firstNumber}-${lastNumber} truncated; splitting into ${halves[0].sceneNumbers[0]}-${halves[0].sceneNumbers[halves[0].sceneNumbers.length - 1]} and ${halves[1].sceneNumbers[0]}-${halves[1].sceneNumbers[halves[1].sceneNumbers.length - 1]}`
      )
      const sceneAnalysis: SceneAnalysis[] = []
      let modelId = result.modelId
      let requestedModelId = result.requestedModelId
      for (const half of halves) {
        const part = await analyzeSceneChunk(context, half)
        sceneAnalysis.push(...part.sceneAnalysis)
        modelId = part.modelId ?? modelId
        requestedModelId = part.requestedModelId ?? requestedModelId
      }
      return { sceneAnalysis, modelId, requestedModelId }
    }
    if (!options?.retriedSingle) {
      console.warn(
        `[Audience Resonance] Scene ${firstNumber} truncated; retrying at the output cap`
      )
      return analyzeSceneChunk(context, chunk, { retriedSingle: true })
    }
    throw new Error(
      `Scene analysis for scenes ${firstNumber}-${lastNumber} was truncated. Try a smaller chunk size.`
    )
  }

  const parsed = parseSceneAnalysis(result.text)

  return {
    sceneAnalysis: parsed,
    modelId: result.modelId,
    requestedModelId: result.requestedModelId,
  }
}

function parseSceneAnalysis(raw: string): SceneAnalysis[] {
  if (!raw) return []
  let jsonText = raw.trim()
  const fenced = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) jsonText = fenced[1].trim()

  let payload: any
  try {
    payload = JSON.parse(jsonText)
  } catch {
    throw new Error('Failed to parse scene analysis JSON')
  }

  const list = Array.isArray(payload) ? payload : payload?.sceneAnalysis
  if (!Array.isArray(list)) return []

  return list
    .filter((entry: any) => typeof entry?.sceneNumber === 'number')
    .map((entry: any) => ({
      sceneNumber: entry.sceneNumber,
      sceneHeading: entry.sceneHeading || 'Untitled',
      score: typeof entry.score === 'number' ? entry.score : 70,
      storyWeight: typeof entry.storyWeight === 'number' ? entry.storyWeight : undefined,
      pacing: entry.pacing ?? 'moderate',
      tension: entry.tension ?? 'medium',
      characterDevelopment: entry.characterDevelopment ?? 'moderate',
      visualPotential: entry.visualPotential ?? 'medium',
      notes: entry.notes || '',
      recommendations: Array.isArray(entry.recommendations)
        ? entry.recommendations
            .map((rec: any) =>
              typeof rec === 'string'
                ? { text: rec, priority: 'medium' as const }
                : {
                    text: rec?.text || '',
                    priority: rec?.priority || 'medium',
                    pointsDeducted:
                      typeof rec?.pointsDeducted === 'number' ? rec.pointsDeducted : undefined,
                  }
            )
            .filter((rec: { text: string }) => rec.text)
        : [],
    }))
}
