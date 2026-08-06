import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '../../../../lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'
import { resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { localeDirective } from '@/lib/prompts/localeDirective'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variant, instructions } = body || {}
    if (!variant) return NextResponse.json({ success: false, message: 'variant required' }, { status: 400 })

    // Instructions arrive in whatever language the creator writes in; the
    // refinement has to come back in that language or the variant drifts to
    // English one edit at a time.
    const { storyLocale, properNouns } = await resolveRequestStoryLocale(request, {
      explicit: body?.storyLocale,
      projectId: body?.projectId,
    })

    const prompt = `You are an expert film treatment editor. Refine the provided treatment variant according to the user instructions. Keep structure and factual content unless asked to change. Improve clarity, tone and concision.

VARIANT JSON:
${JSON.stringify(variant, null, 2)}

INSTRUCTIONS:
${instructions || 'Improve clarity, keep under 100 words for synopsis, keep tone consistent.'}
${localeDirective(storyLocale, { properNouns })}
Respond with valid JSON using the same keys as the variant object (only include fields that changed).` + strictJsonPromptSuffix

    console.log('[Refine Treatment] Calling Vertex AI Gemini...')
    const generatedText = await generateText(prompt, { })
    const parsed = safeParseJsonFromText(generatedText || '{}')

    return NextResponse.json({ success: true, draft: parsed })
  } catch (e) {
    console.error('Refine treatment error', e)
    return NextResponse.json({ success: false, message: 'Failed to refine variant' }, { status: 500 })
  }
}


