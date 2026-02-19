/**
 * Gemini 2.5 Prompt Intelligence Service
 * 
 * Uses Gemini 2.5 Flash to intelligently generate professional prompts
 * for segment types (title sequences, establishing shots, etc.) and keyframes
 * based on script/treatment context analysis.
 * 
 * Features:
 * - Context-aware title sequence prompt generation (analyzes title, genre, tone)
 * - Intelligent keyframe prompts (scene direction, emotional arc, characters)
 * - Caching strategy for reduced API calls
 * - Graceful fallback to static templates
 */

import { generateText, TextGenerationOptions } from '@/lib/vertexai/gemini'
import type { DetailedSceneDirection } from '@/types/scene-direction'

// =============================================================================
// Types
// =============================================================================

export type SegmentPurpose = 
  | 'standard'
  | 'extend'
  | 'title'
  | 'match-cut'
  | 'establishing'
  | 'broll'
  | 'outro'

export interface FilmContext {
  title?: string
  logline?: string
  genre?: string[]
  tone?: string
  targetAudience?: string
  duration?: number
}

export interface SceneContext {
  heading?: string
  action?: string
  narration?: string
  visualDescription?: string
  sceneNumber?: number
  characters?: string[]
  location?: string
  timeOfDay?: string
}

export interface AdjacentSceneData {
  previousScene?: SceneContext
  currentScene: SceneContext
  nextScene?: SceneContext
}

export interface PromptGenerationRequest {
  segmentPurpose: SegmentPurpose
  filmContext?: FilmContext
  adjacentScenes: AdjacentSceneData
  sceneDirection?: DetailedSceneDirection | null
  /** Override default model */
  model?: string
  /** Thinking level: low = faster, high = more detailed */
  thinkingLevel?: 'low' | 'high'
}

export interface GeneratedPromptResult {
  prompt: string
  reasoning?: string
  suggestedDuration?: number
  suggestedSettings?: {
    shotType?: string
    cameraMovement?: string
    lighting?: string
    mood?: string
  }
  confidence: number
  fromCache?: boolean
}

export interface KeyframePromptRequest {
  basePrompt: string
  framePosition: 'start' | 'end'
  filmContext?: FilmContext
  sceneContext: SceneContext
  sceneDirection?: DetailedSceneDirection | null
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
  segmentPurpose?: SegmentPurpose
  duration?: number
  thinkingLevel?: 'low' | 'high'
}

// =============================================================================
// Cache Implementation (In-Memory with TTL)
// =============================================================================

interface CacheEntry {
  result: GeneratedPromptResult
  timestamp: number
}

const promptCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCacheKey(request: PromptGenerationRequest | KeyframePromptRequest): string {
  const keyParts = [
    'purpose' in request ? request.segmentPurpose : 'keyframe',
    'framePosition' in request ? request.framePosition : '',
    request.filmContext?.title || '',
    'adjacentScenes' in request ? request.adjacentScenes.currentScene.heading : '',
    'basePrompt' in request ? request.basePrompt.slice(0, 50) : '',
    request.thinkingLevel || 'low'
  ]
  return keyParts.join('::')
}

function getFromCache(key: string): GeneratedPromptResult | null {
  const entry = promptCache.get(key)
  if (!entry) return null
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    promptCache.delete(key)
    return null
  }
  
  return { ...entry.result, fromCache: true }
}

function setCache(key: string, result: GeneratedPromptResult): void {
  promptCache.set(key, { result, timestamp: Date.now() })
  
  // Cleanup old entries (keep cache size manageable)
  if (promptCache.size > 100) {
    const oldestKey = promptCache.keys().next().value
    if (oldestKey) promptCache.delete(oldestKey)
  }
}

// =============================================================================
// Fallback Templates (Used when Gemini unavailable)
// =============================================================================

