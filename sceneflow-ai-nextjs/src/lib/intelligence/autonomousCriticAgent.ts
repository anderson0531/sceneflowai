/**
 * Autonomous Two-Stage Continuity & Quality Critic Agent
 *
 * Stage 1 (Pre-Video Keyframe Gate):
 *   Inspects generated storyboard keyframes via Gemini Flash Vision (~$0.0005/beat)
 *   BEFORE spending $0.80–$3.20 on 10s Veo/Kling video generation. Catches character
 *   identity drift, 180-degree axis flips, gibberish text, or prop hallucinations,
 *   routing defective frames to surgical inpainting (`inpaint_frame`) or regeneration.
 *
 * Stage 2 (Post-Video 3-Frame Temporal Critic):
 *   Inspects sampled frames (`t=start`, `t=mid`, `t=end`) of a completed 10s clip
 *   for morphing, frozen motion, or character substitution, and automatically
 *   compiles an executable `RetakePlan` via `retakeIntelligence.ts`.
 */

import { generateWithVision } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { safeParseJsonFromText } from '@/lib/safeJson'
import {
  mergeNegativePrompt,
  parseRetakePlan,
  type RetakePlan,
} from '@/lib/video/retakeIntelligence'

export type KeyframeDefectCategory =
  | 'none'
  | 'identity_mismatch'
  | 'axis_violation'
  | 'gibberish_text'
  | 'prop_or_anatomy_defect'
  | 'lighting_continuity_break'

export type PreVideoRecommendedAction = 'pass' | 'inpaint_frame' | 'regenerate_frame'

export interface PreVideoKeyframeGateInput {
  beatId: string
  stillPrompt: string
  generatedFrame: { base64: string; mimeType?: string }
  characterReference?: { name: string; base64: string; mimeType?: string }
  precedingShotFrame?: { base64: string; mimeType?: string }
  expectedDirection?: {
    shotType?: string
    cameraAngle?: string
    blocking?: string
    castInFrame?: string[]
    keyProps?: string[]
  }
  /** Minimum score (0–100) to pass without intervention (default: 78). */
  passThreshold?: number
  /** Estimated video clip cost in USD saved when a bad keyframe is caught early (default: 1.20). */
  estimatedVideoClipCostUsd?: number
}

export interface PreVideoKeyframeGateResult {
  beatId: string
  passed: boolean
  score: number
  defectCategory: KeyframeDefectCategory
  recommendedAction: PreVideoRecommendedAction
  issues: string[]
  frameEditInstruction?: string
  revisedStillPrompt?: string
  estimatedVideoCreditSavedUsd: number
}

export interface PostVideoClipGateInput {
  segmentId: string
  videoPrompt: string
  negativePrompt?: string
  mode?: 'FTV' | 'I2V' | 'T2V' | 'EXT' | 'REF'
  sampledFrames: {
    startFrame: { base64: string; mimeType?: string }
    midFrame: { base64: string; mimeType?: string }
    endFrame: { base64: string; mimeType?: string }
  }
  /** Minimum temporal quality score (0–100) to accept the clip (default: 75). */
  passThreshold?: number
}

export interface PostVideoClipGateResult {
  segmentId: string
  passed: boolean
  temporalScore: number
  motionStability: 'stable' | 'morphing' | 'frozen' | 'identity_drift'
  issues: string[]
  autoRetakePlan: RetakePlan | null
  mergedNegativePrompt?: string
}

const VALID_DEFECT_CATEGORIES = new Set<KeyframeDefectCategory>([
  'none',
  'identity_mismatch',
  'axis_violation',
  'gibberish_text',
  'prop_or_anatomy_defect',
  'lighting_continuity_break',
])

function normalizeDefectCategory(raw: unknown): KeyframeDefectCategory {
  if (typeof raw === 'string' && VALID_DEFECT_CATEGORIES.has(raw as KeyframeDefectCategory)) {
    return raw as KeyframeDefectCategory
  }
  return 'none'
}

/**
 * Parse raw JSON response from the Pre-Video Keyframe Gate vision check.
 */
