import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '../../../../lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variant, instructions } = body || {}
    if (!variant) return NextResponse.json({ success: false, message: 'variant required' }, { status: 400 })

    const prompt = `You are an expert film treatment editor. Refine the provided treatment variant according to the user instructions. Keep structure and factual content unless asked to change. Improve clarity, tone and concision.

VARIANT JSON:
${JSON.stringify(variant, null, 2)}

INSTRUCTIONS:
${instructions || 'Improve clarity, keep under 100 words for synopsis, keep tone consistent.'}

Respond with valid JSON using the same keys as the variant object (only include fields that changed).` + strictJsonPromptSuffix

    console.log('[Refine Treatment] Calling Vertex AI Gemini...')
    const generatedText = await generateText(prompt, { model: 'gemini-2.5-flash' })
    const parsed = safeParseJsonFromText(generatedText || '{}')

    return NextResponse.json({ success: true, draft: parsed })
  } catch (e) {
    console.error('Refine treatment error', e)
    return NextResponse.json({ success: false, message: 'Failed to refine variant' }, { status: 500 })
  }
}


