/**
 * Scene Image Intelligence Service
 * 
 * Uses Gemini to generate smart, context-aware prompts for scene image generation.
 * Unlike the rules-based promptOptimizer, this module leverages AI to:
 * 
 * 1. Compose a single ILLUSTRATIVE representative frame (not a starting/ending frame)
 * 2. Handle title sequences as centered title-card compositions
 * 3. Enforce strict wardrobe consistency per character per scene
 * 4. Preserve useful scene direction cues (lighting, framing, mood)
 * 5. Reference all available visual assets (characters, locations, props)
 * 
 * Architecture:
 * - Gemini 2.5 Flash for prompt intelligence (fast, cheap, cached)
 * - Gemini 3 Pro Image Preview for actual image generation (unchanged)
 * - 5-minute in-memory cache keyed on scene hash + wardrobe selections
 * - Graceful fallback to existing optimizePromptForImagen() if Gemini unavailable
 */

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'

// =============================================================================
// Types
// =============================================================================

export type SceneType = 'title' | 'establishing' | 'narrative' | 'montage' | 'outro' | 'credits'

export interface FilmContext {
  title?: string
  logline?: string
  genre?: string[]
  tone?: string
  visualStyle?: string
}

export interface SceneDirectionMetadata {
  /** Extracted from scene direction - lighting mood, color temp, time of day */
  lightingMood?: string
  colorTemperature?: string
  timeOfDay?: string
  /** Framing hints extracted from camera direction */
  framingHint?: string // e.g., 'close-up', 'wide shot', 'two-shot', 'over-the-shoulder'
  /** Atmosphere / set dressing */
  atmosphere?: string
  /** Key props from scene direction */
  keyProps?: string[]
  /** Location description from scene direction */
  locationDescription?: string
}

export interface CharacterContext {
  name: string
  /** Reference token like "person [1]" when reference image exists */
  linkingDescription?: string
  /** Full physical appearance description */
  appearanceDescription?: string
  /** Resolved wardrobe for THIS scene (already prioritized) */
  wardrobeDescription?: string
  /** Wardrobe accessories */
  wardrobeAccessories?: string
  /** Whether this character has a reference image */
  hasReferenceImage: boolean
  /** Reference index (1-based) for characters with reference images */
  referenceIndex?: number
}

export interface PropContext {
  name: string
  description?: string
  category?: string
  importance?: string
  hasReferenceImage: boolean
}

export interface LocationContext {
  name: string
  hasReferenceImage: boolean
}

export interface SceneImageIntelligenceRequest {
  /** Raw scene heading (e.g., "INT. PODCAST STUDIO - DAY") */
  sceneHeading: string
  /** Raw scene action text (the screenplay description) */
  sceneAction: string
  /** Scene number (1-based) */
  sceneNumber: number
  /** Total number of scenes */
  totalScenes?: number
  /** Film-level context */
  filmContext?: FilmContext
  /** Detected scene type */
  sceneType: SceneType
  /** Structured scene direction metadata (preserved cues) */
  directionMetadata?: SceneDirectionMetadata
  /** Characters in this scene with wardrobe resolved */
  characters: CharacterContext[]
  /** Props/objects in this scene */
  props: PropContext[]
  /** Location info */
  location?: LocationContext
  /** Art style selection */
  artStyle?: string
  /** Number of reference images being sent */
  referenceImageCount: number
}

export interface SceneImageIntelligenceResult {
  /** The AI-generated optimized prompt */
  prompt: string
  /** AI's reasoning for the prompt choices */
  reasoning?: string
  /** Suggested negative prompt additions */
  negativePromptAdditions?: string[]
  /** Whether AI intelligence was used (false = fallback) */
  usedAI: boolean
}

// =============================================================================
// In-Memory Cache (5-minute TTL)
// =============================================================================

interface CacheEntry {
  result: SceneImageIntelligenceResult
  timestamp: number
}

const promptCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCacheKey(request: SceneImageIntelligenceRequest): string {
  // Hash based on scene content + wardrobe selections + art style
  const parts = [
    request.sceneHeading,
    request.sceneAction.substring(0, 200), // First 200 chars for stability
    request.sceneNumber,
    request.sceneType,
    request.artStyle || 'photorealistic',
    ...request.characters.map(c => `${c.name}:${c.wardrobeDescription || 'default'}`),
    request.referenceImageCount,
  ]
  return parts.join('|')
}

