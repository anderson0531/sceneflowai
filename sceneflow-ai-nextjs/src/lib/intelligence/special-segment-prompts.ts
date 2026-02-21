/**
 * Special Segment Prompt Intelligence Service
 * 
 * Generates cinematic, professional video generation prompts for special segments:
 * - Title Sequences
 * - Match Cut Bridges
 * - Establishing Shots
 * - B-Roll (The Lull)
 * - Outro/Credits
 * 
 * Uses Gemini 2.5 to analyze film context and generate rich, genre-appropriate prompts.
 * Includes automatic sanitization to avoid Vertex AI content policy rejections.
 */

import { generateText, TextGenerationOptions } from '@/lib/vertexai/gemini'
import { autoSanitizePrompt } from '@/utils/promptModerator'

// =============================================================================
// Types
// =============================================================================

export type SpecialSegmentType = 'title' | 'match-cut' | 'establishing' | 'broll' | 'outro'

export interface FilmContext {
  title?: string
  logline?: string
  genre?: string[]
  tone?: string
  visualStyle?: string
  targetAudience?: string
}

export interface SceneContext {
  heading?: string
  action?: string
  narration?: string
}

export interface AdjacentSceneData {
  previousScene?: SceneContext
  currentScene: SceneContext
  nextScene?: SceneContext
}

export interface CreditsInfo {
  title?: string
  director?: string
  writer?: string
  producer?: string
  customText?: string
}

export interface SpecialSegmentPromptRequest {
  segmentType: SpecialSegmentType
  filmContext?: FilmContext
  credits?: CreditsInfo
  adjacentScenes?: AdjacentSceneData
  typeConfig?: {
    name: string
    aiHint: string
    styleKeywords: string[]
  }
}

export interface SpecialSegmentPromptResult {
  prompt: string
  reasoning?: string
  suggestedDuration?: number
  visualElements?: string[]
  confidence: number
}

// =============================================================================
// Fallback Templates (Used when Gemini unavailable)
// =============================================================================

