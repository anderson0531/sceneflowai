import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ObjectSuggestion, ObjectCategory, ObjectImportance } from '@/types/visionReferences'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SuggestObjectsRequest {
  scenes: Array<{
    sceneNumber: number
    heading?: string
    action?: string
    visualDescription?: string
    description?: string
  }>
  existingObjects?: string[] // Names of already-added objects to exclude
}

/**
 * Object suggestion prompts optimized for clean reference image generation
 */
function buildObjectPrompt(name: string, category: ObjectCategory, description: string): string {
  const categoryStyles: Record<ObjectCategory, string> = {
    'prop': 'Product photography style, centered composition, soft shadows, clean white or neutral gray background',
    'vehicle': 'Automotive photography style, 3/4 angle view, studio lighting, clean gradient background',
    'set-piece': 'Architectural photography style, clean composition, professional lighting, minimal background',
    'costume': 'Fashion photography style, on mannequin or flat lay, clean white background, detailed fabric texture',
    'technology': 'Tech product photography style, sleek presentation, subtle reflections, dark gradient or white background',
    'other': 'Professional product photography, centered subject, clean studio lighting, neutral background'
  }

  const baseStyle = categoryStyles[category] || categoryStyles.other

  return `${description}. ${baseStyle}. High resolution, sharp focus, professional reference image for film production.`
}

/**
 * Analyze script scenes to suggest significant objects that need reference images
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SuggestObjectsRequest = await req.json()
    const { scenes, existingObjects = [] } = body

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes provided for analysis' },
        { status: 400 }
      )
    }

    console.log(`[Object Suggestion] Analyzing ${scenes.length} scenes for significant objects`)

    // Build scene context for AI analysis
    const sceneContext = scenes.map(s => {
      const parts = []
      if (s.heading) parts.push(`Scene ${s.sceneNumber}: ${s.heading}`)
      if (s.action) parts.push(`Action: ${s.action}`)
      if (s.visualDescription) parts.push(`Visual: ${s.visualDescription}`)
      if (s.description) parts.push(`Description: ${s.description}`)
      return parts.join('\n')
    }).join('\n\n---\n\n')

    const existingObjectsList = existingObjects.length > 0
      ? `\n\nAlready added objects (exclude these): ${existingObjects.join(', ')}`
      : ''

    // Use Gemini to analyze script for significant objects
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Missing Gemini API key')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const analysisPrompt = `You are a production designer analyzing a film script to identify significant props, vehicles, set pieces, costumes, and technology items that need consistent visual reference images for production.

SCRIPT SCENES:
${sceneContext}
${existingObjectsList}

Identify 3-8 significant objects that:
1. Appear in multiple scenes OR are central to the plot
2. Need visual consistency across production
3. Would benefit from a clean reference image for the art department
4. Are specific enough to generate (not generic items like "chair" unless it's a distinctive hero prop)

For each object, provide:
- name: Short, specific name (e.g., "Marcus's Vintage Pocket Watch", "The Genesis Device")
- description: Detailed visual description for image generation (materials, colors, style, era, condition)
- category: One of: prop, vehicle, set-piece, costume, technology, other
- importance: One of: critical (plot device), important (recurring), background (atmosphere)
- sceneNumbers: Array of scene numbers where it appears
- confidence: 0-1 how confident you are this needs a reference image

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "category": "prop|vehicle|set-piece|costume|technology|other",
      "importance": "critical|important|background",
      "sceneNumbers": [1, 2, 3],
      "confidence": 0.9
    }
  ]
}`

    const result = await model.generateContent(analysisPrompt)
    const responseText = result.response.text()

    // Parse JSON from response
    let suggestions: ObjectSuggestion[] = []
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        suggestions = (parsed.suggestions || []).map((s: any, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          name: s.name,
          description: s.description,
          category: s.category as ObjectCategory,
          importance: s.importance as ObjectImportance,
          suggestedPrompt: buildObjectPrompt(s.name, s.category, s.description),
          sceneNumbers: s.sceneNumbers || [],
          confidence: s.confidence || 0.7
        }))
      }
    } catch (parseError) {
      console.error('[Object Suggestion] Failed to parse AI response:', parseError)
      console.error('[Object Suggestion] Raw response:', responseText)
    }

    // Sort by importance and confidence
    suggestions.sort((a, b) => {
      const importanceOrder = { critical: 3, important: 2, background: 1 }
      const aScore = (importanceOrder[a.importance] || 0) + a.confidence
      const bScore = (importanceOrder[b.importance] || 0) + b.confidence
      return bScore - aScore
    })

    console.log(`[Object Suggestion] Found ${suggestions.length} suggested objects`)

    return NextResponse.json({
      suggestions,
      analyzedScenes: scenes.length
    })

  } catch (error: any) {
    console.error('[Object Suggestion] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze script for objects' },
      { status: 500 }
    )
  }
}