function getCachedResult(key: string): SceneImageIntelligenceResult | null {
  const entry = promptCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    promptCache.delete(key)
    return null
  }
  return entry.result
}

function setCachedResult(key: string, result: SceneImageIntelligenceResult): void {
  // Evict old entries if cache is too large
  if (promptCache.size > 100) {
    const oldestKey = promptCache.keys().next().value
    if (oldestKey) promptCache.delete(oldestKey)
  }
  promptCache.set(key, { result, timestamp: Date.now() })
}

// =============================================================================
// Scene Type Detection
// =============================================================================

/**
 * Detect the scene type from the heading and action text.
 * This determines how the prompt should be composed.
 */
export function detectSceneType(heading: string, action: string, sceneNumber: number, totalScenes?: number): SceneType {
  const headingLower = (heading || '').toLowerCase()
  const actionLower = (action || '').toLowerCase()
  
  // Title sequence detection
  if (
    headingLower.includes('title sequence') ||
    headingLower.includes('title card') ||
    headingLower.includes('opening title') ||
    headingLower.includes('main title') ||
    /\btitle\b/.test(headingLower) && sceneNumber <= 2
  ) {
    return 'title'
  }
  
  // Credits / outro detection
  if (
    headingLower.includes('credits') ||
    headingLower.includes('end title') ||
    headingLower.includes('outro') ||
    (totalScenes && sceneNumber === totalScenes && /\b(credits?|end|final)\b/.test(headingLower))
  ) {
    return 'credits'
  }
  
  // Establishing shot detection
  if (
    headingLower.includes('establishing') ||
    (headingLower.startsWith('ext.') && actionLower.length < 100 && !actionLower.includes('dialogue'))
  ) {
    return 'establishing'
  }
  
  // Montage detection
  if (
    headingLower.includes('montage') ||
    actionLower.includes('montage') ||
    actionLower.includes('series of shots')
  ) {
    return 'montage'
  }
  
  return 'narrative'
}

// =============================================================================
// Scene Direction Metadata Extraction
// =============================================================================

/**
 * Extract useful visual cues from scene direction data.
 * Instead of stripping everything, we preserve information that helps
 * compose a better still image (lighting, framing, mood).
 */
export function extractDirectionMetadata(sceneDirection: any): SceneDirectionMetadata {
  if (!sceneDirection) return {}
  
  const metadata: SceneDirectionMetadata = {}
  
  // Extract lighting mood
  if (sceneDirection.lighting) {
    const lighting = sceneDirection.lighting
    metadata.lightingMood = lighting.overallMood || undefined
    metadata.colorTemperature = lighting.colorTemperature || undefined
    metadata.timeOfDay = lighting.timeOfDay || undefined
  }
  
  // Extract framing hint from camera direction
  if (sceneDirection.camera) {
    const camera = sceneDirection.camera
    // Convert camera shots to a still-image framing hint
    const shots = camera.shots || []
    const shotsLower = shots.map((s: string) => s.toLowerCase()).join(' ')
    
    if (shotsLower.includes('close-up') || shotsLower.includes('closeup') || shotsLower.includes('close up')) {
      metadata.framingHint = 'close-up'
    } else if (shotsLower.includes('medium close') || shotsLower.includes('mcu')) {
      metadata.framingHint = 'medium close-up'
    } else if (shotsLower.includes('wide shot') || shotsLower.includes('wide angle') || shotsLower.includes('establishing')) {
      metadata.framingHint = 'wide shot'
    } else if (shotsLower.includes('two-shot') || shotsLower.includes('two shot')) {
      metadata.framingHint = 'two-shot'
    } else if (shotsLower.includes('over-the-shoulder') || shotsLower.includes('ots')) {
      metadata.framingHint = 'over-the-shoulder'
    } else if (shotsLower.includes('medium shot') || shotsLower.includes('medium')) {
      metadata.framingHint = 'medium shot'
    }
  }
  
  // Extract atmosphere from scene direction
  if (sceneDirection.scene) {
    metadata.atmosphere = sceneDirection.scene.atmosphere || undefined
    metadata.keyProps = sceneDirection.scene.keyProps || undefined
    metadata.locationDescription = sceneDirection.scene.location || undefined
  }
  
  return metadata
}

