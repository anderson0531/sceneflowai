import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { ObjectSuggestion, ObjectCategory, ObjectImportance } from '@/types/visionReferences'
import {
  MIN_BEATS_FOR_LIBRARY,
  countObjectBeatReferences,
  harvestKeyPropNames,
  normalizeObjectName,
} from '@/lib/vision/objectBeatUsage'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SuggestObjectsScene {
  sceneNumber: number
  heading?: string
  action?: string
  visualDescription?: string
  description?: string
  /** Beats of the scene, used to count real per-beat object usage. */
  beats?: unknown[]
}

interface SuggestObjectsRequest {
  scenes: SuggestObjectsScene[]
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

    const hasBeats = scenes.some((s) => Array.isArray(s.beats) && s.beats.length > 0)
    console.log(
      `[Key Props] Analyzing ${scenes.length} scenes for significant objects (beat data: ${hasBeats ? 'yes' : 'no'})`
    )

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

    // Objects the beat direction already names, with how many beats handle each.
    // These are established by the script, so they anchor naming and guarantee
    // the recurring ones come back described rather than being rediscovered.
    const taggedNames = hasBeats ? harvestKeyPropNames(scenes) : []
    const taggedUsage = taggedNames.length > 0 ? countObjectBeatReferences(scenes, taggedNames) : []
    const recurringTagged = taggedUsage.filter((u) => u.beatCount >= MIN_BEATS_FOR_LIBRARY)
    const taggedInventory = recurringTagged.length > 0
      ? `\n\nOBJECTS THE BEAT DIRECTION ALREADY HANDLES (beat counts measured from the script — you MUST include every one of these in your suggestions, described for image generation):\n${recurringTagged
          .map((u) => `- ${u.name} — ${u.beatCount} beats (scenes ${u.sceneNumbers.join(', ')})`)
          .join('\n')}`
      : ''

    // Use Vertex AI Gemini to analyze script for significant objects
    const analysisPrompt = `You are a production designer analyzing a film script to identify significant props, vehicles, set pieces, costumes, and technology items that need consistent visual reference images for production.

SCRIPT SCENES:
${sceneContext}
${existingObjectsList}${taggedInventory}

CRITICAL: Focus on RECURRING PROPS that are handled in MULTIPLE BEATS. A beat is one rendered shot, so an object held across several beats of a single scene needs a reference image just as much as one that crosses scenes. Items appearing in a single beat should NOT be included unless they are critical plot devices.

Identify 3-8 significant objects that:
1. MUST be handled in 2+ beats OR be critical to the plot (mark as "critical" importance)
2. Need visual consistency across production  
3. Would benefit from a clean reference image for the art department
4. Are specific enough to generate (not generic items like "chair" unless it's a distinctive hero prop)
5. Track EXACTLY which scene numbers each object appears in

For each object, provide:
- name: Short, specific VISUAL name that does NOT include character names, location names, or possessives (e.g. "1893 Water-Damaged Leather Journal", "Brass Faraday Energy Core", "Rugged Military Laptop"). NEVER use forms like "Marcus's Vintage Pocket Watch" or "Arthur Pendelton's 1893 Journal" — ownership is stored separately, not in the prompt-facing name.
- description: Detailed visual description for image generation (materials, colors, style, era, condition)
- category: One of: prop, vehicle, set-piece, costume, technology, other
- importance: One of: critical (plot device that drives the story), important (handled in 2+ beats), background (atmosphere only - AVOID these unless essential)
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

    const result = await generateText(analysisPrompt, {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingBudget: 0,       // Disable thinking — structured JSON extraction, not reasoning
      timeoutMs: 45000,        // 45s to stay within 60s maxDuration
      maxRetries: 1,           // Single retry to avoid compounding timeouts
    })

    // Parse JSON from response using safe parser
    let suggestions: ObjectSuggestion[] = []
    try {
      const parsed = safeParseJsonFromText(result.text)
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
    } catch (parseError) {
      console.error('[Key Props] Failed to parse AI response:', parseError)
      console.error('[Key Props] Raw response:', result.text)
    }

    // Recurrence is decided by counting the script, not by the scene numbers the
    // model recalls: it routinely under-reports, and scene counts miss an object
    // handled across many beats of one scene.
    if (hasBeats) {
      const usageByKey = new Map(
        countObjectBeatReferences(
          scenes,
          suggestions.map((s) => s.name)
        ).map((usage) => [usage.key, usage])
      )
      suggestions = suggestions.map((s) => {
        const usage = usageByKey.get(normalizeObjectName(s.name))
        if (!usage) return { ...s, beatRefs: [], beatCount: 0 }
        return {
          ...s,
          beatRefs: usage.beatRefs,
          beatCount: usage.beatCount,
          sceneNumbers: usage.sceneNumbers.length > 0 ? usage.sceneNumbers : s.sceneNumbers,
        }
      })
    }

    // Only show objects the script actually handles more than once, plus plot
    // devices, so single-appearance dressing never clutters the library.
    const filteredSuggestions = suggestions.filter(s =>
      hasBeats
        ? (s.beatCount ?? 0) >= MIN_BEATS_FOR_LIBRARY || s.importance === 'critical'
        : s.sceneNumbers.length >= 2 || s.importance === 'critical'
    )

    // Sort by importance and confidence
    filteredSuggestions.sort((a, b) => {
      const importanceOrder = { critical: 3, important: 2, background: 1 }
      const aScore = (importanceOrder[a.importance] || 0) + a.confidence
      const bScore = (importanceOrder[b.importance] || 0) + b.confidence
      return bScore - aScore
    })

    console.log(`[Key Props] Found ${suggestions.length} total, ${filteredSuggestions.length} recurring/critical props`)

    return NextResponse.json({
      suggestions: filteredSuggestions,
      analyzedScenes: scenes.length,
      beatCountingEnabled: hasBeats,
      minBeatsForLibrary: MIN_BEATS_FOR_LIBRARY,
      totalSuggested: suggestions.length,
      filteredCount: filteredSuggestions.length
    })

  } catch (error: any) {
    console.error('[Key Props] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze script for objects' },
      { status: 500 }
    )
  }
}