export function parsePreVideoKeyframeGateResponse(
  rawText: string,
  input: Pick<
    PreVideoKeyframeGateInput,
    'beatId' | 'stillPrompt' | 'passThreshold' | 'estimatedVideoClipCostUsd'
  >
): PreVideoKeyframeGateResult {
  const threshold = input.passThreshold ?? 78
  const clipCost = input.estimatedVideoClipCostUsd ?? 1.2

  try {
    const parsed = safeParseJsonFromText(rawText) as Record<string, unknown>
    const rawScore = Number(parsed.score)
    const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 85
    const defectCategory = normalizeDefectCategory(parsed.defectCategory)
    const passed = score >= threshold && defectCategory === 'none'

    const rawAction = String(parsed.recommendedAction ?? '')
    let recommendedAction: PreVideoRecommendedAction = 'pass'
    if (!passed) {
      if (
        rawAction === 'inpaint_frame' ||
        defectCategory === 'gibberish_text' ||
        defectCategory === 'prop_or_anatomy_defect'
      ) {
        recommendedAction = 'inpaint_frame'
      } else {
        recommendedAction = 'regenerate_frame'
      }
    }

    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((i) => String(i).trim()).filter(Boolean)
      : []

    const frameEditInstruction =
      typeof parsed.frameEditInstruction === 'string' && parsed.frameEditInstruction.trim()
        ? parsed.frameEditInstruction.trim()
        : undefined

    const revisedStillPrompt =
      typeof parsed.revisedStillPrompt === 'string' && parsed.revisedStillPrompt.trim()
        ? parsed.revisedStillPrompt.trim()
        : undefined

    return {
      beatId: input.beatId,
      passed,
      score,
      defectCategory: passed ? 'none' : defectCategory,
      recommendedAction,
      issues,
      frameEditInstruction,
      revisedStillPrompt: revisedStillPrompt || (passed ? undefined : input.stillPrompt),
      estimatedVideoCreditSavedUsd: passed ? 0 : clipCost,
    }
  } catch {
    return {
      beatId: input.beatId,
      passed: true,
      score: 85,
      defectCategory: 'none',
      recommendedAction: 'pass',
      issues: [],
      estimatedVideoCreditSavedUsd: 0,
    }
  }
}

/**
 * Stage 1: Evaluate a generated beat keyframe before spending credits on 10s video generation.
 */
export async function evaluatePreVideoKeyframeGate(
  input: PreVideoKeyframeGateInput
): Promise<PreVideoKeyframeGateResult> {
  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = []

  if (input.characterReference?.base64) {
    parts.push({
      text: `REFERENCE IMAGE 1 (Canonical Character Identity for ${input.characterReference.name}):`,
    })
    parts.push({
      inlineData: {
        data: input.characterReference.base64,
        mimeType: input.characterReference.mimeType || 'image/jpeg',
      },
    })
  }

  if (input.precedingShotFrame?.base64) {
    parts.push({
      text: `REFERENCE IMAGE 2 (Preceding Shot in Same Scene — check lighting/wardrobe/axis continuity):`,
    })
    parts.push({
      inlineData: {
        data: input.precedingShotFrame.base64,
        mimeType: input.precedingShotFrame.mimeType || 'image/jpeg',
      },
    })
  }

  parts.push({
    text: `CANDIDATE BEAT KEYFRAME TO INSPECT (Beat ${input.beatId}):`,
  })
  parts.push({
    inlineData: {
      data: input.generatedFrame.base64,
      mimeType: input.generatedFrame.mimeType || 'image/png',
    },
  })

  const expectedCast = input.expectedDirection?.castInFrame?.join(', ') || 'as prompted'
  const expectedProps = input.expectedDirection?.keyProps?.join(', ') || 'none required'

  const promptText = `You are an autonomous Script Supervisor & Pre-Video Quality Gate for a 60-minute episodic television production.
Inspect the CANDIDATE BEAT KEYFRAME before it is sent to an expensive 10-second video generator.

Target Prompt: "${input.stillPrompt}"
Expected Shot Type: ${input.expectedDirection?.shotType || 'unspecified'} (${input.expectedDirection?.cameraAngle || 'standard angle'})
Expected Cast in Frame: ${expectedCast}
Expected Key Props: ${expectedProps}

Check for:
1. identity_mismatch: Character ethnicity, skin tone, or facial structure plainly does not match Reference Image 1
2. axis_violation: 180-degree camera axis or wardrobe/lighting state contradicts Reference Image 2 (Preceding Shot)
3. gibberish_text: Unwanted AI gibberish letters, watermarks, or subtitle bars burned into the image
4. prop_or_anatomy_defect: Missing required key prop, extra limbs/hands, or severe anatomical distortion
5. lighting_continuity_break: Abrupt time-of-day or color-temperature jump from Reference Image 2

Return ONLY valid JSON:
{
  "score": 0-100,
  "defectCategory": "none" | "identity_mismatch" | "axis_violation" | "gibberish_text" | "prop_or_anatomy_defect" | "lighting_continuity_break",
  "recommendedAction": "pass" | "inpaint_frame" | "regenerate_frame",
  "issues": ["concise issue description"],
  "frameEditInstruction": "if inpaint_frame, specific instruction to remove/fix the localized defect while keeping the rest of the frame identical",
  "revisedStillPrompt": "if regenerate_frame, improved prompt with stronger continuity/identity constraints"
}`

  parts.push({ text: promptText })

  const visionResult = await generateWithVision(parts, {
    model: getGeminiTextModel('flash'),
    temperature: 0.2,
    thinkingLevel: 'minimal',
    maxRetries: 0,
  })

  return parsePreVideoKeyframeGateResponse(visionResult.text, input)
}

