import { generateText } from '@/lib/vertexai/gemini'
import { getAudienceResonanceModel } from '@/lib/config/modelConfig'
import {
  applyShowVsTellAutoCap,
  buildScriptARShowVsTellGuidance,
} from '@/lib/script/narrationPolicy'
import type { SceneChunk } from './chunkPlan'
import type { AnalysisContext, Deduction, ReviewRecommendation, SceneAnalysis, ScoreCategory } from './types'
import { DEFAULT_CATEGORIES } from './scoring'

const SYNTHESIS_OUTPUT_CAP = 32768
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

export type SynthesisResult = {
  categories: ScoreCategory[]
  deductions: Deduction[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: ReviewRecommendation[]
  targetDemographic: string
  emotionalImpact: string
  suggestedOverallScore?: number
  modelId?: string
  requestedModelId?: string
}

function topFixes(scene: SceneAnalysis, limit = 2): string {
  const recs = [...(scene.recommendations || [])]
    .filter((rec) => rec.text)
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
    )
    .slice(0, limit)
  return recs.map((rec) => `    - [${rec.priority}] ${rec.text}`).join('\n')
}

function formatSceneLine(scene: SceneAnalysis): string {
  const recs = topFixes(scene)
  return [
    `  Scene ${scene.sceneNumber} (${scene.sceneHeading}) score ${scene.score}, weight ${scene.storyWeight ?? 'n/a'}`,
    `    pacing ${scene.pacing}, tension ${scene.tension}, character ${scene.characterDevelopment}, visual ${scene.visualPotential}`,
    scene.notes ? `    notes: ${scene.notes}` : '',
    recs ? `    top fixes:\n${recs}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Deterministic summary of each analysis batch. Full per-scene recommendations
 * stay on the review; synthesis only needs the highest-priority fixes.
 */
export function buildBatchDigest(sceneAnalysis: SceneAnalysis[], chunks?: SceneChunk[]): string {
  if (!sceneAnalysis.length) return 'No scene analysis available.'

  const byNumber = new Map(sceneAnalysis.map((scene) => [scene.sceneNumber, scene]))
  const batches: Array<{ label: string; scenes: SceneAnalysis[] }> = []

  if (chunks?.length) {
    for (const chunk of chunks) {
      const scenes = chunk.sceneNumbers
        .map((n) => byNumber.get(n))
        .filter((scene): scene is SceneAnalysis => Boolean(scene))
      if (!scenes.length) continue
      const range = `${scenes[0].sceneNumber}-${scenes[scenes.length - 1].sceneNumber}`
      const beat =
        typeof chunk.blueprintBeatIndex === 'number'
          ? `Blueprint beat ${chunk.blueprintBeatIndex + 1}${
              chunk.blueprintBeatTitle ? ` "${chunk.blueprintBeatTitle}"` : ''
            } — scenes ${range}`
          : `Scenes ${range}`
      batches.push({ label: beat, scenes })
    }
  } else {
    batches.push({ label: 'All analyzed scenes', scenes: sceneAnalysis })
  }

  return batches
    .map((batch) => [batch.label, ...batch.scenes.map(formatSceneLine)].join('\n'))
    .join('\n')
}

/**
 * Turns the per-scene passes into a script-level verdict: dimensional scores,
 * narrative analysis, strengths, and cross-script recommendations.
 */
export async function synthesizeReview(
  context: AnalysisContext,
  sceneAnalysis: SceneAnalysis[],
  chunks?: SceneChunk[]
): Promise<SynthesisResult> {
  const { script, showVsTellMetrics, narrationPolicy, targetDemographic, languageBlock } = context
  const { formatContext } = buildScriptARShowVsTellGuidance(narrationPolicy)
  const { autoScoreCap, autoCapReason } = applyShowVsTellAutoCap(
    showVsTellMetrics.ratio,
    narrationPolicy
  )

  const audienceContext = targetDemographic?.trim()
    ? `\nTARGET AUDIENCE PROFILE:\n${targetDemographic.trim()}\n\nEvaluate resonance specifically for this audience.`
    : ''

  const prompt = `You are an expert screenplay analyst producing a script-level verdict. Per-scene analysis has already been completed and is provided below — synthesize it, do not repeat it.${audienceContext}

Script Details:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Scenes: ${context.scenesForAnalysis.length}
- Characters: ${script.characters?.length || 0}

FORMAT / NARRATION CONTEXT:
${formatContext}
Narration policy mode: ${narrationPolicy.mode}${narrationPolicy.blueprintHasNarrator ? ' (Blueprint defines a Narrator character)' : ''}.

PRE-CALCULATED METRICS:
- Show vs Tell Ratio: ${showVsTellMetrics.ratio.toFixed(1)}% narration
- Narration Words: ${showVsTellMetrics.narrationWords}
- Action Words: ${showVsTellMetrics.actionWords}
- Dialogue Words: ${showVsTellMetrics.dialogueWords}
${autoCapReason ? `- AUTO CAP: ${autoCapReason}` : ''}

BATCHED SCENE ANALYSIS (already scored; each block is one analysis batch):
${buildBatchDigest(sceneAnalysis, chunks)}

## EVALUATION DIMENSIONS (score each 1-100)

1. Dialogue Subtext (weight 20) — Do characters speak around what they mean?
2. Structural Integrity (weight 20) — Does the act structure work? Are turning points clear?
3. Emotional Arc (weight 20) — Is the emotional journey earned? Does it build and pay off?
4. Visual Storytelling (weight 15) — Does the script think cinematically?
5. Pacing & Rhythm (weight 15) — Does the script breathe? Are scene lengths varied?
6. Show vs Tell Ratio (weight 10) — Is the story dramatized rather than narrated?

## SCORE CALIBRATION

- 90-100: Exceptional, near production ready.
- 80-89: Very good, strong craft with refinements needed.
- 75-79: Good, solid foundation with identifiable gaps.
- 65-74: Developing, clear potential with meaningful craft issues.
- 50-64: Working draft needing significant revision.
- Below 50: Early concept stage.

Be fair and constructive — a good first draft can score 75-85. Ground every strength and improvement in a specific scene number drawn from the analysis above.

Script-level recommendations must address cross-scene problems (structure, arc, escalation, through-lines) rather than restating individual scene fixes. List every genuine one.

Return ONLY valid JSON:
{
  "categories": [
    {"name": "Dialogue Subtext", "score": <1-100>, "weight": 20},
    {"name": "Structural Integrity", "score": <1-100>, "weight": 20},
    {"name": "Emotional Arc", "score": <1-100>, "weight": 20},
    {"name": "Visual Storytelling", "score": <1-100>, "weight": 15},
    {"name": "Pacing & Rhythm", "score": <1-100>, "weight": 15},
    {"name": "Show vs Tell Ratio", "score": <1-100>, "weight": 10}
  ],
  "deductions": [{"reason": "<issue>", "points": <number>, "category": "<category>"}],
  "overallScore": <estimate, max ${autoScoreCap}>,
  "analysis": "<2-3 paragraphs referencing specific scenes>",
  "strengths": ["<specific strength with scene reference>"],
  "improvements": ["<specific issue with scene reference>"],
  "recommendations": [{"text": "<cross-scene fix>", "priority": "critical|high|medium|optional", "category": "<category>"}],
  "targetDemographic": "<primary audience>",
  "emotionalImpact": "<expected emotional response>"
}
${languageBlock ?? ''}`

  const result = await generateText(prompt, {
    model: getAudienceResonanceModel(),
    temperature: 0.15,
    maxOutputTokens: SYNTHESIS_OUTPUT_CAP,
    thinkingLevel: 'high',
    responseMimeType: 'application/json',
    timeoutMs: 180000,
    maxRetries: 1,
    seed: context.contentSeed,
  })

  if (result.finishReason === 'SAFETY') {
    throw new Error('Script synthesis was blocked by safety filters.')
  }
  if (result.finishReason === 'MAX_TOKENS') {
    throw new Error('Script synthesis was truncated.')
  }

  let jsonText = (result.text || '').trim()
  const fenced = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) jsonText = fenced[1].trim()

  let payload: any
  try {
    payload = JSON.parse(jsonText)
  } catch {
    throw new Error('Failed to parse audience resonance synthesis JSON')
  }

  const recommendations: ReviewRecommendation[] = Array.isArray(payload?.recommendations)
    ? payload.recommendations
        .map((rec: any) =>
          typeof rec === 'string'
            ? { text: rec, priority: 'medium' as ReviewRecommendation['priority'] }
            : { text: rec?.text || '', priority: rec?.priority || 'medium', category: rec?.category }
        )
        .filter((rec: ReviewRecommendation) => rec.text)
    : []

  return {
    categories: Array.isArray(payload?.categories) && payload.categories.length
      ? payload.categories
      : DEFAULT_CATEGORIES,
    deductions: Array.isArray(payload?.deductions) ? payload.deductions : [],
    analysis: payload?.analysis || 'Analysis not available.',
    strengths: Array.isArray(payload?.strengths) ? payload.strengths : [],
    improvements: Array.isArray(payload?.improvements) ? payload.improvements : [],
    recommendations,
    targetDemographic: payload?.targetDemographic || 'General audience',
    emotionalImpact: payload?.emotionalImpact || 'Varied emotional response',
    suggestedOverallScore:
      typeof payload?.overallScore === 'number' ? payload.overallScore : undefined,
    modelId: result.modelId,
    requestedModelId: result.requestedModelId,
  }
}
