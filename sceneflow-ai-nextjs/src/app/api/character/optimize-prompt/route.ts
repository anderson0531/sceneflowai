import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Try models in order of preference: User requested 2.5 (stable), then fallbacks
    // Note: gemini-pro (1.0) is deprecated/removed in v1beta by late 2025
    const modelsToTry = ['gemini-3-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro-latest']
    
    let optimizedPrompt = ''
    let lastError = null

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Optimize Prompt] Attempting with model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })

        const systemPrompt = `You are an expert AI prompt optimizer for character image generation. Your task is to optimize a character description prompt for better image generation results, specifically for professional character portraits.

Given a character description and an instruction, modify the prompt to better suit the instruction while maintaining the core character details.

Keep the optimized prompt concise but descriptive, focusing on visual elements that work well for AI image generation.

Return only the optimized prompt text, no explanations or additional formatting.`

        const fullPrompt = `${systemPrompt}

Original prompt: ${prompt}

Instruction: ${instruction}

Optimized prompt:`

        const result = await model.generateContent(fullPrompt)
        const response = await result.response
        optimizedPrompt = response.text().trim()
        
        console.log(`[Optimize Prompt] Success with model: ${modelName}`)
        break // Stop if successful
      } catch (error) {
        console.warn(`[Optimize Prompt] Failed with model ${modelName}:`, error instanceof Error ? error.message : error)
        lastError = error
        // Continue to next model
      }
    }

    if (!optimizedPrompt) {
      throw lastError || new Error('All model attempts failed')
    }

    return NextResponse.json({ optimizedPrompt })

  } catch (error) {
    console.error('[Optimize Prompt] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to optimize prompt' 
    }, { status: 500 })
  }
}