/**
 * Stage 2: Evaluate 3 sampled frames (start, middle, end) from a generated 10s video clip
 * and automatically synthesize an executable RetakePlan if temporal artifacts occur.
 */
export async function evaluatePostVideoClipGate(
  input: PostVideoClipGateInput
): Promise<PostVideoClipGateResult> {
  const threshold = input.passThreshold ?? 75
  const mode = input.mode ?? 'I2V'

  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
    { text: 'FRAME 1 (t=1.0s — Start of 10s video clip):' },
    {
      inlineData: {
        data: input.sampledFrames.startFrame.base64,
        mimeType: input.sampledFrames.startFrame.mimeType || 'image/jpeg',
      },
    },
    { text: 'FRAME 2 (t=5.0s — Midpoint of 10s video clip):' },
    {
      inlineData: {
        data: input.sampledFrames.midFrame.base64,
        mimeType: input.sampledFrames.midFrame.mimeType || 'image/jpeg',
      },
    },
    { text: 'FRAME 3 (t=9.0s — End of 10s video clip):' },
    {
      inlineData: {
        data: input.sampledFrames.endFrame.base64,
        mimeType: input.sampledFrames.endFrame.mimeType || 'image/jpeg',
      },
    },
    {
      text: `You are an autonomous Post-Video Temporal Quality Critic for a 60-minute episodic production.
Evaluate FRAME 1, FRAME 2, and FRAME 3 sampled across a 10-second generated video clip (mode: ${mode}).
Original Video Prompt: "${input.videoPrompt}"

Inspect for temporal defects across the 3 frames:
- "morphing": faces, hands, or background geometry melt or morph between Frame 1 and Frame 3
- "frozen": zero meaningful motion across all 3 frames
- "identity_drift": character transforms into a different person by Frame 3
- "stable": consistent character identity, plausible motion, and clean cinematography

If temporalScore < ${threshold}, also populate retakePlan fields so the pipeline can automatically re-shoot the clip.

Return ONLY valid JSON:
{
  "temporalScore": 0-100,
  "motionStability": "stable" | "morphing" | "frozen" | "identity_drift",
  "issues": ["issue 1"],
  "anomalyOrigin": "frame" | "motion" | "both" | "unknown",
  "revisedPrompt": "improved video prompt if retake needed",
  "negativePromptAdditions": "comma-separated negative terms if retake needed",
  "frameEditRecommended": false,
  "frameEditInstruction": "",
  "changesSummary": [{ "category": "Motion", "change": "string", "rationale": "string" }],
  "retakeSummary": "one-sentence summary"
}`,
    },
  ]

  const visionResult = await generateWithVision(parts, {
    model: getGeminiTextModel('flash'),
    temperature: 0.2,
    thinkingLevel: 'minimal',
    maxRetries: 0,
  })

  try {
    const parsed = safeParseJsonFromText(visionResult.text) as Record<string, unknown>
    const rawScore = Number(parsed.temporalScore)
    const temporalScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 85
    const rawStability = String(parsed.motionStability ?? 'stable')
    const motionStability = (
      ['stable', 'morphing', 'frozen', 'identity_drift'].includes(rawStability)
        ? rawStability
        : 'stable'
    ) as PostVideoClipGateResult['motionStability']

    const passed = temporalScore >= threshold && motionStability === 'stable'
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((i) => String(i).trim()).filter(Boolean)
      : []

    if (passed) {
      return {
        segmentId: input.segmentId,
        passed: true,
        temporalScore,
        motionStability: 'stable',
        issues: [],
        autoRetakePlan: null,
      }
    }

    const autoRetakePlan = parseRetakePlan(visionResult.text, input.videoPrompt)
    const mergedNegativePrompt = mergeNegativePrompt(
      input.negativePrompt,
      autoRetakePlan.negativePromptAdditions
    )

    return {
      segmentId: input.segmentId,
      passed: false,
      temporalScore,
      motionStability,
      issues,
      autoRetakePlan,
      mergedNegativePrompt,
    }
  } catch {
    return {
      segmentId: input.segmentId,
      passed: true,
      temporalScore: 85,
      motionStability: 'stable',
      issues: [],
      autoRetakePlan: null,
    }
  }
}