const FALLBACK_TEMPLATES: Record<SpecialSegmentType, (ctx: FilmContext, scenes?: AdjacentSceneData) => string> = {
  title: (film, scenes) => {
    const genreStyle = getGenreVisualStyle(film.genre || ['drama'])
    return `A cinematic, high-concept title sequence for a ${film.genre?.join('/')} ${film.tone || 'dramatic'} film. ${genreStyle.background} In the center, ${genreStyle.textTreatment}. The camera moves in a ${genreStyle.cameraMove}. Overlay bold, minimalist white text in a modern sans-serif font that reads '${film.title || 'UNTITLED'}'. ${genreStyle.atmosphere} 4K, photorealistic, cinematic lighting.`
  },
  
  'match-cut': (film, scenes) => {
    const prevAction = scenes?.previousScene?.action?.toLowerCase() || ''
    const nextAction = scenes?.nextScene?.action?.toLowerCase() || scenes?.currentScene?.action?.toLowerCase() || ''
    const motif = findVisualMotif(prevAction, nextAction)
    return `A seamless match cut transition. ${motif.description}. The camera ${motif.movement}. Visual elements align perfectly across the cut - same position, rotation, and scale. Photorealistic, cinematic quality. ${film.tone || 'Dramatic'} mood. 4K resolution.`
  },
  
  establishing: (film, scenes) => {
    const heading = scenes?.currentScene?.heading || ''
    const location = extractLocation(heading)
    const timeOfDay = extractTimeOfDay(heading)
    const isExterior = heading.toLowerCase().includes('ext.')
    
    if (isExterior) {
      return `A sweeping aerial establishing shot of ${location}. ${timeOfDay.lighting}. Drone perspective slowly pushing in, revealing the full environment. ${timeOfDay.atmosphere}. Cinematic wide angle lens, deep focus. ${film.genre?.includes('thriller') || film.genre?.includes('horror') ? 'Ominous undertone.' : 'Epic scale.'} 4K, photorealistic.`
    }
    return `A wide interior establishing shot revealing ${location}. ${timeOfDay.lighting}. Slow camera movement through the space. Atmospheric lighting with practical sources. Professional cinematography, shallow depth-of-field on key elements. 4K, photorealistic.`
  },
  
  broll: (film, scenes) => {
    const context = scenes?.currentScene?.action?.toLowerCase() || scenes?.currentScene?.heading?.toLowerCase() || ''
    const detail = suggestBRollDetail(context)
    return `Atmospheric B-roll detail shot. ${detail}. Slow motion at 120fps, ultra-shallow depth of field (f/1.4). Soft ambient lighting with natural highlights. Contemplative, meditative mood. ${film.tone || 'Cinematic'} color grading. 4K, photorealistic.`
  },
  
  outro: (film, scenes) => {
    const genreStyle = getGenreVisualStyle(film.genre || ['drama'])
    return `Professional outro sequence. ${genreStyle.outroBackground}. Slow fade with subtle light particle effects. The composition slowly drifts upward. Production credits aesthetic with elegant typography. ${film.tone || 'Refined'}, sophisticated atmosphere. 4K, photorealistic, cinematic.`
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

interface GenreVisualStyle {
  background: string
  textTreatment: string
  cameraMove: string
  atmosphere: string
  outroBackground: string
}

function getGenreVisualStyle(genres: string[]): GenreVisualStyle {
  const genreKey = genres[0]?.toLowerCase() || 'drama'
  
  const styles: Record<string, GenreVisualStyle> = {
    horror: {
      background: 'The background is a heavily distorted, desaturated environment with flickering shadows and deep blacks',
      textTreatment: 'the title emerges from darkness with subtle blood-red chromatic aberration',
      cameraMove: 'slow, unsettling forward dolly with slight shake',
      atmosphere: 'The atmosphere is claustrophobic, sterile, and carries a sense of dread',
      outroBackground: 'Deep black background with barely visible fog tendrils'
    },
    thriller: {
      background: 'The background features high-contrast urban nightscape with sharp geometric shadows',
      textTreatment: 'sharp metallic text with subtle reflections and cold blue highlights',
      cameraMove: 'smooth tracking shot with precision',
      atmosphere: 'The atmosphere is tense, sleek, and calculated',
      outroBackground: 'Dark slate background with subtle grid patterns'
    },
    scifi: {
      background: 'The background shows a vast technological landscape with holographic interfaces and particle effects',
      textTreatment: 'holographic text with scanline effects and digital artifacts',
      cameraMove: 'slow push through digital space with parallax layers',
      atmosphere: 'The atmosphere is futuristic, vast, and awe-inspiring',
      outroBackground: 'Deep space black with distant stars and nebula traces'
    },
    romance: {
      background: 'The background is soft, warm, with golden hour bokeh lights and gentle lens flare',
      textTreatment: 'elegant script-inspired text with soft glow',
      cameraMove: 'gentle, dreamy drift with soft focus edges',
      atmosphere: 'The atmosphere is intimate, warm, and emotionally inviting',
      outroBackground: 'Warm cream gradient with soft light leaks'
    },
    comedy: {
      background: 'The background is bright, colorful, with playful lighting and vibrant tones',
      textTreatment: 'bold, playful typography with subtle bounce animation feel',
      cameraMove: 'dynamic, energetic movement with slight zoom',
      atmosphere: 'The atmosphere is light, fun, and inviting',
      outroBackground: 'Cheerful gradient with subtle confetti-like particles'
    },
    action: {
      background: 'The background features explosive energy - sparks, debris, and dramatic backlighting',
      textTreatment: 'bold, impactful metallic text with motion blur trails',
      cameraMove: 'dynamic push with slight shake and speed ramping feel',
      atmosphere: 'The atmosphere is explosive, adrenaline-fueled, and intense',
      outroBackground: 'Dark charcoal with ember particles floating'
    },
    drama: {
      background: 'The background is cinematically lit with sophisticated shadows and depth',
      textTreatment: 'refined serif typography with subtle gold accents',
      cameraMove: 'elegant, measured tracking shot',
      atmosphere: 'The atmosphere is sophisticated, emotionally resonant, and prestige',
      outroBackground: 'Rich dark gradient with subtle film grain'
    },
    documentary: {
      background: 'The background shows authentic texture - real world details with natural lighting',
      textTreatment: 'clean, journalistic sans-serif text with understated elegance',
      cameraMove: 'steady, observational movement',
      atmosphere: 'The atmosphere is authentic, grounded, and informative',
      outroBackground: 'Clean black with minimal white text elements'
    }
  }
  
  return styles[genreKey] || styles.drama
}

function findVisualMotif(prevAction: string, nextAction: string): { description: string; movement: string } {
  // Look for matching visual elements
  const motifs = {
    circular: { 
      keywords: ['wheel', 'clock', 'sun', 'moon', 'eye', 'ring', 'circle', 'ball', 'spin', 'rotate'],
      description: 'A circular object transforms across the cut - the spinning motion carries through',
      movement: 'follows the rotational movement seamlessly'
    },
    linear: {
      keywords: ['road', 'path', 'river', 'corridor', 'train', 'car', 'line', 'walk', 'drive'],
      description: 'A linear movement carries through - the forward motion connects both scenes',
      movement: 'tracks along the directional flow'
    },
    vertical: {
      keywords: ['building', 'tree', 'tower', 'fall', 'rise', 'elevator', 'climb', 'drop'],
      description: 'Vertical movement bridges the cut - ascending or descending motion unifies',
      movement: 'follows the vertical trajectory'
    },
    human: {
      keywords: ['face', 'hand', 'silhouette', 'figure', 'profile', 'eyes'],
      description: 'A human element creates the bridge - gesture or gaze connects across',
      movement: 'holds on the human focal point'
    },
    light: {
      keywords: ['light', 'dark', 'shadow', 'lamp', 'sun', 'glow', 'flash'],
      description: 'Light and shadow create the transition - illumination shifts across the cut',
      movement: 'follows the light source'
    }
  }
  
  for (const [, motif] of Object.entries(motifs)) {
    for (const kw of motif.keywords) {
      if (prevAction.includes(kw) || nextAction.includes(kw)) {
        return motif
      }
    }
  }
  
  // Default creative match cut
  return {
    description: 'A creative shape match bridges the scenes - similar forms align across the cut',
    movement: 'holds steady as the visual elements transform'
  }
}

function extractLocation(heading: string): string {
  // Remove INT./EXT. prefix and extract location
  const cleanHeading = heading.replace(/^(INT\.|EXT\.)\s*/i, '').split('-')[0].trim()
  return cleanHeading || 'the location'
}

function extractTimeOfDay(heading: string): { lighting: string; atmosphere: string } {
  const lower = heading.toLowerCase()
  
  if (lower.includes('night')) {
    return {
      lighting: 'Nighttime lighting with practical sources - streetlamps, windows, neon',
      atmosphere: 'The atmosphere is mysterious and moody'
    }
  }
  if (lower.includes('dawn') || lower.includes('sunrise')) {
    return {
      lighting: 'Golden dawn light breaking through - warm, hopeful tones',
      atmosphere: 'The atmosphere is fresh and full of possibility'
    }
  }
  if (lower.includes('dusk') || lower.includes('sunset')) {
    return {
      lighting: 'Magic hour lighting - rich oranges, purples, and deep shadows',
      atmosphere: 'The atmosphere is dramatic and contemplative'
    }
  }
  if (lower.includes('morning')) {
    return {
      lighting: 'Soft morning light with clean, crisp shadows',
      atmosphere: 'The atmosphere is calm and inviting'
    }
  }
  if (lower.includes('afternoon')) {
    return {
      lighting: 'Bright afternoon sun with defined shadows',
      atmosphere: 'The atmosphere is vibrant and active'
    }
  }
  
  // Default to day
  return {
    lighting: 'Natural daylight with soft shadows',
    atmosphere: 'The atmosphere is clear and cinematic'
  }
}

function suggestBRollDetail(context: string): string {
  const suggestions: { keywords: string[]; detail: string }[] = [
    { keywords: ['rain', 'storm', 'weather', 'wet'], detail: 'Close-up of rain droplets sliding down glass, each drop catching light like a tiny lens' },
    { keywords: ['office', 'work', 'desk', 'computer'], detail: 'Steam rising from a coffee cup, wisps curling in the morning light' },
    { keywords: ['night', 'city', 'urban', 'street'], detail: 'Neon signs reflecting on rain-wet pavement, colors bleeding into abstract patterns' },
    { keywords: ['nature', 'forest', 'outdoor', 'tree'], detail: 'Sunlight filtering through leaves, dancing shadows on the forest floor' },
    { keywords: ['home', 'house', 'room', 'domestic'], detail: 'Dust particles floating in a sunbeam through curtains, time suspended' },
    { keywords: ['restaurant', 'food', 'eat', 'dinner'], detail: 'Candlelight flickering, casting warm shadows on wine glasses' },
    { keywords: ['car', 'drive', 'road', 'travel'], detail: 'Dashboard reflections, passing lights creating streaks across the windshield' },
    { keywords: ['music', 'instrument', 'play'], detail: 'Fingers on piano keys, the intimate detail of musical creation' },
    { keywords: ['tech', 'digital', 'screen', 'computer'], detail: 'Screen reflections in eyeglasses, the glow of technology' },
    { keywords: ['water', 'ocean', 'beach', 'sea'], detail: 'Waves lapping at shore, foam patterns dissolving into sand' }
  ]
  
  for (const { keywords, detail } of suggestions) {
    for (const kw of keywords) {
      if (context.includes(kw)) {
        return detail
      }
    }
  }
  
  // Default atmospheric detail
  return 'A contemplative detail shot - texture, light, and shadow create visual poetry'
}

// =============================================================================
// Main API Function
// =============================================================================

/**
 * Generate an intelligent prompt for a special segment type using Gemini 2.5
 * Creates cinematic, genre-appropriate prompts optimized for video generation.
 */
export async function generateSpecialSegmentPrompt(
  request: SpecialSegmentPromptRequest
): Promise<SpecialSegmentPromptResult> {
  const { segmentType, filmContext = {}, credits, adjacentScenes, typeConfig } = request
  
  try {
    const systemPrompt = buildSpecialSegmentSystemPrompt(segmentType)
    const userPrompt = buildSpecialSegmentUserPrompt(segmentType, filmContext, credits, adjacentScenes, typeConfig)
    
    console.log('[SpecialSegmentPrompts] Generating prompt with Gemini 2.5 for:', segmentType)
    
    const options: TextGenerationOptions = {
      model: 'gemini-2.5-flash',
      temperature: 0.8, // Slightly higher for creative prompts
      maxOutputTokens: 4096, // Increased significantly to prevent truncation of cinematic prompts + JSON structure
      responseMimeType: 'application/json',
      systemInstruction: systemPrompt,
      thinkingBudget: 2048, // Medium thinking for creative work
      maxRetries: 2,
      timeoutMs: 45000 // Increased timeout for longer responses
    }
    
    const response = await generateText(userPrompt, options)
    
    // Parse JSON response with truncation recovery
    let parsedResult: any
    try {
      parsedResult = JSON.parse(response.text)
    } catch {
      // If JSON parse fails, check if it's a truncation issue
      console.warn('[SpecialSegmentPrompts] JSON parse failed, attempting truncation recovery')
      
      // Try to extract prompt from truncated JSON
      const promptMatch = response.text.match(/"prompt"\s*:\s*"([^"]+)/)
      if (promptMatch) {
        // Complete the truncated prompt with a proper ending
        let recoveredPrompt = promptMatch[1]
        // If it doesn't end properly, add a clean ending
        if (!recoveredPrompt.match(/\.\s*$/)) {
          recoveredPrompt = recoveredPrompt.replace(/[^.]*$/, '') + ' 4K, photorealistic, cinematic lighting.'
        }
        parsedResult = { prompt: recoveredPrompt, confidence: 0.6, reasoning: 'Recovered from truncated response' }
        console.log('[SpecialSegmentPrompts] Recovered truncated prompt')
      } else {
        // Fall back to using text directly
        parsedResult = { prompt: response.text, confidence: 0.5 }
      }
    }
    
    // Validate prompt completeness - check if it was truncated
    const promptText = parsedResult.prompt || response.text
    const isTruncated = !promptText.match(/[.!?]\s*$/) && !promptText.includes('4K') && !promptText.includes('cinematic')
    
    if (isTruncated) {
      console.warn('[SpecialSegmentPrompts] Detected truncated prompt, adding completion')
      parsedResult.prompt = promptText.replace(/[^.]*$/, '') + ' 4K, photorealistic, cinematic lighting.'
    }
    
    // Auto-sanitize the generated prompt to avoid Vertex AI content policy rejections
    // This converts emotional trigger words to technical descriptors seamlessly
    const originalPrompt = parsedResult.prompt || response.text
    const { sanitizedPrompt, wasModified, changes } = autoSanitizePrompt(originalPrompt, {
      logChanges: true, // Log for debugging
      minSeverity: 'low' // Sanitize even low-severity triggers
    })
    
    if (wasModified) {
      console.log('[SpecialSegmentPrompts] Auto-sanitized prompt for Vertex AI compatibility:', changes.length, 'changes')
    }
    
    return {
      prompt: sanitizedPrompt,
      reasoning: parsedResult.reasoning,
      suggestedDuration: parsedResult.suggestedDuration,
      visualElements: parsedResult.visualElements,
      confidence: parsedResult.confidence ?? 0.9
    }
    
  } catch (error) {
    console.error('[SpecialSegmentPrompts] Gemini call failed, using fallback:', error)
    
    // Return fallback template (also sanitized for safety)
    const rawFallbackPrompt = FALLBACK_TEMPLATES[segmentType](filmContext, adjacentScenes)
    const { sanitizedPrompt } = autoSanitizePrompt(rawFallbackPrompt, { logChanges: true })
    
    return {
      prompt: sanitizedPrompt,
      confidence: 0.6,
      reasoning: 'Generated from fallback template (Gemini unavailable)',
      suggestedDuration: getDefaultDuration(segmentType)
    }
  }
}

