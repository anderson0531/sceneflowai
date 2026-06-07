import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import type { ParsedScript } from '@/lib/script/scriptParser'
import type { CompletenessGap } from '@/lib/script/scriptCompleteness'

export const runtime = 'nodejs'
export const maxDuration = 120

interface CompleteGapsRequest {
  parsedScript: ParsedScript
  gaps: CompletenessGap[]
  userNotes?: string
}

function buildGapFillPrompt(body: CompleteGapsRequest): string {
  const { parsedScript, gaps, userNotes } = body
  const gapSummary = gaps
    .map((g) => `- [${g.code}] ${g.message}${g.sceneNumber ? ` (scene ${g.sceneNumber})` : ''}`)
    .join('\n')

  return `You are a screenplay assistant filling ONLY content gaps in an imported script.

CRITICAL RULES:
1. Preserve ALL existing dialogue text VERBATIM — do not reword, shorten, or delete any dialogue line.
2. Do NOT add new dialogue unless a scene has zero dialogue AND zero action (SCENE_NO_CONTENT).
3. Do NOT regenerate the full script — only enrich missing headings, action lines, titles, and character descriptions.
4. Do NOT call or reference any full script generation pipeline.
5. Return the complete ParsedScript JSON with the same scene count and scene numbers unless splitting UNBALANCED_SCENES is explicitly needed (prefer enriching in place).

Gaps to address:
${gapSummary}

${userNotes ? `User notes:\n${userNotes}\n` : ''}

Current parsed script (JSON):
${JSON.stringify(parsedScript, null, 2)}

Return ONLY valid JSON matching this ParsedScript schema:
{
  "title": string,
  "scenes": [{
    "id": string,
    "sceneNumber": number,
    "heading": string,
    "location": string,
    "timeOfDay": string,
    "interior": boolean,
    "action": string,
    "dialogue": [{ "character": string, "parenthetical"?: string, "text": string, "extension"?: string }],
    "characters": string[],
    "duration": number,
    "transitions"?: { "in"?: string, "out"?: string }
  }],
  "characters": [{
    "name": string,
    "appearances": number,
    "firstAppearance": number,
    "dialogueCount": number,
    "description"?: string
  }],
  "metadata": {
    "author"?: string,
    "draft"?: string,
    "date"?: string,
    "format": string,
    "totalDuration": number,
    "importedAt": string
  }
}`
}

function countEnrichedScenes(before: ParsedScript, after: ParsedScript): number {
  let count = 0
  for (const afterScene of after.scenes) {
    const beforeScene = before.scenes.find((s) => s.sceneNumber === afterScene.sceneNumber)
    if (!beforeScene) continue
    const actionGrew = (afterScene.action?.trim().length || 0) > (beforeScene.action?.trim().length || 0)
    const headingImproved =
      afterScene.heading?.trim() &&
      afterScene.heading.trim() !== beforeScene.heading?.trim()
    if (actionGrew || headingImproved) count++
  }
  return count
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: CompleteGapsRequest = await req.json()
    const { parsedScript, gaps } = body

    if (!parsedScript?.scenes || !Array.isArray(gaps) || gaps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'parsedScript and gaps[] are required' },
        { status: 400 }
      )
    }

    const prompt = buildGapFillPrompt(body)
    const result = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 16000,
      responseMimeType: 'application/json',
      timeoutMs: 90000,
    })

    if (!result.text) {
      return NextResponse.json(
        { success: false, error: 'AI returned empty response' },
        { status: 502 }
      )
    }

    const enhanced = safeParseJsonFromText(result.text) as ParsedScript
    if (!enhanced?.scenes || !Array.isArray(enhanced.scenes)) {
      return NextResponse.json(
        { success: false, error: 'AI response missing scenes array' },
        { status: 502 }
      )
    }

    // Preserve dialogue verbatim from original where scene numbers match
    enhanced.scenes = enhanced.scenes.map((scene) => {
      const original = parsedScript.scenes.find((s) => s.sceneNumber === scene.sceneNumber)
      if (!original) return scene
      const hasOriginalDialogue = original.dialogue?.length > 0
      return {
        ...scene,
        dialogue: hasOriginalDialogue ? original.dialogue : scene.dialogue,
        metadata: undefined,
      }
    })

    enhanced.metadata = {
      ...parsedScript.metadata,
      ...enhanced.metadata,
      importedAt: parsedScript.metadata?.importedAt || new Date().toISOString(),
    }

    const scenesEnriched = countEnrichedScenes(parsedScript, enhanced)
    const titleUpdated =
      enhanced.title?.trim() &&
      enhanced.title.trim().toUpperCase() !== (parsedScript.title || '').trim().toUpperCase()

    return NextResponse.json({
      success: true,
      parsedScript: enhanced,
      summary: {
        scenesEnriched,
        titleUpdated: !!titleUpdated,
        message:
          scenesEnriched > 0
            ? `${scenesEnriched} scene${scenesEnriched !== 1 ? 's' : ''} enriched`
            : 'Script reviewed — minimal changes applied',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gap fill failed'
    console.error('[complete-gaps] Error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