const FALLBACK_TEMPLATES: Record<SegmentPurpose, (ctx: AdjacentSceneData) => string> = {
  title: (ctx) => {
    const heading = ctx.currentScene.heading?.toLowerCase() || ''
    let background = 'Elegant blurred background with cinematic depth.'
    
    if (heading.includes('night')) {
      background = 'Dark, moody background with subtle city lights bokeh.'
    } else if (heading.includes('day') || heading.includes('morning')) {
      background = 'Warm, golden hour glow with soft lens flare.'
    }
    
    return `Cinematic title sequence. ${background} Bold white text, centered composition. Professional title card aesthetic.`
  },
  
  establishing: (ctx) => {
    const heading = ctx.currentScene.heading || ''
    const isExterior = heading.toLowerCase().includes('ext.')
    const location = heading.replace(/^(INT\.|EXT\.)\s*/i, '').split('-')[0].trim()
    
    if (isExterior) {
      return `Wide aerial establishing shot of ${location || 'the location'}. Drone perspective, sweeping view. Cinematic scale, professional composition.`
    }
    return `Wide interior establishing shot of ${location || 'the space'}. Slow reveal, atmospheric lighting. Professional composition.`
  },
  
  extend: (ctx) => {
    return 'Continue from previous shot. Maintain visual continuity, match camera angle and lighting. Seamless action flow.'
  },
  
  'match-cut': (ctx) => {
    return 'Creative match cut transition. Find visual similarity between scenes - shape, movement, or color. Smooth, seamless visual bridge. Maintain momentum across cut.'
  },
  
  broll: (ctx) => {
    return 'Atmospheric detail shot. Slow motion, shallow depth of field. Visual breathing room. Contemplative mood, ambient lighting.'
  },
  
  outro: (ctx) => {
    const heading = ctx.currentScene.heading?.toLowerCase() || ''
    const background = heading.includes('night')
      ? 'Dark, elegant background with subtle light particles.'
      : 'Clean, cinematic background with soft gradient.'
    
    return `Professional outro sequence. ${background} Slow fade or gentle upward drift. Production quality finish, credit roll aesthetic.`
  },
  
  standard: () => {
    return 'Cinematic shot. Professional lighting and composition. High production value.'
  }
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Generate an intelligent prompt for a segment type using Gemini 2.5
 * Analyzes film context, adjacent scenes, and segment purpose to create
 * professional, context-aware prompts.
 */
export async function generateSegmentPrompt(
  request: PromptGenerationRequest
): Promise<GeneratedPromptResult> {
  const cacheKey = getCacheKey(request)
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log('[PromptIntelligence] Returning cached prompt for:', request.segmentPurpose)
    return cached
  }
  
  const { segmentPurpose, filmContext, adjacentScenes, sceneDirection, thinkingLevel = 'low' } = request
  
  try {
    const systemPrompt = buildSystemPrompt(segmentPurpose)
    const userPrompt = buildUserPrompt(segmentPurpose, filmContext, adjacentScenes, sceneDirection)
    
    console.log('[PromptIntelligence] Generating prompt with Gemini 2.5 for:', segmentPurpose)
    
    const options: TextGenerationOptions = {
      model: request.model || 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      systemInstruction: systemPrompt,
      thinkingBudget: thinkingLevel === 'high' ? 8192 : 1024,
      maxRetries: 2,
      timeoutMs: 15000
    }
    
    const response = await generateText(userPrompt, options)
    
    // Parse JSON response
    let parsedResult: any
    try {
      parsedResult = JSON.parse(response.text)
    } catch {
      // If JSON parse fails, use text as prompt directly
      parsedResult = { prompt: response.text, confidence: 0.7 }
    }
    
    const result: GeneratedPromptResult = {
      prompt: parsedResult.prompt || response.text,
      reasoning: parsedResult.reasoning,
      suggestedDuration: parsedResult.suggestedDuration,
      suggestedSettings: parsedResult.suggestedSettings,
      confidence: parsedResult.confidence ?? 0.9
    }
    
    setCache(cacheKey, result)
    return result
    
  } catch (error) {
    console.error('[PromptIntelligence] Gemini call failed, using fallback:', error)
    
    // Return fallback template
    const fallbackPrompt = FALLBACK_TEMPLATES[segmentPurpose](adjacentScenes)
    return {
      prompt: fallbackPrompt,
      confidence: 0.5,
      reasoning: 'Generated from fallback template (Gemini unavailable)'
    }
  }
}

/**
 * Enhance a keyframe prompt using Gemini 2.5 intelligence
 * Takes a base prompt and enriches it with scene direction, character details,
 * and cinematic best practices.
 */
