import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import {
  formatSceneForWardrobeAnalysis,
  sceneIncludesCharacter,
  type WardrobeAnalysisSceneInput,
} from '@/lib/character/wardrobeAnalysis'
import {
  buildWardrobeSyncDiff,
  enrichSuggestionsWithBeatAppearanceNotes,
  summarizeWardrobeSyncDiff,
  type ExistingWardrobeLike,
  type WardrobeSuggestionLike,
  type WardrobeSyncDiff,
} from '@/lib/character/wardrobeScriptSync'

export const runtime = 'nodejs'
export const maxDuration = 300

interface SyncCharacterInput {
  id: string
  name: string
  role?: string
  appearanceDescription?: string
  wardrobes?: ExistingWardrobeLike[]
}

interface SyncWardrobesRequest {
  /** Single-character mode */
  character?: SyncCharacterInput
  /** Project-wide mode */
  characters?: SyncCharacterInput[]
  scenes: WardrobeAnalysisSceneInput[]
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    logline?: string
  }
}

async function analyzeCharacterLooks(
  character: SyncCharacterInput,
  scenes: WardrobeAnalysisSceneInput[],
  screenplayContext?: SyncWardrobesRequest['screenplayContext']
): Promise<{ suggestions: WardrobeSuggestionLike[]; analysis: string; characterScenes: number }> {
  const characterScenes = scenes.filter((s) =>
    sceneIncludesCharacter(s, character.name)
  )

  if (characterScenes.length === 0) {
    return { suggestions: [], analysis: '', characterScenes: 0 }
  }

  const sceneContext = characterScenes
    .map((s) => formatSceneForWardrobeAnalysis(s, character.name))
    .join('\n\n---\n\n')

  const existing = character.wardrobes || []
  const existingList = existing.length
    ? `\n\nEXISTING LOOKS (prefer UPDATING these — match by name/outfit; remap sceneNumbers; refresh appearanceNotes; only create when truly new):\n${existing
        .map(
          (w) =>
            `- id=${w.id} name="${w.name}" scenes=[${(w.sceneNumbers || []).join(', ')}] desc="${(w.description || '').slice(0, 120)}" notes="${(w.appearanceNotes || '').slice(0, 80)}"`
        )
        .join('\n')}`
    : ''

  const analysisPrompt = `You are a costume designer and makeup/hair continuity supervisor RESYNCING wardrobe looks after a script edit for ${character.name}.

CHARACTER: ${character.name}
Role: ${character.role || 'Supporting'}
Appearance: ${character.appearanceDescription || 'Not specified'}

SCREENPLAY CONTEXT:
Genre: ${screenplayContext?.genre || 'Drama'}
Tone: ${screenplayContext?.tone || 'Neutral'}
Setting: ${screenplayContext?.setting || 'Contemporary'}
Logline: ${screenplayContext?.logline || 'Not specified'}

SCENES WHERE ${character.name.toUpperCase()} APPEARS (including beat-level detail):
${sceneContext}
${existingList}

TASK: Produce the DISTINCT wardrobes/outfits AND character looks ${character.name} needs NOW based on the current script.

RESYNC RULES:
1. Prefer updating an existing look (same outfit / same name) with refreshed sceneNumbers and appearanceNotes over creating near-duplicates.
2. Create a new look only for a clearly different outfit OR a distinct appearance-only variant (same clothes, different injuries/hair/makeup).
3. Outfit changes: time of day, context, explicit costume changes, time jumps.
4. Appearance changes (makeup, hair state, injuries) go in appearanceNotes — required for image generation.
5. Do NOT invent looks for scenes where the character does not appear.
6. Hairstyle/hair-state and physical changes belong in appearanceNotes (or a new look variant) — do not rewrite base identity hair fields.
7. Group consecutive scenes that share the same outfit AND look.

For each DISTINCT wardrobe/look needed, provide:
- name, description, accessories, appearanceNotes, sceneNumbers, reason, confidence

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "accessories": "string (optional)",
      "appearanceNotes": "string (optional)",
      "sceneNumbers": [1, 2],
      "reason": "string",
      "confidence": 0.9
    }
  ],
  "analysis": "Brief overall analysis"
}`

  const result = await generateText(analysisPrompt, {
    temperature: 0.5,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  })

  let suggestions: WardrobeSuggestionLike[] = []
  let analysis = ''

  try {
    const parsed = safeParseJsonFromText(result.text)
    suggestions = (parsed.suggestions || []).map((s: any) => ({
      name: s.name,
      description: s.description,
      accessories: s.accessories || undefined,
      appearanceNotes: s.appearanceNotes || undefined,
      sceneNumbers: s.sceneNumbers || [],
      reason: s.reason || '',
      confidence: s.confidence || 0.7,
    }))
    analysis = parsed.analysis || ''
  } catch (parseError) {
    console.error('[Wardrobe Sync] Failed to parse AI response:', parseError)
    console.error('[Wardrobe Sync] Raw response:', result.text)
  }

  suggestions = enrichSuggestionsWithBeatAppearanceNotes(
    suggestions,
    characterScenes,
    character.name
  )

  suggestions.sort((a, b) => {
    const aFirst = Math.min(...(a.sceneNumbers || [999]))
    const bFirst = Math.min(...(b.sceneNumbers || [999]))
    if (aFirst !== bFirst) return aFirst - bFirst
    return (b.confidence || 0) - (a.confidence || 0)
  })

  return { suggestions, analysis, characterScenes: characterScenes.length }
}

