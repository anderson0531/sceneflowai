import { GoogleGenerativeAI } from '@google/generative-ai'

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
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  
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

Analyze if IMAGE 2's character matches IMAGE 1's physical appearance:
- Ethnicity and skin tone
- Facial features and structure
- Hair color and style
- Age appearance
- Overall likeness

Respond in JSON format:
{
  "matches": true/false,
  "confidence": 0-100,
  "issues": ["issue 1", "issue 2"],
  "analysis": "brief comparison summary"
}`

  const result = await model.generateContent([
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
    prompt
  ])
  
  const text = result.response.text()
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

