import { NextRequest, NextResponse } from 'next/server'
import { analyzeDuration } from '@/lib/treatment/duration'
import { safeParseJsonFromText } from '@/lib/safeJson'

export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * Structured concept suggestion returned for vague ideas
 */
interface ConceptSuggestion {
  title: string
  logline: string
  genre: string
  tone: string
  format: string
  estimatedDuration: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, count = 5, mode = 'text' } = body
    
    if (!keyword || keyword.trim().length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Keyword too short' 
      }, { status: 400 })
    }

    // Analyze input length to determine if we should generate synopsis or variations
    const estimatedMinutes = analyzeDuration(keyword, 20)
    const isLongForm = estimatedMinutes >= 10
    
    // NEW: Check if this is a "structured" mode request for vague ideas
    // Returns JSON objects instead of text lines
    const isStructuredMode = mode === 'structured'
    
    if (isStructuredMode) {
      // Generate structured concept suggestions for vague ideas
      return await generateStructuredConcepts(keyword, Math.min(count, 6))
    }
    
    // Original text-based variation generation
    // Adaptive prompt based on content length
    const promptType = isLongForm 
      ? 'Generate 5 unique SYNOPSIS variations'
      : 'Generate 5 unique variations'
    
    const contentType = isLongForm ? 'story' : 'concept'
    
    const specificInstructions = isLongForm
      ? 'Each synopsis should capture the core narrative, main characters, and emotional arc in 25-40 words. Focus on plot progression and key dramatic moments.'
      : 'Each variation should rephrase and enhance the core idea in 25-40 words. Emphasize visual aesthetics, emotional journey, and narrative structure.'

    const prompt = `You are a creative film strategist. ${promptType} of the following ${contentType}: "${keyword}"

${specificInstructions}

STYLE REQUIREMENTS:
- Each ${isLongForm ? 'synopsis' : 'variation'}: 25-40 words (full sentence structure)
- Paint a vivid picture: sensory details, emotional tone, specific visuals
- Include: ${isLongForm ? 'plot, characters, conflict' : 'runtime, visual style, narrative approach, audience emotion'}
- Make each ${isLongForm ? 'synopsis' : 'variation'} DISTINCTLY different in ${isLongForm ? 'narrative focus and dramatic emphasis' : 'genre, mood, and execution'}
- Use evocative, cinematic language that sparks imagination

COMPELLING EXAMPLES:
- "A 90-second documentary portrait of an aging jazz musician in dim, smoke-filled clubs. Intimate close-ups capture weathered hands on piano keys. Melancholic yet hopeful tone celebrates musical legacy and the passage of time."
- "30-second product reveal for luxury timepiece. Slow-motion macro shots reveal intricate mechanical movements. Dark, moody cinematography with dramatic lighting. Evokes precision, craftsmanship, and timeless elegance."
- "2-minute founder story filmed in golden hour at startup warehouse. Handheld camera follows determined entrepreneur through authentic daily moments. Raw, vulnerable tone builds to inspiring crescendo showcasing vision realized."

CRITICAL:
- Be SPECIFIC about ${isLongForm ? 'character motivations, plot turns, and conflicts' : 'visual aesthetics (lighting, camera movement, color palette)'}
- Include EMOTIONAL journey (how viewer should feel)
- ${isLongForm ? 'Capture the STORY ARC (setup, conflict, resolution)' : 'Suggest NARRATIVE structure (opening, development, payoff)'}
- Avoid generic words like "engaging" or "compelling"

OUTPUT FORMAT: Return ONLY the variations, one per line, no numbering, no markdown.`

    // Call Gemini API directly with high temperature for creativity
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('Google Gemini API key not configured')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95, // High creativity for diversity
            topP: 0.95,
            maxOutputTokens: 500
          }
        }),
      }
    ).finally(() => clearTimeout(timeout))

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const response = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!response) {
      throw new Error('Gemini returned empty content')
    }

    const variants = parseVariants(response)

    return NextResponse.json({
      success: true,
      keyword,
      variants,
      count: variants.length
    })
  } catch (error: any) {
    console.error('[Inspiration API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Generation failed'
    }, { status: 500 })
  }
}

function parseVariants(llmResponse: string): string[] {
  return llmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => 
      line.length >= 20 && 
      line.length <= 400 &&
      !line.startsWith('#') &&
      !line.startsWith('**') &&
      !/^(Here|These|Output)/i.test(line)
    )
    .map(line => line.replace(/^[\d\.\)\-\*]+\s*/, '')) // Remove numbering
    .slice(0, 6) // Max 6 variants
}

/**
 * Generate structured concept suggestions for vague ideas
 * Returns JSON objects with title, logline, genre, tone, format
 */