// =============================================================================
// Prompt Builders
// =============================================================================

function buildSpecialSegmentSystemPrompt(segmentType: SpecialSegmentType): string {
  const typeInstructions: Record<SpecialSegmentType, string> = {
    title: `You are creating a TITLE SEQUENCE prompt - the opening visual that establishes tone, genre, and brand.
Think of iconic title sequences: Se7en's unsettling darkness, Catch Me If You Can's playful animation, Game of Thrones' epic scale.
The title text should be integrated naturally into the visual - not just text on background.`,
    
    'match-cut': `You are creating a MATCH CUT BRIDGE prompt - a creative transition that finds visual similarity between scenes.
Think of famous match cuts: 2001's bone to spacecraft, Lawrence of Arabia's match to sunrise.
The visual elements must align geometrically and thematically across the cut.`,
    
    establishing: `You are creating an ESTABLISHING SHOT prompt - the wide shot that sets location, time, and mood.
Think of iconic establishing shots: Blade Runner's cityscape, The Shining's mountain drive.
Show the environment in full scope to ground the audience in the world.`,
    
    broll: `You are creating a B-ROLL prompt - an atmospheric detail shot that provides visual breathing room.
Think of Terrence Malick's poetic inserts or Wong Kar-wai's textured details.
Focus on sensory details that add emotional texture without advancing plot.`,
    
    outro: `You are creating an OUTRO/CREDITS SEQUENCE prompt - the closing visual that provides resolution.
Think of elegant credit sequences that honor the story's conclusion.
The mood should match the film's ending - triumphant, melancholic, hopeful, or ambiguous.`
  }
  
  // Content safety guidelines to avoid Vertex AI rejections
  const contentSafetyGuidelines = `
CRITICAL - CONTENT SAFETY GUIDELINES:
Your prompts must be safe for AI video generation APIs (Vertex AI, Veo). AVOID:
- Medical/anatomical terms: "tissue", "organ", "neural tissue", "biological matter", "veins", "arteries"
- Body horror descriptors: "sickly", "diseased", "decomposing", "rotting", "infected", "mutated"
- Distressing terms: "claustrophobic", "suffocating", "agonizing", "tormented"
- Violence descriptors: "blood", "gore", "violent", "brutal", "graphic"
- Sexual content or suggestive terms

INSTEAD USE:
- For sci-fi/tech: "circuit patterns", "digital networks", "glowing pathways", "data streams"
- For atmosphere: "moody", "atmospheric", "ethereal", "dramatic", "intense", "mysterious"
- For dark tones: "shadowy", "noir", "dramatic contrast", "deep shadows", "low-key lighting"
- For organic aesthetics: "flowing patterns", "natural textures", "organic shapes", "botanical elements"

The prompt should be evocative and cinematic while remaining safe for AI generation.`
  
  return `You are an expert cinematographer and title designer creating prompts for AI video generation.
Your prompts should be highly detailed, visually evocative, and optimized for Veo/Sora-style video generation.

${typeInstructions[segmentType]}

${contentSafetyGuidelines}

Output JSON with:
- prompt: The complete video generation prompt (string, 150-300 words). Include: composition, camera movement, lighting, color palette, atmosphere, specific visual elements. End with "4K, photorealistic, cinematic lighting."
- reasoning: Brief explanation of your creative choices (string, 1-2 sentences)
- suggestedDuration: Recommended duration in seconds (number, typically 3-6)
- visualElements: Key visual components for this segment (array of strings)
- confidence: Your confidence in this prompt being effective (number, 0-1)`
}

