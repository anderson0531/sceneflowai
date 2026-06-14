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

export const runtime = 'nodejs'
export const maxDuration = 60

interface SuggestWardrobesRequest {
  character: {
    id: string
    name: string
    role?: string
    appearanceDescription?: string
    existingWardrobes?: Array<{
      name: string
      sceneNumbers?: number[]
    }>
  }
  scenes: WardrobeAnalysisSceneInput[]
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    logline?: string
  }
}

interface WardrobeSuggestion {
  name: string
  description: string
  accessories?: string
  appearanceNotes?: string
  sceneNumbers: number[]
  reason: string
  confidence: number
}

/**
 * Analyze script scenes to suggest wardrobes needed for a character
 * Following the Object Suggestion pattern for consistency
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SuggestWardrobesRequest = await req.json()
    const { character, scenes, screenplayContext } = body

    if (!character?.name) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes provided for analysis' },
        { status: 400 }
      )
    }

    console.log(`[Wardrobe Suggestion] Analyzing ${scenes.length} scenes for ${character.name}`)

    const characterScenes = scenes.filter((s) =>
      sceneIncludesCharacter(s, character.name)
    )

    if (characterScenes.length === 0) {
      console.log(`[Wardrobe Suggestion] Character ${character.name} not found in any scenes`)
      return NextResponse.json({
        suggestions: [],
        analyzedScenes: scenes.length,
        characterScenes: 0
      })
    }

    const sceneContext = characterScenes
      .map((s) => formatSceneForWardrobeAnalysis(s, character.name))
      .join('\n\n---\n\n')

    const existingWardrobesList = character.existingWardrobes?.length
      ? `\n\nExisting wardrobes (already defined - DO NOT suggest these again):\n${character.existingWardrobes.map(w => `- ${w.name}${w.sceneNumbers?.length ? ` (Scenes ${w.sceneNumbers.join(', ')})` : ''}`).join('\n')}`
      : ''

    const analysisPrompt = `You are a costume designer and makeup/hair continuity supervisor analyzing a film script to determine what wardrobes and character looks ${character.name} needs across different scenes.

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
${existingWardrobesList}

TASK: Analyze the script and determine what DISTINCT wardrobes/outfits AND character looks ${character.name} needs.

IMPORTANT RULES — OUTFIT CHANGES:
1. If the character appears in similar locations/contexts throughout, they may only need 1 outfit
2. Only suggest multiple outfits if there are CLEAR wardrobe changes indicated by:
   - Different times of day (e.g., morning pajamas vs daytime clothes vs evening formal)
   - Different contexts (work vs home vs special event)
   - Explicit costume changes mentioned in action
   - Significant time jumps between scenes
3. Group consecutive scenes that would logically use the same outfit AND look
4. Be practical - not every scene needs a different outfit

IMPORTANT RULES — APPEARANCE CHANGES (makeup, hair, injuries):
5. Detect DISTINCT character looks when makeup, hairstyle, or visible injuries/marks change:
   - Makeup: natural, smudged, formal, runny mascara, lipstick, contour, etc.
   - Hair: pulled back, in a bun, wet, disheveled, loose, slicked back, etc.
   - Injuries/marks: bruises, cuts, bloodshot eyes, swelling, bandages, black eyes, etc.
6. When ONLY appearance changes (same outfit), create a SEPARATE wardrobe variant with the SAME description and accessories but distinct appearanceNotes and sceneNumbers (e.g., "Interrogation — Distressed")
7. Put ALL makeup, hair state, and injury details in appearanceNotes — NOT only in reason. appearanceNotes is used for reference image generation.
8. Read beat-level lines carefully — close-ups often describe bruises, bloodshot eyes, and makeup that scene summaries omit.

For each DISTINCT wardrobe/look needed, provide:
- name: A descriptive name (e.g., "Office Attire", "Interrogation — Distressed")
- description: Detailed outfit description for image generation (fabrics, colors, style, fit)
- accessories: Key accessories (jewelry, watch, glasses, bag, etc.)
- appearanceNotes: Makeup, hair state, visible injuries/marks for this look (omit if baseline/neutral)
- sceneNumbers: Array of scene numbers where this outfit AND look apply
- reason: Brief explanation of why this outfit/look for these scenes
- confidence: 0-1 how confident this wardrobe is necessary

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string (detailed for image generation)",
      "accessories": "string (optional)",
      "appearanceNotes": "string (optional — makeup, hair, injuries for image gen)",
      "sceneNumbers": [1, 2, 3],
      "reason": "string (why this outfit/look for these scenes)",
      "confidence": 0.9
    }
  ],
  "analysis": "Brief overall analysis of the character's wardrobe and look needs"
}`

    const result = await generateText(analysisPrompt, {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    })

    let suggestions: WardrobeSuggestion[] = []
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
        confidence: s.confidence || 0.7
      }))
      analysis = parsed.analysis || ''
    } catch (parseError) {
      console.error('[Wardrobe Suggestion] Failed to parse AI response:', parseError)
      console.error('[Wardrobe Suggestion] Raw response:', result.text)
    }

    if (character.existingWardrobes?.length) {
      const existingNames = character.existingWardrobes.map(w => w.name.toLowerCase())
      suggestions = suggestions.filter(s => 
        !existingNames.includes(s.name.toLowerCase())
      )
    }

    suggestions.sort((a, b) => {
      const aFirst = Math.min(...(a.sceneNumbers || [999]))
      const bFirst = Math.min(...(b.sceneNumbers || [999]))
      if (aFirst !== bFirst) return aFirst - bFirst
      return b.confidence - a.confidence
    })

    console.log(`[Wardrobe Suggestion] Found ${suggestions.length} wardrobe suggestion(s) for ${character.name}`)
    console.log(`[Wardrobe Suggestion] Analysis: ${analysis}`)

    return NextResponse.json({
      suggestions,
      analysis,
      analyzedScenes: scenes.length,
      characterScenes: characterScenes.length
    })

  } catch (error: any) {
    console.error('[Wardrobe Suggestion] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze script for wardrobes' },
      { status: 500 }
    )
  }
}
