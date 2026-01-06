import { generateWithVision } from '@/lib/vertexai/gemini'

/**
 * Confidence Thresholds:
 * - ≥90%: High confidence match (ideal for video production)
 * - 75-89%: Acceptable for storyboards, may need refinement for video
 * - <75%: Failed validation, regeneration recommended
 * 
 * Use Max quality (Imagen 4 Ultra) for best character cloning results
 */

interface ValidationResult {
  matches: boolean
  confidence: number
  issues: string[]
  analysis: string
}

export async function validateCharacterLikeness(
  generatedImageUrl: string,
  referenceImageUrl: string,
  characterName: string
): Promise<ValidationResult> {
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

Respond in JSON format:
{
  "matches": true/false,
  "confidence": 0-100,
  "ethnicity_match": true/false,
  "facial_match": true/false,
  "hair_match": true/false,
  "issues": ["issue 1", "issue 2"],
  "analysis": "brief comparison summary"
}

IMPORTANT: 
- If ethnicity/skin tone doesn't match, confidence MUST be < 40
- If facial structure is completely different, confidence MUST be < 50
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
    model: 'gemini-2.0-flash',
    temperature: 0.2
  })
  
  const text = result.text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  
  if (jsonMatch) {
    const validation = JSON.parse(jsonMatch[0])
    console.log(`[Image Validator] ${characterName} - Matches: ${validation.matches}, Confidence: ${validation.confidence}%`)
    console.log(`[Image Validator] Analysis: ${validation.analysis}`)
    
    return validation
  }
  
  // Fallback if parsing fails
  return {
    matches: false,
    confidence: 0,
    issues: ['Validation failed'],
    analysis: text
  }
}