/**
 * Resync character wardrobe looks from the current script.
 * Returns diffs (updates / creates / obsolete) — does not persist.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SyncWardrobesRequest = await req.json()
    const { scenes, screenplayContext } = body

    const characters: SyncCharacterInput[] = body.characters?.length
      ? body.characters
      : body.character
        ? [body.character]
        : []

    if (characters.length === 0) {
      return NextResponse.json(
        { error: 'character or characters is required' },
        { status: 400 }
      )
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes provided for analysis' },
        { status: 400 }
      )
    }

    const diffs: WardrobeSyncDiff[] = []
    const errors: Array<{ characterId: string; characterName: string; error: string }> = []

    for (const character of characters) {
      if (!character?.name?.trim()) {
        errors.push({
          characterId: character?.id || '',
          characterName: character?.name || '',
          error: 'Character name is required',
        })
        continue
      }

      try {
        console.log(
          `[Wardrobe Sync] Analyzing ${scenes.length} scenes for ${character.name}`
        )
        const { suggestions, analysis, characterScenes } =
          await analyzeCharacterLooks(character, scenes, screenplayContext)

        const diff = buildWardrobeSyncDiff(
          character.id,
          character.name,
          character.wardrobes || [],
          suggestions,
          analysis
        )

        console.log(
          `[Wardrobe Sync] ${character.name}: scenes=${characterScenes}`,
          summarizeWardrobeSyncDiff(diff)
        )
        diffs.push(diff)
      } catch (err: any) {
        console.error(`[Wardrobe Sync] Failed for ${character.name}:`, err)
        errors.push({
          characterId: character.id,
          characterName: character.name,
          error: err?.message || 'Failed to sync wardrobes',
        })
      }
    }

    const totals = diffs.reduce(
      (acc, diff) => {
        const s = summarizeWardrobeSyncDiff(diff)
        acc.updates += s.updateCount
        acc.creates += s.createCount
        acc.obsolete += s.obsoleteCount
        acc.staleImages += s.staleImageCount
        return acc
      },
      { updates: 0, creates: 0, obsolete: 0, staleImages: 0 }
    )

    return NextResponse.json({
      success: true,
      diffs,
      totals,
      analyzedScenes: scenes.length,
      errors,
    })
  } catch (error: any) {
    console.error('[Wardrobe Sync] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync wardrobes from script' },
      { status: 500 }
    )
  }
}
