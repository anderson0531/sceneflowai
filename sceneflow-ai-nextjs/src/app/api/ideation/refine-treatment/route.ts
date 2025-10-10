import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '../../../../lib/safeJson'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variant, instructions } = body || {}
    if (!variant) return NextResponse.json({ success: false, message: 'variant required' }, { status: 400 })

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, message: 'Google Gemini API key not configured' }, { status: 500 })

    const prompt = `You are an expert film treatment editor. Refine the provided treatment variant according to the user instructions. Keep structure and factual content unless asked to change. Improve clarity, tone and concision.

VARIANT JSON:
${JSON.stringify(variant, null, 2)}

INSTRUCTIONS:
${instructions || 'Improve clarity, keep under 100 words for synopsis, keep tone consistent.'}

Respond with valid JSON using the same keys as the variant object (only include fields that changed).` + strictJsonPromptSuffix

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    const parsed = safeParseJsonFromText(generatedText || '{}')

    return NextResponse.json({ success: true, draft: parsed })
  } catch (e) {
    console.error('Refine treatment error', e)
    return NextResponse.json({ success: false, message: 'Failed to refine variant' }, { status: 500 })
  }
}