function buildSpecialSegmentUserPrompt(
  segmentType: SpecialSegmentType,
  filmContext: FilmContext,
  credits?: CreditsInfo,
  adjacentScenes?: AdjacentSceneData,
  typeConfig?: { name: string; aiHint: string; styleKeywords: string[] }
): string {
  const parts: string[] = []
  
  parts.push(`Generate a ${segmentType.toUpperCase()} prompt for this film:`)
  parts.push('')
  
  // Film context
  parts.push('FILM CONTEXT:')
  parts.push(`- Title: "${credits?.title || filmContext.title || 'Untitled'}"`)
  if (filmContext.logline) parts.push(`- Logline: ${filmContext.logline}`)
  parts.push(`- Genre: ${filmContext.genre?.join(', ') || 'Drama'}`)
  parts.push(`- Tone: ${filmContext.tone || 'Cinematic'}`)
  if (filmContext.visualStyle) parts.push(`- Visual Style: ${filmContext.visualStyle}`)
  if (filmContext.targetAudience) parts.push(`- Target Audience: ${filmContext.targetAudience}`)
  parts.push('')
  
  // Credits section - for title and outro sequences
  // IMPORTANT: Limit text layers to avoid model struggles and content policy flags
  if (credits && (segmentType === 'title' || segmentType === 'outro')) {
    parts.push('CREDITS/TEXT TO DISPLAY:')
    
    // Build a simplified credits line to avoid multi-layer text issues
    const creditParts: string[] = []
    if (credits.title) creditParts.push(`"${credits.title}"`)
    if (credits.director) creditParts.push(`Directed by ${credits.director}`)
    if (credits.producer) creditParts.push(`Produced by ${credits.producer}`)
    
    parts.push(`- Primary credits line: ${creditParts.join(' • ')}`)
    if (credits.customText) parts.push(`- Tagline: "${credits.customText}"`)
    parts.push('')
    
    parts.push('TEXT DISPLAY REQUIREMENTS (SIMPLIFIED FOR RELIABLE GENERATION):')
    parts.push('1. Display the film title as the PRIMARY text element')
    parts.push('2. Combine director and producer credits into a SINGLE credits line below the title')
    parts.push('   Format: "Directed by [Name] • Produced by [Name]" on ONE line')
    if (credits.customText) {
      parts.push(`3. Show tagline "${credits.customText}" as a separate, smaller text element`)
    }
    parts.push('')
    parts.push('CRITICAL: Keep text layers to a MAXIMUM of 2-3 distinct elements.')
    parts.push('Avoid complex multi-plane text compositions that may cause generation failures.')
    parts.push('Use elegant typography with clear hierarchy: Title (largest) → Credits (medium) → Tagline (smallest)')
    parts.push('')
  }
  
  // Scene context if available
  if (adjacentScenes) {
    parts.push('SCENE CONTEXT:')
    if (adjacentScenes.previousScene) {
      parts.push(`- Previous Scene: ${adjacentScenes.previousScene.heading || 'N/A'}`)
      if (adjacentScenes.previousScene.action) {
        parts.push(`  Action: ${adjacentScenes.previousScene.action.slice(0, 150)}...`)
      }
    }
    parts.push(`- Current Scene: ${adjacentScenes.currentScene.heading || 'N/A'}`)
    if (adjacentScenes.currentScene.action) {
      parts.push(`  Action: ${adjacentScenes.currentScene.action.slice(0, 150)}...`)
    }
    if (adjacentScenes.currentScene.narration) {
      parts.push(`  Narration: ${adjacentScenes.currentScene.narration.slice(0, 100)}...`)
    }
    if (adjacentScenes.nextScene) {
      parts.push(`- Next Scene: ${adjacentScenes.nextScene.heading || 'N/A'}`)
    }
    parts.push('')
  }
  
  // Type-specific hint
  if (typeConfig?.aiHint) {
    parts.push(`CREATIVE DIRECTION: ${typeConfig.aiHint}`)
    parts.push('')
  }
  
  // Type-specific instructions
  const typeInstructions: Record<SpecialSegmentType, string> = {
    title: `Create a title sequence that:
1. Integrates the film title "${filmContext.title || 'TITLE'}" as text overlay
2. Matches the ${filmContext.genre?.join('/')} genre visual language
3. Sets the ${filmContext.tone || 'dramatic'} tone immediately
4. Uses appropriate typography style
5. Includes subtle camera movement`,
    
    'match-cut': `Create a match cut that:
1. Finds visual connection between the scenes described
2. Uses shape, movement, or color to bridge
3. Maintains geometric alignment across cut
4. Creates a satisfying "aha" moment`,
    
    establishing: `Create an establishing shot that:
1. Shows the full environment/location
2. Establishes time of day and atmosphere
3. Uses appropriate scale (aerial for exteriors, wide for interiors)
4. Sets the mood for the upcoming scene`,
    
    broll: `Create a B-roll shot that:
1. Focuses on atmospheric details relevant to the scene
2. Uses shallow depth of field and slow motion feel
3. Provides visual breathing room
4. Adds emotional texture`,
    
    outro: `Create an outro sequence that:
1. Provides visual closure matching the film's ending
2. Has credits-appropriate composition
3. Uses subtle movement (fade, drift, or scroll feel)
4. Maintains the film's established visual language`
  }
  
  parts.push(typeInstructions[segmentType])
  
  return parts.join('\n')
}

function getDefaultDuration(segmentType: SpecialSegmentType): number {
  const durations: Record<SpecialSegmentType, number> = {
    title: 4,
    'match-cut': 3,
    establishing: 5,
    broll: 4,
    outro: 6
  }
  return durations[segmentType]
}
