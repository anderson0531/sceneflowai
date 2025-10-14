import { NextRequest, NextResponse } from 'next/server'

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

    const prompt = `Generate ${count} diverse, production-ready Blueprint inputs for: "${keyword}"

REQUIREMENTS:
- Each variation must be 15-30 words
- Include: duration (30s-120s), project type, visual style, tone, key elements
- Make them DISTINCTLY different in approach, style, and duration
- Use concrete, actionable language
- No generic phrases like "engaging" or "compelling"

EXAMPLES OF GOOD FORMAT:
- "90s documentary on artisan coffee roasting; overhead shots in cozy roastery; warm, educational tone; emphasize craft and tradition"
- "30s product demo for smart home device; clean minimalist aesthetic; confident tech-forward tone; focus on seamless integration"

OUTPUT FORMAT: Return ONLY the variations, one per line, no numbering, no headers.`

    // Call Gemini API directly with high temperature for creativity
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
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
      line.length >= 15 && 
      line.length <= 200 &&
      !line.startsWith('#') &&
      !line.startsWith('**') &&
      !/^(Here|These|Output)/i.test(line)
    )
    .map(line => line.replace(/^[\d\.\)\-\*]+\s*/, '')) // Remove numbering
    .slice(0, 6) // Max 6 variants
}

