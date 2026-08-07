import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { moderatePrompt } from '@/utils/promptModerator'

export const maxDuration = 60
export const runtime = 'nodejs'

interface SoftenWardrobeRequest {
  characterName: string
  currentWardrobeDescription: string
  currentAccessories?: string
  wardrobeName?: string
  /** Optional client-supplied flagged terms; server also seeds from moderatePrompt */
  flaggedTerms?: string[]
}

/**
 * POST /api/character/soften-wardrobe
 *
 * Rewrites wardrobe costume language that Gemini Image may reject (violence/gore/
 * weapon-impact wording) into visually equivalent, theatrical costume terms —
 * preserving silhouette, fabrics, colors, and visual marks.
 *
 * Example: "gun shot hole in jacket" → "hole in jacket with dark perimeter"
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SoftenWardrobeRequest

    if (!body.currentWardrobeDescription?.trim()) {
      return NextResponse.json(
        { error: 'Current wardrobe description is required' },
        { status: 400 },
      )
    }

    if (!body.characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 },
      )
    }

    const moderation = moderatePrompt(
      [body.currentWardrobeDescription, body.currentAccessories]
        .filter(Boolean)
        .join(' '),
    )
    const flaggedFromModeration = moderation.flaggedTerms.map((ft) => ft.term)
    const flaggedTerms = Array.from(
      new Set([
        ...(Array.isArray(body.flaggedTerms) ? body.flaggedTerms.filter(Boolean) : []),
        ...flaggedFromModeration,
      ]),
    )

    console.log(
      `[Soften Wardrobe] Softening wardrobe for ${body.characterName}: "${body.currentWardrobeDescription.substring(0, 60)}..." (flagged: ${flaggedTerms.join(', ') || 'none'})`,
    )

    const prompt = buildSoftenPrompt(body, flaggedTerms)

    const result = await generateText(prompt, {
      model: getGeminiTextModel('flash'),
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    })

    let softened: { description: string; accessories: string }
    try {
      let cleanText = result.text.trim()
      if (cleanText.startsWith('```')) {
        cleanText = cleanText
          .replace(/^```(?:json)?\s*\n?/, '')
          .replace(/\n?```\s*$/, '')
      }
      softened = JSON.parse(cleanText)

      if (!softened.description || softened.description.trim().length < 5) {
        throw new Error('Softened description too short')
      }
    } catch (parseError) {
      console.error(
        '[Soften Wardrobe] Parse error:',
        parseError,
        'Response:',
        result.text.substring(0, 200),
      )
      return NextResponse.json(
        { error: 'Failed to parse softened wardrobe response' },
        { status: 500 },
      )
    }

    console.log(
      `[Soften Wardrobe] ✓ Softened wardrobe for ${body.characterName} (${softened.description.length} chars)`,
    )

    return NextResponse.json({
      success: true,
      description: softened.description.trim(),
      accessories: softened.accessories?.trim() || body.currentAccessories || '',
    })
  } catch (error) {
    console.error('[Soften Wardrobe] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to soften wardrobe',
      },
      { status: 500 },
    )
  }
}

function buildSoftenPrompt(
  request: SoftenWardrobeRequest,
  flaggedTerms: string[],
): string {
  const flaggedBlock =
    flaggedTerms.length > 0
      ? `\nFLAGGED / HIGH-RISK TERMS TO REWRITE:\n${flaggedTerms.map((t) => `- ${t}`).join('\n')}\n`
      : ''

  return `You are a film costume safety editor for AI image generation. Rewrite wardrobe text so Gemini Image accepts it, while keeping the SAME visual costume intent.

CHARACTER:
- Name: ${request.characterName}
${request.wardrobeName ? `- Wardrobe Name: ${request.wardrobeName}` : ''}

CURRENT WARDROBE DESCRIPTION:
"${request.currentWardrobeDescription}"
${request.currentAccessories ? `\nCURRENT ACCESSORIES:\n"${request.currentAccessories}"` : ''}
${flaggedBlock}
TASK:
Rewrite ONLY policy-triggering violence, gore, weapon-impact, or graphic injury language into theatrical costume / practical-effects wording. Preserve:
- Costume silhouette, garments, fit, and layering
- Fabrics, textures, colors, and wear patterns
- Visible marks, holes, stains, tears, and distress that matter to the look

Rewrite examples (visual-preserving):
- "gun shot hole in jacket" / "gunshot hole" → "hole in jacket with dark perimeter" or "scorched fabric edge around a small hole"
- "blood on shirt" / "bloodstained" → "dark stain" / "dye mark" / "rust-colored fabric stain"
- "knife slash" / "stab wound in fabric" → "diagonal tear" / "slashed fabric seam" (costume damage, not injury)
- "bullet holes" → "small round holes with darkened edges"
- "burned flesh" / graphic injury on clothing context → "charred fabric edge" / "singed cloth"
- Do NOT invent new garments or change the outfit's overall look
- Do NOT add graphic injury wording; describe costume surface only
- If the text is already safe, return it essentially unchanged (minor clarity OK)

Keep accessories in the same spirit: soften unsafe terms only; preserve materials and style.

RESPONSE FORMAT (JSON):
{
  "description": "The softened wardrobe description (one cohesive paragraph)",
  "accessories": "Softened accessories string (or empty if none)"
}

Return ONLY the JSON object.`
}
