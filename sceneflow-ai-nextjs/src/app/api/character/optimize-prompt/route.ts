import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { prompt, instruction } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!instruction?.trim()) {
      return NextResponse.json({ error: 'Instruction is required' }, { status: 400 })
    }

    // Vertex AI requires VERTEX_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS_JSON
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
    if (!projectId) {
      return NextResponse.json({ error: 'Vertex AI not configured (VERTEX_PROJECT_ID required)' }, { status: 500 })
    }

    console.log(`[Optimize Prompt] Using Vertex AI Gemini`)

    const systemPrompt = `You are an expert AI prompt optimizer for character image generation. Your task is to optimize a character description prompt for better image generation results, specifically for professional character portraits.

Given a character description and an instruction, modify the prompt to better suit the instruction while maintaining the core character details.

Keep the optimized prompt concise but descriptive, focusing on visual elements that work well for AI image generation.

Return only the optimized prompt text, no explanations or additional formatting.`

    const fullPrompt = `${systemPrompt}

Original prompt: ${prompt}

Instruction: ${instruction}

Optimized prompt:`

    const result = await generateText(fullPrompt, {
      model: 'gemini-2.0-flash',
      temperature: 0.3
    })
    
    const optimizedPrompt = result.text.trim()
    console.log(`[Optimize Prompt] Success with Vertex AI`)

    return NextResponse.json({ optimizedPrompt })

  } catch (error) {
    console.error('[Optimize Prompt] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to optimize prompt' 
    }, { status: 500 })
  }
}