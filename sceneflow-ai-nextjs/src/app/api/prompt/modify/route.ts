/**
 * AI Prompt Modification API
 * 
 * Intelligently modifies video generation prompts based on natural language
 * instructions. Allows users to refine prompts without knowing prompt engineering.
 * 
 * @route POST /api/prompt/modify
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ModifyPromptRequest {
  currentPrompt: string
  instruction: string
  mode?: 'FTV' | 'I2V' | 'T2V' | 'EXT'  // Video generation mode
  context?: {
    sceneDescription?: string
    hasStartFrame?: boolean
    hasEndFrame?: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key at request time
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[Prompt Modify] GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const body: ModifyPromptRequest = await request.json()
    const { currentPrompt, instruction, mode = 'FTV', context } = body

    if (!currentPrompt) {
      return NextResponse.json(
        { error: 'Current prompt is required' },
        { status: 400 }
      )
    }

    if (!instruction?.trim()) {
      return NextResponse.json(
        { error: 'Modification instruction is required' },
        { status: 400 }
      )
    }

    console.log('[Prompt Modify] Mode:', mode)
    console.log('[Prompt Modify] Instruction:', instruction)
    console.log('[Prompt Modify] Current prompt length:', currentPrompt.length)

    // Initialize Gemini with validated API key
    const genAI = new GoogleGenerativeAI(apiKey)

    // Build system prompt based on mode
    const systemPrompt = buildSystemPrompt(mode, context)

    // Use Gemini Flash for fast, cost-effective modification
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview-05-20',
      systemInstruction: systemPrompt,
    })

    const userPrompt = buildUserPrompt(currentPrompt, instruction, mode)

    const result = await model.generateContent(userPrompt)
    const response = await result.response
    let modifiedPrompt = response.text().trim()
    
    // Clean up any markdown formatting
    modifiedPrompt = modifiedPrompt
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/^["']|["']$/g, '')
      .trim()

    console.log('[Prompt Modify] Modified prompt length:', modifiedPrompt.length)

    return NextResponse.json({
      success: true,
      modifiedPrompt,
      originalPrompt: currentPrompt,
      instruction,
    })
  } catch (error) {
    console.error('[Prompt Modify] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to modify prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(mode: string, context?: ModifyPromptRequest['context']): string {
  const basePrompt = `You are an expert video generation prompt engineer. Your task is to modify existing prompts based on user instructions while preserving the core visual intent and technical quality.

IMPORTANT RULES:
1. Output ONLY the modified prompt - no explanations, no quotes, no markdown
2. Preserve any technical keywords or formatting from the original
3. Keep the prompt length similar unless the instruction specifically asks for more/less detail
4. Maintain the same visual style and tone unless instructed otherwise`

  if (mode === 'FTV') {
    return `${basePrompt}

FRAME-TO-VIDEO (FTV) MODE SPECIFIC RULES:
- This prompt describes motion between a START frame and END frame
- The video MUST interpolate smoothly between these two keyframes
- NEVER add camera movements that would deviate from the end frame (no pans, tilts, zooms unless they lead to the end frame)
- Focus on GRADUAL, SMOOTH transitions - avoid sudden or jerky motion
- Preserve any "visual continuity" or "match camera angle" instructions
- If the user asks for "faster" or "slower", adjust motion pacing descriptors
- If the user asks for "more dramatic", intensify lighting/particle effects without changing the trajectory`
  }

  if (mode === 'I2V') {
    return `${basePrompt}

IMAGE-TO-VIDEO (I2V) MODE SPECIFIC RULES:
- This prompt describes animation starting from a reference image
- Maintain consistency with the starting image's composition and style
- Camera movements are allowed but should be subtle and purposeful
- Focus on bringing the static image to life with natural motion`
  }

  return basePrompt
}

function buildUserPrompt(currentPrompt: string, instruction: string, mode: string): string {
  return `CURRENT ${mode} PROMPT:
${currentPrompt}

USER INSTRUCTION:
${instruction}

Apply the user's instruction to modify the prompt. Output ONLY the modified prompt text, nothing else.`
}