export async function enhanceKeyframePrompt(
  request: KeyframePromptRequest
): Promise<GeneratedPromptResult> {
  const cacheKey = getCacheKey(request)
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log('[PromptIntelligence] Returning cached keyframe prompt')
    return cached
  }
  
  const { 
    basePrompt, 
    framePosition, 
    filmContext, 
    sceneContext, 
    sceneDirection,
    characters,
    segmentPurpose,
    duration,
    thinkingLevel = 'low'
  } = request
  
  try {
    const systemPrompt = `You are a professional cinematographer and visual effects supervisor creating image generation prompts.
Your task is to enhance a base prompt into a detailed, production-ready prompt for ${framePosition} frame generation.

Output JSON with:
- prompt: The enhanced, detailed image generation prompt (string)
- reasoning: Brief explanation of enhancements made (string)
- suggestedSettings: { shotType, cameraMovement, lighting, mood } recommendations (object)
- confidence: Your confidence in this prompt (0-1)`

    const userPrompt = `Enhance this ${framePosition} frame prompt for a ${segmentPurpose || 'standard'} segment:

BASE PROMPT:
${basePrompt}

SCENE CONTEXT:
- Heading: ${sceneContext.heading || 'Unknown'}
- Location: ${sceneContext.location || 'Not specified'}
- Time: ${sceneContext.timeOfDay || 'Day'}
- Action: ${sceneContext.action?.slice(0, 200) || 'Not specified'}

${sceneDirection ? `SCENE DIRECTION:
- Camera: ${sceneDirection.camera?.shots?.join(', ') || 'Standard'}
- Lighting: ${sceneDirection.lighting?.overallMood || 'Natural'}
- Emotion: ${sceneDirection.emotion?.arc?.[0] || 'Neutral'}` : ''}

${characters?.length ? `CHARACTERS IN SCENE:
${characters.map(c => `- ${c.name}: ${c.appearance || 'No description'}`).join('\n')}` : ''}

${filmContext ? `FILM CONTEXT:
- Title: ${filmContext.title || 'Untitled'}
- Genre: ${filmContext.genre?.join(', ') || 'Drama'}
- Tone: ${filmContext.tone || 'Dramatic'}` : ''}

Duration: ${duration || 6} seconds

Create a detailed, visually rich prompt that:
1. Preserves the original intent
2. Adds specific cinematic details (lens, depth of field, color grading)
3. Ensures character consistency if referenced
4. Matches the scene's emotional tone
5. Is optimized for AI image generation (Imagen 4 / DALL-E style)`

    const options: TextGenerationOptions = {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      systemInstruction: systemPrompt,
      thinkingBudget: thinkingLevel === 'high' ? 8192 : 1024,
      maxRetries: 2,
      timeoutMs: 15000
    }
    
    const response = await generateText(userPrompt, options)
    
    let parsedResult: any
    try {
      parsedResult = JSON.parse(response.text)
    } catch {
      parsedResult = { prompt: response.text, confidence: 0.7 }
    }
    
    const result: GeneratedPromptResult = {
      prompt: parsedResult.prompt || response.text,
      reasoning: parsedResult.reasoning,
      suggestedSettings: parsedResult.suggestedSettings,
      confidence: parsedResult.confidence ?? 0.85
    }
    
    setCache(cacheKey, result)
    return result
    
  } catch (error) {
    console.error('[PromptIntelligence] Keyframe enhancement failed:', error)
    
    // Return the original prompt with minimal enhancement
    return {
      prompt: `${basePrompt}. Cinematic quality, professional lighting, 8K resolution.`,
      confidence: 0.5,
      reasoning: 'Minimal enhancement applied (Gemini unavailable)'
    }
  }
}

// =============================================================================
// System & User Prompt Builders
// =============================================================================

function buildSystemPrompt(segmentPurpose: SegmentPurpose): string {
  const baseInstructions = `You are an expert cinematographer and visual director creating prompts for AI image generation.
Your prompts should be detailed, visually evocative, and optimized for photorealistic image generation (Imagen 4 / Gemini).

Output JSON with:
- prompt: The complete image generation prompt (string, 150-300 words)
- reasoning: Brief explanation of your creative choices (string)
- suggestedDuration: Recommended duration in seconds (number)
- suggestedSettings: { shotType, cameraMovement, lighting, mood } (object)
- confidence: Your confidence in this prompt (0-1)`

  const purposeGuidance: Record<SegmentPurpose, string> = {
    title: `
SEGMENT TYPE: Title Sequence
Create cinematic title card prompts that:
- Feature bold, elegant typography centered in frame
- Use atmospheric, bokeh-rich backgrounds that hint at the film's genre
- Establish mood through lighting (warm/golden for drama, cool/blue for thriller, etc.)
- Include subtle motion suggestions (lens flare, particle effects, slow drift)
- Match the film's tone and genre visually`,

    establishing: `
SEGMENT TYPE: Establishing Shot
Create wide, environmental prompts that:
- Showcase the location with cinematic scope (aerial/drone perspectives for exteriors)
- Establish time of day through lighting and atmosphere
- Use appropriate weather/mood elements
- Create visual anticipation for the upcoming scene
- Include architectural or natural details that ground the viewer`,

    extend: `
SEGMENT TYPE: Extend/Continue
Create continuation prompts that:
- Maintain visual continuity with the previous shot
- Match camera angle, lighting, and color palette
- Show natural action progression
- Preserve character positioning and movement direction
- Ensure seamless transition feeling`,

    'match-cut': `
SEGMENT TYPE: Match Cut Bridge
Create transition prompts that:
- Feature a clear visual element that can transform between scenes
- Emphasize geometric shapes, movements, or colors that bridge contexts
- Create visual poetry through form matching
- Maintain momentum and visual interest
- Suggest transformation or passage of time`,

    broll: `
SEGMENT TYPE: B-Roll / Visual Breather
Create atmospheric detail prompts that:
- Focus on evocative environmental details
- Use shallow depth of field and intimate framing
- Create contemplative, ambient mood
- Provide visual breathing room between action
- Enhance emotional resonance through texture`,

    outro: `
SEGMENT TYPE: Outro / Credits
Create ending sequence prompts that:
- Feature elegant, professional typography space
- Use sophisticated backgrounds (gradients, particles, subtle motion)
- Create sense of closure and completion
- Match the film's overall aesthetic
- Leave lasting visual impression`,

    standard: `
SEGMENT TYPE: Standard Scene
Create cinematic prompts that:
- Capture the action with appropriate framing
- Use lighting that matches the scene's mood
- Include character and environmental details
- Maintain visual consistency with the film's style
- Optimize for AI image generation clarity`
  }

  return `${baseInstructions}\n${purposeGuidance[segmentPurpose]}`
}