async function generateStructuredConcepts(vagueIdea: string, count: number): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'Google Gemini API key not configured' 
    }, { status: 500 })
  }

  const prompt = `You are a creative film development assistant. A user has a vague idea and needs inspiration.

USER'S VAGUE IDEA: "${vagueIdea}"

Generate ${count} DISTINCTLY DIFFERENT concept suggestions that expand and clarify this idea. Each concept should take the vague idea in a unique creative direction.

For each concept, provide:
1. title: A compelling working title (3-7 words)
2. logline: A one-sentence pitch that hooks the viewer (20-35 words)
3. genre: Primary genre/style (documentary, drama, comedy, thriller, explainer, product demo, brand story, tutorial, testimonial, etc.)
4. tone: Emotional tone (inspiring, mysterious, playful, dramatic, heartfelt, energetic, contemplative, urgent, etc.)
5. format: Suggested format (short film, micro-doc, explainer video, brand story, product demo, social content, etc.)
6. estimatedDuration: Suggested runtime (e.g., "60 seconds", "3 minutes", "5-7 minutes")

DIVERSITY RULES:
- Each concept MUST have a different genre
- Each concept MUST have a different tone
- Vary formats from quick social content to longer narrative pieces
- Include at least one unexpected/creative interpretation
- Make concepts range from practical to ambitious

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no explanation.
Example: [{"title":"...", "logline":"...", "genre":"...", "tone":"...", "format":"...", "estimatedDuration":"..."}]`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 1500,
            responseMimeType: 'application/json'
          }
        }),
      }
    ).finally(() => clearTimeout(timeout))

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const response = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!response) {
      throw new Error('Gemini returned empty content')
    }

    // Parse the JSON response
    let concepts: ConceptSuggestion[]
    try {
      concepts = safeParseJsonFromText(response)
      if (!Array.isArray(concepts)) {
        concepts = [concepts]
      }
    } catch {
      // Fallback parsing if JSON is malformed
      concepts = []
    }

    // Validate and clean concepts
    const validConcepts = concepts
      .filter((c): c is ConceptSuggestion => 
        typeof c === 'object' && 
        c !== null &&
        typeof c.title === 'string' && 
        typeof c.logline === 'string'
      )
      .slice(0, count)
      .map((c, idx) => ({
        id: `concept-${Date.now()}-${idx}`,
        title: c.title || `Concept ${idx + 1}`,
        logline: c.logline || '',
        genre: c.genre || 'general',
        tone: c.tone || 'engaging',
        format: c.format || 'short video',
        estimatedDuration: c.estimatedDuration || '2-3 minutes'
      }))

    return NextResponse.json({
      success: true,
      mode: 'structured',
      originalIdea: vagueIdea,
      concepts: validConcepts,
      count: validConcepts.length
    })

  } catch (error: any) {
    console.error('[Inspiration API] Structured generation error:', error)
    
    // Return fallback concepts on error
    const fallbackConcepts = generateFallbackConcepts(vagueIdea, count)
    
    return NextResponse.json({
      success: true,
      mode: 'structured',
      originalIdea: vagueIdea,
      concepts: fallbackConcepts,
      count: fallbackConcepts.length,
      fallback: true
    })
  }
}

/**
 * Generate basic fallback concepts when API fails
 */
function generateFallbackConcepts(idea: string, count: number): Array<ConceptSuggestion & { id: string }> {
  const templates = [
    {
      genre: 'documentary',
      tone: 'inspiring',
      format: 'mini-doc',
      estimatedDuration: '3-5 minutes',
      titleSuffix: 'Story',
      loglineTemplate: (i: string) => `An intimate documentary exploring ${i}, revealing the human stories and unexpected truths behind the subject.`
    },
    {
      genre: 'explainer',
      tone: 'engaging',
      format: 'explainer video',
      estimatedDuration: '90 seconds',
      titleSuffix: 'Explained',
      loglineTemplate: (i: string) => `A clear, visually dynamic breakdown of ${i} that makes complex ideas accessible and memorable.`
    },
    {
      genre: 'brand story',
      tone: 'heartfelt',
      format: 'brand film',
      estimatedDuration: '2 minutes',
      titleSuffix: 'Journey',
      loglineTemplate: (i: string) => `A cinematic brand story that connects ${i} to deeper values of authenticity and purpose.`
    },
    {
      genre: 'tutorial',
      tone: 'helpful',
      format: 'how-to video',
      estimatedDuration: '5-7 minutes',
      titleSuffix: 'Masterclass',
      loglineTemplate: (i: string) => `A step-by-step guide to ${i} that empowers viewers with practical skills and insider knowledge.`
    },
    {
      genre: 'drama',
      tone: 'dramatic',
      format: 'short film',
      estimatedDuration: '8-10 minutes',
      titleSuffix: 'Chronicles',
      loglineTemplate: (i: string) => `A narrative short film that dramatizes ${i} through compelling characters facing transformative choices.`
    },
    {
      genre: 'social content',
      tone: 'playful',
      format: 'social video',
      estimatedDuration: '30-60 seconds',
      titleSuffix: 'Spotlight',
      loglineTemplate: (i: string) => `A punchy, scroll-stopping take on ${i} designed for maximum shareability and engagement.`
    }
  ]
  
  const baseTitle = idea.split(' ').slice(0, 3).join(' ') || 'Untitled'
  
  return templates.slice(0, count).map((t, idx) => ({
    id: `fallback-${Date.now()}-${idx}`,
    title: `${baseTitle} ${t.titleSuffix}`,
    logline: t.loglineTemplate(idea),
    genre: t.genre,
    tone: t.tone,
    format: t.format,
    estimatedDuration: t.estimatedDuration
  }))
}
