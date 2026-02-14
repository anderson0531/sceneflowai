import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
  scenes: Array<{
    sceneNumber: number
    heading?: string
    action?: string
    visualDescription?: string
    dialogue?: string
  }>
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

    // Build scene context for AI analysis
    // Only include scenes where the character appears (has dialogue or is mentioned)
    const characterScenes = scenes.filter(s => {
      const sceneText = [
        s.heading,
        s.action,
        s.visualDescription,
        s.dialogue
      ].filter(Boolean).join(' ').toLowerCase()
      
      return sceneText.includes(character.name.toLowerCase())
    })

    if (characterScenes.length === 0) {
      console.log(`[Wardrobe Suggestion] Character ${character.name} not found in any scenes`)
      return NextResponse.json({
        suggestions: [],
        analyzedScenes: scenes.length,
        characterScenes: 0
      })
    }

    const sceneContext = characterScenes.map(s => {
      const parts = []
      parts.push(`Scene ${s.sceneNumber}:`)
      if (s.heading) parts.push(`Location: ${s.heading}`)
      if (s.action) parts.push(`Action: ${s.action}`)
      if (s.visualDescription) parts.push(`Visual: ${s.visualDescription}`)
      if (s.dialogue) parts.push(`Dialogue: ${s.dialogue}`)
      return parts.join('\n')
    }).join('\n\n---\n\n')

    const existingWardrobesList = character.existingWardrobes?.length
      ? `\n\nExisting wardrobes (already defined - DO NOT suggest these again):\n${character.existingWardrobes.map(w => `- ${w.name}${w.sceneNumbers?.length ? ` (Scenes ${w.sceneNumbers.join(', ')})` : ''}`).join('\n')}`
      : ''

    // Use Gemini to analyze script for wardrobe requirements
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Missing Gemini API key')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const analysisPrompt = `You are a costume designer analyzing a film script to determine what wardrobes/outfits a character needs across different scenes.

CHARACTER: ${character.name}
Role: ${character.role || 'Supporting'}
Appearance: ${character.appearanceDescription || 'Not specified'}

SCREENPLAY CONTEXT:
Genre: ${screenplayContext?.genre || 'Drama'}
Tone: ${screenplayContext?.tone || 'Neutral'}
Setting: ${screenplayContext?.setting || 'Contemporary'}
Logline: ${screenplayContext?.logline || 'Not specified'}

SCENES WHERE ${character.name.toUpperCase()} APPEARS:
${sceneContext}
${existingWardrobesList}

TASK: Analyze the script and determine what DISTINCT wardrobes/outfits ${character.name} needs.

IMPORTANT RULES:
1. If the character appears in similar locations/contexts throughout, they may only need 1 outfit
2. Only suggest multiple outfits if there are CLEAR wardrobe changes indicated by:
   - Different times of day (e.g., morning pajamas vs daytime clothes vs evening formal)
   - Different contexts (work vs home vs special event)
   - Explicit costume changes mentioned in action
   - Significant time jumps between scenes
3. Group consecutive scenes that would logically use the same outfit
4. Be practical - not every scene needs a different outfit

For each DISTINCT wardrobe needed, provide:
- name: A descriptive name (e.g., "Office Attire", "Evening Gown", "Casual Home")
- description: Detailed outfit description for image generation (fabrics, colors, style, fit)
- accessories: Key accessories (jewelry, watch, glasses, bag, etc.)
- sceneNumbers: Array of scene numbers where this outfit is worn
- reason: Brief explanation of why this outfit is needed (context/story reason)
- confidence: 0-1 how confident this wardrobe is necessary

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string (detailed for image generation)",
      "accessories": "string (optional)",
      "sceneNumbers": [1, 2, 3],
      "reason": "string (why this outfit for these scenes)",
      "confidence": 0.9
    }
  ],
  "analysis": "Brief overall analysis of the character's wardrobe needs"
}`

    const result = await model.generateContent(analysisPrompt)
    const responseText = result.response.text()

    // Parse JSON from response
    let suggestions: WardrobeSuggestion[] = []
    let analysis = ''
    
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        suggestions = (parsed.suggestions || []).map((s: any) => ({
          name: s.name,
          description: s.description,
          accessories: s.accessories || undefined,
          sceneNumbers: s.sceneNumbers || [],
          reason: s.reason || '',
          confidence: s.confidence || 0.7
        }))
        analysis = parsed.analysis || ''
      }
    } catch (parseError) {
      console.error('[Wardrobe Suggestion] Failed to parse AI response:', parseError)
      console.error('[Wardrobe Suggestion] Raw response:', responseText)
    }

    // Filter out suggestions that match existing wardrobes
    if (character.existingWardrobes?.length) {
      const existingNames = character.existingWardrobes.map(w => w.name.toLowerCase())
      suggestions = suggestions.filter(s => 
        !existingNames.includes(s.name.toLowerCase())
      )
    }

    // Sort by scene number (earliest appearance first) then by confidence
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
