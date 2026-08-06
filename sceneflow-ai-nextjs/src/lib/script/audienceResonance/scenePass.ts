import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { buildScriptARShowVsTellGuidance } from '@/lib/script/narrationPolicy'
import type { AnalysisContext, SceneAnalysis } from './types'
import type { SceneChunk } from './chunkPlan'

/** Per-scene token allowance; recommendation count is uncapped, so keep headroom. */
const TOKENS_PER_SCENE = 900
const MIN_CHUNK_TOKENS = 4000

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

/**
 * Analyzes one chunk of scenes. Every scene in the chunk gets its own entry —
 * there is no sampling and no fixed cap on recommendations per scene, because
 * each chunk is a separate request and no longer competes for one token budget.
 */
export async function analyzeSceneChunk(
  context: AnalysisContext,
  chunk: SceneChunk
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

  const prompt = `You are an expert screenplay analyst scoring individual scenes against a deduction rubric.${buildAudienceContext(targetDemographic)}

SCRIPT CONTEXT (for continuity only — score only the scenes listed below):
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Total scenes in script: ${scenesForAnalysis.length}
- You are scoring scenes ${firstNumber} through ${lastNumber}.

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

  const maxOutputTokens = Math.max(MIN_CHUNK_TOKENS, scenes.length * TOKENS_PER_SCENE)

  const result = await generateText(prompt, {
    model: getGeminiTextModel('pro'),
    temperature: 0.1,
    maxOutputTokens,
    thinkingLevel: 'high',
    responseMimeType: 'application/json',
    timeoutMs: 180000,
    maxRetries: 1,
    seed: context.contentSeed + chunk.index,
  })

  if (result.finishReason === 'SAFETY') {
    throw new Error(
      `Scene analysis for scenes ${firstNumber}-${lastNumber} was blocked by safety filters.`
    )
  }
  if (result.finishReason === 'MAX_TOKENS') {
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