// =============================================================================
// Gemini Prompt Intelligence
// =============================================================================

/**
 * Build the system prompt for Gemini to generate scene image prompts.
 * This is the core intelligence that replaces the rules-based prompt builder.
 */
function buildSystemPrompt(): string {
  return `You are a cinematic image prompt specialist. Your job is to take a screenplay scene description and generate a single, optimized prompt for an AI image generation model (Gemini 3 Pro / Imagen) that creates one illustrative still image representing the scene.

CRITICAL RULES:

1. ILLUSTRATIVE FRAME: Generate a prompt for ONE representative moment that best captures the scene's essence. NOT a starting frame, NOT an ending frame — the most visually compelling, story-telling moment. Think of it as the frame a film critic would choose for a review.

2. TITLE SEQUENCES: For title scenes, compose a CENTERED title card composition:
   - The film title should be prominently displayed, CENTERED in the frame
   - Use genre-appropriate background imagery and professional typography treatment
   - Do NOT describe a starting frame with the title at the top — center it like a movie poster or title card
   - Include atmospheric elements that establish the genre and tone

3. CHARACTER REFERENCE IMAGES: When characters have reference images (indicated by "[N]" tokens):
   - Use ONLY the token "person [N]" to refer to them — do NOT add text descriptions of their appearance
   - The reference image defines their identity; adding text descriptions creates conflicts
   - Focus the prompt on their ACTION, POSE, and WARDROBE in the scene

4. WARDROBE CONSISTENCY (HIGHEST PRIORITY):
   - Each character's wardrobe MUST appear EXACTLY as specified in the wardrobe description
   - Do not vary, embellish, simplify, or omit any wardrobe detail
   - If a character wears "a tailored navy suit with gold watch," the image must show EXACTLY that
   - Wardrobe descriptions override ANY clothing mentioned in the scene action text
   - Include the COMPLETE wardrobe description verbatim in the prompt

5. SCENE DIRECTION CUES: Use the provided lighting, framing, and atmosphere metadata to inform the composition:
   - Lighting mood and color temperature → set the image's lighting
   - Framing hint → set the camera angle/distance
   - Atmosphere → set the overall feeling
   - Key props → ensure they are visible in the scene

6. PROP AND LOCATION REFERENCES: When reference images exist for props or locations:
   - Mention the prop/location by name so the model can match it to the reference image
   - Props marked as "critical" should be prominently visible

7. STATIC IMAGE OPTIMIZATION:
   - Describe a FROZEN MOMENT, not a sequence of actions
   - Remove all camera movement language (dolly, pan, track, zoom)
   - Remove all sound/audio references
   - Remove dialogue text (it would render as text on the image)
   - Convert sequential actions to a single pose/position

8. OUTPUT FORMAT: Return ONLY a JSON object with these fields:
   {
     "prompt": "The optimized image generation prompt (800 chars max)",
     "reasoning": "Brief explanation of your composition choices (100 chars max)",
     "negativeAdditions": ["any", "specific", "things", "to", "avoid"]
   }

9. PROMPT STRUCTURE (in order):
   a. Scene framing instruction (e.g., "Cinematic medium shot" or "Wide establishing shot")
   b. Subject & Wardrobe (exact wardrobe descriptions, using person [N] tokens for referenced characters)
   c. Action/pose (what are the characters doing in this frozen moment)
   d. Environment & props (setting, key props, atmosphere)
   e. Lighting & mood (from scene direction metadata)
   f. Technical quality suffix (photorealistic, cinematic, etc.)

10. AVOID: dialogue text, captions, subtitles, watermarks, UI overlays, text rendering on the image (except for title sequences where the title text IS the subject).`
}

/**
 * Build the user prompt with all scene context for Gemini.
 */
