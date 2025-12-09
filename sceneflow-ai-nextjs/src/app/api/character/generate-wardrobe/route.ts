import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta'
const GEMINI_API_HOST = process.env.GEMINI_API_HOST || 'https://generativelanguage.googleapis.com'

interface GenerateWardrobeRequest {
  characterName: string
  characterRole?: string
  appearanceDescription?: string
  wardrobeDescription: string  // User's natural language description
  genre?: string
  setting?: string
}

interface WardrobeResult {
  defaultWardrobe: string
  wardrobeAccessories: string
}

interface GeminiRequestError extends Error {
  status?: number
}

const DEFAULT_MODEL_SEQUENCE = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

const configuredSequence = process.env.GEMINI_MODEL_SEQUENCE || process.env.GEMINI_MODEL_PRIORITY
const preferredModel = process.env.GEMINI_MODEL?.trim()

const prioritizedModels: string[] = preferredModel ? [preferredModel] : []
const configuredModels: string[] = configuredSequence
  ? configuredSequence.split(',').map(model => model.trim()).filter(Boolean)
  : DEFAULT_MODEL_SEQUENCE

const GEMINI_MODEL_SEQUENCE = Array.from(new Set([...prioritizedModels, ...configuredModels]))

/**
 * Attempts Gemini generation using preferred models in sequence, falling back when models return 404/403
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastError: Error | null = null

  for (const model of GEMINI_MODEL_SEQUENCE) {
    try {
      return await callGeminiWithModel(apiKey, prompt, model)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Gemini error')
      const status = (error as GeminiRequestError)?.status
      const canFallback = status === 404 || status === 403
      console.warn(`[Gemini API] Model ${model} failed${status ? ` (${status})` : ''}: ${lastError.message}`)

      if (!canFallback) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Gemini API failed for all configured models')
}

/**
 * Call Gemini API for a specific model with retry logic for rate limiting (429 errors)
 */
async function callGeminiWithModel(apiKey: string, prompt: string, model: string, retryCount = 0): Promise<string> {
  const maxRetries = 3
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  
  try {
    const endpoint = `${GEMINI_API_HOST}/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json'
          }
        }),
      }
    )
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000
        console.log(`[Gemini API] Rate limited, retrying in ${backoffMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        return callGeminiWithModel(apiKey, prompt, model, retryCount + 1)
      }
      
      const error = new Error(`Gemini API error: ${response.status} - ${errorBody}`) as GeminiRequestError
      error.status = response.status
      throw error
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No response from Gemini')
    }
    
    return text
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

function buildWardrobePrompt(request: GenerateWardrobeRequest): string {
  return `You are a professional costume designer for film and television. Generate specific, visually descriptive wardrobe specifications based on a character description.

CHARACTER CONTEXT:
- Name: ${request.characterName}
${request.characterRole ? `- Role: ${request.characterRole}` : ''}
${request.appearanceDescription ? `- Appearance: ${request.appearanceDescription}` : ''}
${request.genre ? `- Genre: ${request.genre}` : ''}
${request.setting ? `- Setting/Era: ${request.setting}` : ''}

USER'S WARDROBE DESCRIPTION:
"${request.wardrobeDescription}"

TASK:
Based on the user's description, generate detailed, specific wardrobe specifications that would ensure visual consistency in AI-generated images. Be specific about:
- Colors (use specific shades, not just "blue" but "navy blue" or "powder blue")
- Materials/textures (leather, silk, cotton, denim, etc.)
- Fit and style (tailored, loose, vintage, modern, etc.)
- Specific garment types

RESPONSE FORMAT (JSON):
{
  "defaultWardrobe": "Complete outfit description with specific colors, materials, and style details. Should be 1-2 sentences that can be injected into an image prompt.",
  "wardrobeAccessories": "Specific accessories including jewelry, watches, glasses, bags, hats, etc. Be specific about materials and colors."
}

GUIDELINES:
- Keep descriptions concise but specific (30-50 words each)
- Use comma-separated lists of items
- Focus on visual descriptors that AI image generators understand
- Ensure consistency with character's role and setting
- If the user's description is vague, make informed creative choices that fit the character

Return ONLY the JSON object, no additional text.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateWardrobeRequest

    if (!body.wardrobeDescription?.trim()) {
      return NextResponse.json(
        { error: 'Wardrobe description is required' },
        { status: 400 }
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const prompt = buildWardrobePrompt(body)
    console.log('[Generate Wardrobe] Processing request for:', body.characterName)

    const responseText = await callGemini(apiKey, prompt)
    
    // Parse the JSON response
    let wardrobe: WardrobeResult
    try {
      // Handle potential markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      wardrobe = JSON.parse(cleanedResponse)
      
      // Validate required fields
      if (!wardrobe.defaultWardrobe || !wardrobe.wardrobeAccessories) {
        throw new Error('Invalid wardrobe structure')
      }
    } catch (parseError) {
      console.error('[Generate Wardrobe] Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse wardrobe response' },
        { status: 500 }
      )
    }

    console.log('[Generate Wardrobe] Generated wardrobe for:', body.characterName)
    
    return NextResponse.json({
      success: true,
      wardrobe
    })

  } catch (error) {
    console.error('[Generate Wardrobe] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate wardrobe' },
      { status: 500 }
    )
  }
}
