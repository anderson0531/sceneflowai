import { generateWithVision } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import {
  classifyShotScale,
  faceIsAssessableAtScale,
  resolveLikenessMismatchKind,
  type LikenessMismatchKind,
  type LikenessShotScale,
} from '@/lib/imagen/likenessMismatch'

/**
 * Confidence Thresholds:
 * - ≥90%: High confidence match (ideal for video production)
 * - 75-89%: Acceptable for storyboards, may need refinement for video
 * - <75%: Failed validation, regeneration recommended
 *
 * Confidence alone does not say whether a miss is the wrong person or the
 * right person seen from across a room, so the result also carries a
 * `mismatchKind`; only a hard identity mismatch is worth regenerating.
 *
 * Use Max quality (Imagen 4 Ultra) for best character cloning results
 */

export interface ValidationResult {
  matches: boolean
  confidence: number
  issues: string[]
  analysis: string
  mismatchKind: LikenessMismatchKind
  shotScale: LikenessShotScale
}

export interface ValidateCharacterLikenessOptions {
  /** Framing of the generated frame, so an unresolvable face is not scored as a mismatch. */
  shotType?: string
}

/** What the model can actually be held to at this distance. */
function buildScaleGuidance(scale: LikenessShotScale): string {
  switch (scale) {
    case 'close':
      return `SHOT SCALE: close-up. The face fills the frame, so every criterion is assessable. Weight facial structure heavily.`
    case 'medium':
      return `SHOT SCALE: medium. Face, hair, and skin tone are all assessable. Fine bone-structure detail may be softened by depth of field — judge proportion, not pore-level detail.`
    case 'wide':
      return `SHOT SCALE: wide/establishing. The subject is small in frame and facial detail is NOT resolvable. Do NOT score facial structure as a mismatch at this distance — judge skin tone, hair colour and shape, build, and wardrobe only. If you cannot see the face well enough to judge it, say so via "face_assessable": false instead of lowering confidence.`
    default:
      return `SHOT SCALE: unstated. Judge only what is actually visible; if the face is too small, turned away, or occluded to compare, report "face_assessable": false instead of lowering confidence.`
  }
}

export async function validateCharacterLikeness(
  generatedImageUrl: string,
  referenceImageUrl: string,
  characterName: string,
  options: ValidateCharacterLikenessOptions = {}
): Promise<ValidationResult> {
  const shotScale = classifyShotScale(options.shotType)

  // Fetch both images
  const [generatedRes, referenceRes] = await Promise.all([
    fetch(generatedImageUrl),
    fetch(referenceImageUrl)
  ])
  
  const [generatedBuffer, referenceBuffer] = await Promise.all([
    generatedRes.arrayBuffer(),
    referenceRes.arrayBuffer()
  ])
  
  const prompt = `Compare these two images of ${characterName}:

IMAGE 1: Reference character image (what the character should look like)
IMAGE 2: Generated scene image (what was produced)

${buildScaleGuidance(shotScale)}

CRITICAL SCORING CRITERIA (must match for high confidence):
1. Ethnicity Match (40 points): Skin tone, racial features must be identical
2. Facial Structure Match (30 points): Face shape, jawline, bone structure
3. Hair Match (20 points): Color, style, texture
4. Overall Likeness (10 points): General appearance, age range

Analyze if IMAGE 2's character matches IMAGE 1's physical appearance:
- Ethnicity and skin tone (MOST CRITICAL - major mismatch = low confidence)
- Facial features and structure
- Hair color and style
- Age appearance
- Overall likeness

Classify the mismatch as exactly one of:
- "none": IMAGE 2 is the same person as IMAGE 1
- "identity": IMAGE 2 is plainly a DIFFERENT person — different skin tone, or facial bone structure that could not be the same individual
- "surface": the same person, but hair, age read, or wardrobe has drifted
- "indeterminate": the face is too small, turned away, or occluded to compare at this shot scale

Respond in JSON format:
{
  "matches": true/false,
  "confidence": 0-100,
  "mismatch_kind": "none" | "identity" | "surface" | "indeterminate",
  "face_assessable": true/false,
  "ethnicity_match": true/false,
  "facial_match": true/false,
  "hair_match": true/false,
  "issues": ["issue 1", "issue 2"],
  "analysis": "brief comparison summary"
}

IMPORTANT: 
- If ethnicity/skin tone doesn't match, confidence MUST be < 40 and mismatch_kind MUST be "identity"
- If facial structure is completely different, confidence MUST be < 50
- Reserve "identity" for a genuine substitution — a recognisably different individual. Hair, age, or wardrobe drift on the same face is "surface"
- Only mark "matches": true if confidence >= 85 and ethnicity matches`

  const result = await generateWithVision([
    {
      inlineData: {
        data: Buffer.from(referenceBuffer).toString('base64'),
        mimeType: 'image/jpeg'
      }
    },
    {
      inlineData: {
        data: Buffer.from(generatedBuffer).toString('base64'),
        mimeType: 'image/png'
      }
    },
    { text: prompt }
  ], {
    temperature: 0.2
  })
  
  const text = result.text

  let parsed: Record<string, unknown> | null = null
  try {
    parsed = safeParseJsonFromText(text)
  } catch (error) {
    console.error(
      `[Image Validator] ${characterName} - could not parse validator response:`,
      error instanceof Error ? error.message : error
    )
  }

  if (parsed && typeof parsed === 'object') {
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0
    const matches = parsed.matches === true
    const faceAssessable =
      typeof parsed.face_assessable === 'boolean'
        ? parsed.face_assessable
        : faceIsAssessableAtScale(shotScale)
          ? undefined
          : false

    const mismatchKind = resolveLikenessMismatchKind({
      matches,
      confidence,
      mismatchKind: parsed.mismatch_kind ?? parsed.mismatchKind,
      ethnicityMatch: typeof parsed.ethnicity_match === 'boolean' ? parsed.ethnicity_match : undefined,
      facialMatch: typeof parsed.facial_match === 'boolean' ? parsed.facial_match : undefined,
      faceAssessable,
      shotScale,
    })

    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((issue): issue is string => typeof issue === 'string')
      : []

    console.log(
      `[Image Validator] ${characterName} - Matches: ${matches}, Confidence: ${confidence}%, Mismatch: ${mismatchKind} (${shotScale} shot)`
    )
    if (typeof parsed.analysis === 'string') {
      console.log(`[Image Validator] Analysis: ${parsed.analysis}`)
    }

    return {
      matches,
      confidence,
      issues,
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : '',
      mismatchKind,
      shotScale,
    }
  }

  // An unreadable validator response is no evidence of a bad frame, so it is
  // reported as indeterminate rather than as a failure that pays for a retry.
  return {
    matches: false,
    confidence: 0,
    issues: ['Validation failed'],
    analysis: text,
    mismatchKind: 'indeterminate',
    shotScale,
  }
}