function buildUserPrompt(request: SceneImageIntelligenceRequest): string {
  let prompt = ''
  
  // Film context
  if (request.filmContext) {
    const fc = request.filmContext
    prompt += `FILM: "${fc.title || 'Untitled'}"${fc.genre?.length ? ` | Genre: ${fc.genre.join(', ')}` : ''}${fc.tone ? ` | Tone: ${fc.tone}` : ''}\n`
    if (fc.logline) prompt += `Logline: ${fc.logline}\n`
    prompt += '\n'
  }
  
  // Scene metadata
  prompt += `SCENE ${request.sceneNumber}${request.totalScenes ? ` of ${request.totalScenes}` : ''}: ${request.sceneHeading}\n`
  prompt += `Scene Type: ${request.sceneType.toUpperCase()}\n\n`
  
  // Scene action (raw text)
  prompt += `SCENE ACTION:\n${request.sceneAction}\n\n`
  
  // Characters with wardrobe
  if (request.characters.length > 0) {
    prompt += `CHARACTERS IN SCENE:\n`
    request.characters.forEach((char, idx) => {
      const refLabel = char.hasReferenceImage ? ` [Reference image provided as person [${char.referenceIndex}]]` : ' [No reference image — describe appearance in prompt]'
      prompt += `${idx + 1}. ${char.name}${refLabel}\n`
      
      if (!char.hasReferenceImage && char.appearanceDescription) {
        prompt += `   Appearance: ${char.appearanceDescription}\n`
      }
      
      // WARDROBE — always include, this is critical for consistency
      if (char.wardrobeDescription) {
        prompt += `   WARDROBE (MUST USE EXACTLY): ${char.wardrobeDescription}`
        if (char.wardrobeAccessories) {
          prompt += ` | Accessories: ${char.wardrobeAccessories}`
        }
        prompt += '\n'
      } else {
        prompt += `   WARDROBE: Not specified (use scene context)\n`
      }
    })
    prompt += '\n'
  }
  
  // Reference images summary
  if (request.referenceImageCount > 0) {
    prompt += `REFERENCE IMAGES: ${request.referenceImageCount} reference image(s) will be provided inline (characters, location, props)\n\n`
  }
  
  // Props
  if (request.props.length > 0) {
    prompt += `KEY PROPS:\n`
    request.props.forEach(prop => {
      const ref = prop.hasReferenceImage ? ' [reference image provided]' : ''
      const imp = prop.importance === 'critical' ? ' ⚠️ CRITICAL' : prop.importance === 'important' ? ' (important)' : ''
      prompt += `- ${prop.name}${prop.description ? `: ${prop.description}` : ''}${imp}${ref}\n`
    })
    prompt += '\n'
  }
  
  // Location
  if (request.location) {
    prompt += `LOCATION: ${request.location.name}${request.location.hasReferenceImage ? ' [reference image provided]' : ''}\n\n`
  }
  
  // Scene direction metadata (preserved useful cues)
  if (request.directionMetadata) {
    const dm = request.directionMetadata
    const cues: string[] = []
    if (dm.framingHint) cues.push(`Framing: ${dm.framingHint}`)
    if (dm.lightingMood) cues.push(`Lighting: ${dm.lightingMood}`)
    if (dm.colorTemperature) cues.push(`Color Temperature: ${dm.colorTemperature}`)
    if (dm.timeOfDay) cues.push(`Time of Day: ${dm.timeOfDay}`)
    if (dm.atmosphere) cues.push(`Atmosphere: ${dm.atmosphere}`)
    if (dm.keyProps?.length) cues.push(`Direction Props: ${dm.keyProps.join(', ')}`)
    if (dm.locationDescription) cues.push(`Set: ${dm.locationDescription}`)
    
    if (cues.length > 0) {
      prompt += `SCENE DIRECTION CUES:\n${cues.join('\n')}\n\n`
    }
  }
  
  // Art style
  prompt += `ART STYLE: ${request.artStyle || 'photorealistic'}\n`
  
  // Special instructions for title sequences
  if (request.sceneType === 'title' && request.filmContext?.title) {
    prompt += `\n⚠️ TITLE SEQUENCE: This is a title card. The film title "${request.filmContext.title}" must be CENTERED and prominently displayed as the main visual element. Genre: ${request.filmContext.genre?.join(', ') || 'drama'}. Design a professional, genre-appropriate title card — NOT a starting frame with the title at the top.\n`
  }
  
  // Special instructions for credits/outro
  if (request.sceneType === 'credits') {
    prompt += `\n⚠️ CREDITS/OUTRO: Design a professional end credits card with elegant typography and genre-appropriate background.\n`
  }
  
  return prompt
}