function buildUserPrompt(
  segmentPurpose: SegmentPurpose,
  filmContext: FilmContext | undefined,
  adjacentScenes: AdjacentSceneData,
  sceneDirection: DetailedSceneDirection | null | undefined
): string {
  const parts: string[] = []

  // Film context
  if (filmContext) {
    parts.push(`FILM CONTEXT:
- Title: "${filmContext.title || 'Untitled'}"
- Genre: ${filmContext.genre?.join(', ') || 'Not specified'}
- Tone: ${filmContext.tone || 'Dramatic'}
- Logline: ${filmContext.logline || 'Not provided'}`)
  }

  // Current scene
  const current = adjacentScenes.currentScene
  parts.push(`
CURRENT SCENE:
- Heading: ${current.heading || 'Unknown'}
- Location: ${current.location || extractLocation(current.heading)}
- Time of Day: ${current.timeOfDay || extractTimeOfDay(current.heading)}
- Action Summary: ${current.action?.slice(0, 300) || 'Not specified'}
${current.narration ? `- Narration: ${current.narration.slice(0, 200)}` : ''}
${current.characters?.length ? `- Characters: ${current.characters.join(', ')}` : ''}`)

  // Previous scene (for context)
  if (adjacentScenes.previousScene) {
    const prev = adjacentScenes.previousScene
    parts.push(`
PREVIOUS SCENE (for transition context):
- Heading: ${prev.heading || 'Unknown'}
- Final action: ${prev.action?.slice(-150) || 'Not specified'}`)
  }

  // Next scene (for match-cuts and bridges)
  if (adjacentScenes.nextScene && (segmentPurpose === 'match-cut' || segmentPurpose === 'outro')) {
    const next = adjacentScenes.nextScene
    parts.push(`
NEXT SCENE (for transition planning):
- Heading: ${next.heading || 'Unknown'}
- Opening: ${next.action?.slice(0, 150) || 'Not specified'}`)
  }

  // Scene direction
  if (sceneDirection) {
    parts.push(`
DIRECTOR'S VISION:
- Camera Approach: ${sceneDirection.camera?.approach || 'Standard coverage'}
- Suggested Shots: ${sceneDirection.camera?.shots?.slice(0, 3).join(', ') || 'Medium shots'}
- Lighting Mood: ${sceneDirection.lighting?.overallMood || 'Natural'}
- Color Temperature: ${sceneDirection.lighting?.colorTemperature || 'Neutral'}
- Emotional Arc: ${sceneDirection.emotion?.arc?.join(' → ') || 'Neutral'}`)
  }

  parts.push(`
Generate a detailed ${segmentPurpose} prompt for this scene that captures the visual essence and maintains production quality.`)

  return parts.join('\n')
}

// =============================================================================
// Utility Functions
// =============================================================================

function extractLocation(heading?: string): string {
  if (!heading) return 'Unknown location'
  
  // Parse "INT./EXT. LOCATION - TIME" format
  const match = heading.match(/(?:INT\.|EXT\.)\s*(.+?)(?:\s*-|$)/i)
  return match?.[1]?.trim() || heading
}

function extractTimeOfDay(heading?: string): string {
  if (!heading) return 'Day'
  
  const lower = heading.toLowerCase()
  if (lower.includes('night')) return 'Night'
  if (lower.includes('dawn') || lower.includes('sunrise')) return 'Dawn'
  if (lower.includes('dusk') || lower.includes('sunset')) return 'Dusk'
  if (lower.includes('morning')) return 'Morning'
  if (lower.includes('afternoon')) return 'Afternoon'
  if (lower.includes('evening')) return 'Evening'
  return 'Day'
}

/**
 * Clear the prompt cache (useful for testing or forcing refresh)
 */
export function clearPromptCache(): void {
  promptCache.clear()
  console.log('[PromptIntelligence] Cache cleared')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: promptCache.size,
    entries: Array.from(promptCache.keys())
  }
}
