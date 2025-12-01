import { NextRequest, NextResponse } from 'next/server'
import { analyzeDuration } from '@/lib/treatment/duration'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    const { keyword, count = 5 } = await request.json()
    
    if (!keyword || keyword.trim().length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Keyword too short' 
      }, { status: 400 })
    }

    // Analyze input length to determine if we should generate synopsis or variations
    const estimatedMinutes = analyzeDuration(keyword, 20)
    const isLongForm = estimatedMinutes >= 10
    
    // Adaptive prompt based on content length
    const promptType = isLongForm 
      ? 'Generate 5 unique SYNOPSIS variations'
      : 'Generate 5 unique variations'
    
    const contentType = isLongForm ? 'story' : 'concept'
    
    const specificInstructions = isLongForm
      ? 'Each synopsis should capture the core narrative, main characters, and emotional arc in 25-40 words. Focus on plot progression and key dramatic moments.'
      : 'Each variation should rephrase and enhance the core idea in 25-40 words. Emphasize visual aesthetics, emotional journey, and narrative structure.'

    const prompt = `You are a creative film strategist. ${promptType} of the following ${contentType}: "${keyword}"

${specificInstructions}

STYLE REQUIREMENTS:
- Each ${isLongForm ? 'synopsis' : 'variation'}: 25-40 words (full sentence structure)
- Paint a vivid picture: sensory details, emotional tone, specific visuals
- Include: ${isLongForm ? 'plot, characters, conflict' : 'runtime, visual style, narrative approach, audience emotion'}
- Make each ${isLongForm ? 'synopsis' : 'variation'} DISTINCTLY different in ${isLongForm ? 'narrative focus and dramatic emphasis' : 'genre, mood, and execution'}
- Use evocative, cinematic language that sparks imagination

COMPELLING EXAMPLES:
- "A 90-second documentary portrait of an aging jazz musician in dim, smoke-filled clubs. Intimate close-ups capture weathered hands on piano keys. Melancholic yet hopeful tone celebrates musical legacy and the passage of time."
- "30-second product reveal for luxury timepiece. Slow-motion macro shots reveal intricate mechanical movements. Dark, moody cinematography with dramatic lighting. Evokes precision, craftsmanship, and timeless elegance."
- "2-minute founder story filmed in golden hour at startup warehouse. Handheld camera follows determined entrepreneur through authentic daily moments. Raw, vulnerable tone builds to inspiring crescendo showcasing vision realized."

CRITICAL:
- Be SPECIFIC about ${isLongForm ? 'character motivations, plot turns, and conflicts' : 'visual aesthetics (lighting, camera movement, color palette)'}
- Include EMOTIONAL journey (how viewer should feel)
- ${isLongForm ? 'Capture the STORY ARC (setup, conflict, resolution)' : 'Suggest NARRATIVE structure (opening, development, payoff)'}
- Avoid generic words like "engaging" or "compelling"

OUTPUT FORMAT: Return ONLY the variations, one per line, no numbering, no markdown.`

    // Call Gemini API directly with high temperature for creativity
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('Google Gemini API key not configured')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95, // High creativity for diversity
            topP: 0.95,
            maxOutputTokens: 500
          }
        }),
      }
    ).finally(() => clearTimeout(timeout))

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const response = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!response) {
      throw new Error('Gemini returned empty content')
    }

    const variants = parseVariants(response)

    return NextResponse.json({
      success: true,
      keyword,
      variants,
      count: variants.length
    })
  } catch (error: any) {
    console.error('[Inspiration API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Generation failed'
    }, { status: 500 })
  }
}

function parseVariants(llmResponse: string): string[] {
  return llmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => 
      line.length >= 20 && 
      line.length <= 400 &&
      !line.startsWith('#') &&
      !line.startsWith('**') &&
      !/^(Here|These|Output)/i.test(line)
    )
    .map(line => line.replace(/^[\d\.\)\-\*]+\s*/, '')) // Remove numbering
    .slice(0, 6) // Max 6 variants
}