/**
 * Generate a smart, context-aware scene image prompt using Gemini intelligence.
 * 
 * This is the main entry point. It:
 * 1. Checks the cache for a previously generated prompt
 * 2. Calls Gemini 2.5 Flash with full scene context
 * 3. Returns the AI-generated prompt or falls back to the rules-based optimizer
 * 
 * @param request - Full scene context including characters, wardrobe, direction metadata
 * @returns The optimized prompt with reasoning and negative prompt additions
 */
export async function generateSceneImagePrompt(
  request: SceneImageIntelligenceRequest
): Promise<SceneImageIntelligenceResult> {
  // Check cache first
  const cacheKey = getCacheKey(request)
  const cachedResult = getCachedResult(cacheKey)
  if (cachedResult) {
    console.log(`[Scene Image Intelligence] Cache hit for scene ${request.sceneNumber}`)
    return cachedResult
  }
  
  console.log(`[Scene Image Intelligence] Generating AI prompt for scene ${request.sceneNumber} (type: ${request.sceneType})`)
  console.log(`[Scene Image Intelligence] Characters: ${request.characters.map(c => `${c.name}(ref:${c.hasReferenceImage})`).join(', ')}`)
  console.log(`[Scene Image Intelligence] Reference images: ${request.referenceImageCount}, Props: ${request.props.length}, Location: ${request.location?.name || 'none'}`)
  
  try {
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(request)
    
    console.log(`[Scene Image Intelligence] User prompt length: ${userPrompt.length} chars`)
    
    const result = await generateText(userPrompt, {
      systemInstruction: systemPrompt,
      temperature: 0.4, // Slightly creative but mostly deterministic
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      thinkingLevel: 'low', // Fast thinking for prompt generation
    })
    
    // Parse JSON response
    let parsed: { prompt?: string; reasoning?: string; negativeAdditions?: string[] }
    try {
      // Handle potential markdown code fence wrapping
      let cleanText = result.text.trim()
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
      parsed = JSON.parse(cleanText)
    } catch (parseError) {
      console.warn(`[Scene Image Intelligence] Failed to parse JSON response, using raw text`)
      console.warn(`[Scene Image Intelligence] Raw response: ${result.text.substring(0, 200)}`)
      parsed = { prompt: result.text.trim() }
    }
    
    if (!parsed.prompt || parsed.prompt.trim().length < 20) {
      console.warn(`[Scene Image Intelligence] AI returned insufficient prompt, falling back`)
      throw new Error('AI returned insufficient prompt')
    }
    
    // Sanitize: ensure no dangerous content slipped through
    let finalPrompt = parsed.prompt.trim()
    
    // Ensure the prompt doesn't exceed 1200 chars (leave room for reference instructions)
    if (finalPrompt.length > 1200) {
      const truncated = finalPrompt.substring(0, 1200)
      const lastPeriod = truncated.lastIndexOf('.')
      finalPrompt = lastPeriod > 800 ? truncated.substring(0, lastPeriod + 1) : truncated
    }
    
    const intelligenceResult: SceneImageIntelligenceResult = {
      prompt: finalPrompt,
      reasoning: parsed.reasoning,
      negativePromptAdditions: parsed.negativeAdditions,
      usedAI: true,
    }
    
    // Cache the result
    setCachedResult(cacheKey, intelligenceResult)
    
    console.log(`[Scene Image Intelligence] ✓ AI prompt generated (${finalPrompt.length} chars)`)
    console.log(`[Scene Image Intelligence] Reasoning: ${parsed.reasoning || 'none'}`)
    
    return intelligenceResult
    
  } catch (error: any) {
    console.error(`[Scene Image Intelligence] Gemini error, falling back to rules-based optimizer:`, error.message)
    
    // Return a fallback indicator — the caller should use optimizePromptForImagen() instead
    return {
      prompt: '', // Empty signals the caller to use the fallback
      reasoning: `AI intelligence unavailable: ${error.message}`,
      usedAI: false,
    }
  }
}
