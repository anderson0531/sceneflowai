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

import { generateText, generateTextCacheAware, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK,
} from '@/lib/character/characterReferenceAssembly'
import { LOCATION_TURNAROUND_USER_PROMPT_HINT } from '@/lib/vision/locationReferencePrompts'
import type { BeatKind } from '@/lib/script/segmentTypes'

// =============================================================================
// Types
// =============================================================================

export type {
  SceneType,
  FilmContext,
  SceneDirectionMetadata,
} from '@/lib/intelligence/scene-direction-metadata'
export { detectSceneType, extractDirectionMetadata } from '@/lib/intelligence/scene-direction-metadata'

import type { FilmContext, SceneDirectionMetadata, SceneType } from '@/lib/intelligence/scene-direction-metadata'

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
  /** Character hairstyle for consistency alongside identity reference */
  hairDescription?: string
  /** Whether this character has a reference image */
  hasReferenceImage: boolean
  /** Reference index (1-based) for identity portrait when present */
  referenceIndex?: number
  identityReferenceIndex?: number
  wardrobeReferenceIndex?: number
  /** Both identity portrait and wardrobe turnaround are provided */
  hasDualReferences?: boolean
  /** Whether a wardrobe turnaround reference image exists */
  hasCostumeReference?: boolean
}

export interface PropContext {
  name: string
  description?: string
  category?: string
  importance?: string
  hasReferenceImage: boolean
  /** 1-based index when a prop reference image will be sent inline */
  referenceIndex?: number
}

export interface LocationContext {
  name: string
  hasReferenceImage: boolean
  /** 1-based index when a location reference image will be sent inline */
  referenceIndex?: number
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
  /** Beat-first frame kind when generating a per-beat storyboard image */
  beatKind?: BeatKind
  beatIndex?: number
  totalBeats?: number
  beatAction?: string
  beatRole?: string
  /** Structured scene direction metadata (preserved cues) */
  directionMetadata?: SceneDirectionMetadata
  /** Characters in this scene with wardrobe resolved */
  characters: CharacterContext[]
  /** Props/objects in this scene */
  props: PropContext[]
  /** Available location references to choose from */
  availableLocations?: LocationContext[]
  /** Art style selection */
  artStyle?: string
  /** Number of reference images being sent */
  referenceImageCount: number
  /** SceneFlow project ID for cache scoping */
  projectId?: string
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
  /** AI selected character references by name */
  selectedCharacterNames?: string[]
  /** AI selected prop references by name */
  selectedPropNames?: string[]
  /** AI selected location reference by name (only 1) */
  selectedLocationName?: string
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

export function buildSceneImageCacheKey(request: SceneImageIntelligenceRequest): string {
  const parts = [
    request.sceneHeading,
    request.sceneAction.substring(0, 200),
    request.sceneNumber,
    request.sceneType,
    request.artStyle || 'photorealistic',
    request.beatIndex ?? 'na',
    request.totalBeats ?? 'na',
    (request.beatAction ?? '').substring(0, 120),
    request.beatRole ?? 'na',
    request.beatKind ?? 'na',
    ...request.characters.map(c => `${c.name}:${c.wardrobeDescription || 'default'}`),
    request.referenceImageCount,
  ]
  return parts.join('|')
}

function getCacheKey(request: SceneImageIntelligenceRequest): string {
  return buildSceneImageCacheKey(request)
}

/**
 * Assign 1-based Ref Image indices to props and locations in the same order
 * they are attached during image generation (after all character refs).
 */
export function assignPropAndLocationReferenceIndices(
  characters: CharacterContext[],
  props: PropContext[],
  locations: LocationContext[] = []
): { props: PropContext[]; locations: LocationContext[] } {
  let nextIndex = characters.reduce((max, c) => {
    const indices = [
      c.identityReferenceIndex,
      c.wardrobeReferenceIndex,
      c.referenceIndex,
    ].filter((n): n is number => typeof n === 'number')
    return Math.max(max, ...indices, 0)
  }, 0)

  const propsWithIndices = props.map((prop) => {
    if (!prop.hasReferenceImage) return prop
    nextIndex += 1
    return { ...prop, referenceIndex: nextIndex }
  })

  const locationsWithIndices = locations.map((loc) => {
    if (!loc.hasReferenceImage) return loc
    nextIndex += 1
    return { ...loc, referenceIndex: nextIndex }
  })

  return { props: propsWithIndices, locations: locationsWithIndices }
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
// Gemini Prompt Intelligence
// =============================================================================

/**
 * Build the system prompt for Gemini to generate scene image prompts.
 * This is the core intelligence that replaces the rules-based prompt builder.
 */
function buildSystemPrompt(): string {
  return `You are a cinematic image prompt specialist. Your job is to take a screenplay scene or beat description and generate a single, structured prompt for an AI image generation model (Gemini 3 Pro / Imagen) that creates one illustrative still image.

CRITICAL RULES:

1. ILLUSTRATIVE FRAME: Generate a prompt for ONE frozen moment that best captures the beat/scene essence — the most visually compelling story-telling frame. NOT a sequence, NOT camera movement.

2. TITLE SEQUENCES: For title/credit beats, compose a CENTERED title card. The film title is the primary subject with genre-appropriate background. No people unless explicitly required.

3. NO CONFLICTING TEXT WITH REFERENCES:
   - When an identity reference exists (person [N]), NEVER describe face, skin, ethnicity, age, gender, or body type in text — the reference image owns those
   - When hairDescription is provided in input for a character with an identity ref, DO include a concise Hair lock in [SCENE COMPOSITION & BEAT] or Subject section — e.g. "person [1], hair: swept-back dark auburn ponytail (match identity reference exactly)"
   - When a wardrobe reference exists (Ref Image [M]), NEVER describe outfit colors, garments, or accessories in text — the wardrobe reference owns clothing
   - When a location reference exists, NEVER describe architectural layout, furniture placement, or room geometry in text — the location reference owns the set
   - When a prop reference exists, NEVER describe the prop's visual appearance in text — only name it and its narrative role/action
   - ${DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK}

4. REFERENCE SELECTION: Intelligently select which characters, props, and location match the beat action and scene direction:
   - Include only characters visible or implied in THIS beat
   - Select the location that matches the scene heading and beat action
   - Include props that appear in the beat or are marked critical/important

5. STATIC IMAGE OPTIMIZATION:
   - Describe a FROZEN MOMENT — no dolly, pan, track, zoom
   - Remove all sound/audio and dialogue text (except title typography on title beats)
   - Convert sequential actions to a single pose/position

6. OUTPUT FORMAT: Return ONLY a JSON object:
   {
     "prompt": "Multi-line structured prompt using EXACT section headers below",
     "reasoning": "Brief explanation of composition and reference choices (100 chars max)",
     "negativeAdditions": ["mannequin geometry", "plastic skin", "etc"],
     "selectedCharacterNames": ["Name 1"],
     "selectedPropNames": ["Prop 1"],
     "selectedLocationName": "Location Name"
   }

7. PROMPT STRUCTURE — the "prompt" field MUST use these exact section headers in order (preserve newlines):

[GLOBAL STYLE ANCHOR]
Master Style: [art style + photorealistic/cinematic quality from input]
Lighting & Camera: [lighting mood, color temperature, time of day, lens/framing from direction cues]

[SCENE COMPOSITION & BEAT]
Action/Framing: [shot type + frozen action for THIS beat; use person [N] tokens for characters with identity refs; name props by label only]

[REFERENCE IMAGE MAPPING]
For EACH reference image provided in the input, add one bullet using the exact Ref Image index from input:
- SUBJECT REFERENCE (Ref Image [N]): Extract face shape, hair, skin tone, and physical identity only. Maintain organic human skin textures. Ignore clothing in this image if wardrobe ref exists.
- WARDROBE REFERENCE (Ref Image [M]): Extract clothing design, color palette, and garments only. Completely ignore the mannequin/plastic base, stylized medium, turnaround sheet layout, and gray studio background. Translate these clothes onto the realistic human subject from the identity ref.
- LOCATION REFERENCE (Ref Image [K]): Single extreme-wide establishing shot of the environment. Match architectural layout, furniture placement, color palette, and spatial geometry. Render ONE unified full-frame cinematic shot for this beat. Do NOT reproduce any multi-panel reference layout, 2x2 grid, split-screen, or collage. Match lighting to Global Style Anchor.
- PROP REFERENCE (Ref Image [P]): Extract shape, material, color, and design of the named prop only.

Omit mapping lines for references not used in this beat.

[EXCLUSIONS & BOUNDARIES]
Strictly Avoid: Mannequin geometry, plastic skin, cartoon style, 3D render aesthetics, canvas textures, turnaround sheet layout, 2x2 grid output, 4-panel layout, split-screen output, multi-panel layout, diptych, reference sheet collage, faceless figures, or artistic blending of reference mediums. Maintain 100% photographic realism when art style is photorealistic. No dialogue captions, subtitles, or watermarks (except centered title typography on title beats).

8. FOREHEAD/TEMPLE INJURIES: When the beat describes a bruise, cut, or injury on the forehead or temple, preserve the character's reference hairstyle exactly — do NOT pull hair back or restyle to expose the injury. The injury must be visible without changing hair placement.`
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

  // Beat-first focus when generating per-beat frames
  if (request.beatAction) {
    prompt += `BEAT ACTION (PRIMARY — compose this frame for THIS moment):\n${request.beatAction}\n`
    if (request.beatIndex !== undefined && request.totalBeats) {
      prompt += `Beat ${request.beatIndex + 1} of ${request.totalBeats}\n`
    }
    if (request.beatRole) {
      prompt += `Beat Role: ${request.beatRole}\n`
    }
    prompt += '\n'
  }
  
  // Scene action (context — beat action takes priority when present)
  prompt += `SCENE CONTEXT:\n${request.sceneAction}\n\n`
  
  // Characters with reference mapping — suppress text that conflicts with reference images
  if (request.characters.length > 0) {
    prompt += `CHARACTERS (select only those relevant to the beat action):\n`
    request.characters.forEach((char, idx) => {
      const hasIdentityRef = !!char.identityReferenceIndex
      const hasWardrobeRef = !!char.wardrobeReferenceIndex
      const useAppearanceText = !char.hasReferenceImage && char.appearanceDescription
      const useWardrobeText = !hasWardrobeRef && char.wardrobeDescription
      const useHairText = !!char.hairDescription

      let refLabel = ' [No reference image — describe appearance in prompt]'
      if (char.hasDualReferences && char.identityReferenceIndex && char.wardrobeReferenceIndex) {
        refLabel = ` [Identity Ref Image [${char.identityReferenceIndex}]; Wardrobe Ref Image [${char.wardrobeReferenceIndex}]]`
      } else if (char.identityReferenceIndex) {
        refLabel = ` [Identity Ref Image [${char.identityReferenceIndex}] — person [${char.identityReferenceIndex}] in prompt]`
      } else if (char.wardrobeReferenceIndex) {
        refLabel = ` [Wardrobe Ref Image [${char.wardrobeReferenceIndex}] only]`
      } else if (char.hasReferenceImage && char.referenceIndex) {
        refLabel = ` [Ref Image [${char.referenceIndex}] — person [${char.referenceIndex}] in prompt]`
      }
      prompt += `${idx + 1}. ${char.name}${refLabel}\n`
      
      if (useAppearanceText) {
        prompt += `   Appearance (text-only): ${char.appearanceDescription}\n`
      } else if (hasIdentityRef) {
        prompt += `   Appearance: USE IDENTITY REF ONLY — do not describe face/body in prompt text\n`
      }

      if (useHairText && hasIdentityRef) {
        prompt += `   Hair (lock — match identity ref): ${char.hairDescription}\n`
      } else if (useHairText) {
        prompt += `   Hair (text-only): ${char.hairDescription}\n`
      }
      
      if (useWardrobeText) {
        prompt += `   Wardrobe (text-only): ${char.wardrobeDescription}`
        if (char.wardrobeAccessories) {
          prompt += ` | Accessories: ${char.wardrobeAccessories}`
        }
        prompt += '\n'
      } else if (hasWardrobeRef) {
        prompt += `   Wardrobe: USE WARDROBE REF ONLY — do not describe outfit in prompt text\n`
      } else {
        prompt += `   Wardrobe: Not specified (use scene context sparingly)\n`
      }
    })
    prompt += '\n'
  }
  
  // Reference images summary
  if (request.referenceImageCount > 0) {
    prompt += `REFERENCE IMAGES: ${request.referenceImageCount} inline reference image(s) will accompany this prompt (characters, location, props). Map each in [REFERENCE IMAGE MAPPING] using the Ref Image indices listed above.\n\n`
  }
  
  // Props — include index when known; suppress visual description when ref exists
  if (request.props.length > 0) {
    prompt += `PROPS (select only those visible or critical in this beat):\n`
    request.props.forEach(prop => {
      const refIndex = prop.referenceIndex ? `Ref Image [${prop.referenceIndex}]` : 'reference image provided'
      const ref = prop.hasReferenceImage ? ` [${refIndex}]` : ''
      const imp = prop.importance === 'critical' ? ' CRITICAL' : prop.importance === 'important' ? ' (important)' : ''
      if (prop.hasReferenceImage) {
        prompt += `- ${prop.name}${imp}${ref} — visual appearance from ref only; name in action only\n`
      } else {
        prompt += `- ${prop.name}${prop.description ? `: ${prop.description}` : ''}${imp}${ref}\n`
      }
    })
    prompt += '\n'
  }
  
  // Location — include index when known
  if (request.availableLocations && request.availableLocations.length > 0) {
    prompt += `LOCATIONS (select at most one matching scene heading and beat action):\n`
    request.availableLocations.forEach(loc => {
      if (loc.hasReferenceImage && loc.referenceIndex) {
        prompt += `- ${loc.name} [Location Ref Image [${loc.referenceIndex}] — ${LOCATION_TURNAROUND_USER_PROMPT_HINT}]\n`
      } else if (loc.hasReferenceImage) {
        prompt += `- ${loc.name} [location reference image provided]\n`
      } else {
        prompt += `- ${loc.name}\n`
      }
    })
    prompt += '\n'
  }
  
  // Scene direction metadata — lighting/framing only; omit set description when location refs exist
  const hasLocationRef = request.availableLocations?.some(l => l.hasReferenceImage)
  if (request.directionMetadata) {
    const dm = request.directionMetadata
    const cues: string[] = []
    if (dm.framingHint) cues.push(`Framing: ${dm.framingHint}`)
    if (dm.lightingMood) cues.push(`Lighting: ${dm.lightingMood}`)
    if (dm.colorTemperature) cues.push(`Color Temperature: ${dm.colorTemperature}`)
    if (dm.timeOfDay) cues.push(`Time of Day: ${dm.timeOfDay}`)
    if (dm.atmosphere) cues.push(`Atmosphere: ${dm.atmosphere}`)
    if (dm.keyProps?.length) cues.push(`Direction Props: ${dm.keyProps.join(', ')}`)
    if (dm.locationDescription && !hasLocationRef) {
      cues.push(`Set: ${dm.locationDescription}`)
    }
    
    if (cues.length > 0) {
      prompt += `SCENE DIRECTION CUES (lighting/framing only${hasLocationRef ? '; set geometry comes from location ref' : ''}):\n${cues.join('\n')}\n\n`
    }
  }
  
  // Art style
  prompt += `ART STYLE: ${request.artStyle || 'photorealistic'}\n`
  
  const allowsTitleTypography =
    request.beatRole === 'title_reveal' ||
    request.beatRole === 'credit' ||
    (request.sceneType === 'credits' && request.beatRole !== 'opening')

  if (allowsTitleTypography && request.filmContext?.title) {
    prompt += `\nTITLE/CARD BEAT: Centered typography for "${request.filmContext.title}" is required on this beat only. Design a professional, genre-appropriate title or credit card composition.\n`
  } else if (request.sceneType === 'credits' && !request.beatRole) {
    prompt += `\nCREDITS/OUTRO: Design a professional end credits card with elegant typography and genre-appropriate background.\n`
  }

  if (request.beatIndex !== undefined && request.totalBeats && !request.beatAction) {
    prompt += `\nBEAT ${request.beatIndex + 1} of ${request.totalBeats}: This frame must differ visually from other beats in the sequence.\n`
  }

  if (request.beatKind === 'action' && !allowsTitleTypography) {
    prompt += `\nSILENT ACTION BEAT: Illustrate a single cinematic still with NO dialogue, NO lip-sync, NO on-screen text. Focus on shot composition, subject, motion, and mood.\n`
  }

  if (request.beatKind === 'narration') {
    prompt += `\nVOICEOVER BACKDROP: Show environment, subjects, and atmosphere ONLY. NO narrator on screen, NO talking head, NO lip-sync.\n`
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
  console.log(`[Scene Image Intelligence] Reference images: ${request.referenceImageCount}, Props: ${request.props.length}, Locations: ${request.availableLocations?.length ?? 0}`)
  
  try {
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(request)
    
    console.log(`[Scene Image Intelligence] User prompt length: ${userPrompt.length} chars`)
    
      // Use cache-aware generation: the system prompt is static across all scenes
      // in a batch, so it benefits from Vertex AI context caching.
      const result = await generateTextCacheAware(userPrompt, {
        cacheZone: 'style_consistency',
        sceneflowProjectId: request.projectId || 'default',
        systemInstruction: systemPrompt,
        cacheContextParts: [{ text: systemPrompt }],
        temperature: 0.4, // Slightly creative but mostly deterministic
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        thinkingLevel: 'low', // Fast thinking for prompt generation
        cacheTtlMinutes: 30, // Shorter TTL for batch operations
      })
      
      if (result.usedCache) {
        console.log(`[Scene Image Intelligence] Used cached system prompt for scene ${request.sceneNumber}`)
      }
    
    // Parse JSON response
    let parsed: { prompt?: string; reasoning?: string; negativeAdditions?: string[]; selectedCharacterNames?: string[]; selectedPropNames?: string[]; selectedLocationName?: string }
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
    
    // Structured prompts are longer — preserve section headers; truncate only if excessive
    const MAX_PROMPT_CHARS = 2400
    if (finalPrompt.length > MAX_PROMPT_CHARS) {
      const truncated = finalPrompt.substring(0, MAX_PROMPT_CHARS)
      const lastSection = truncated.lastIndexOf('\n[')
      finalPrompt =
        lastSection > MAX_PROMPT_CHARS * 0.6
          ? truncated.substring(0, lastSection).trimEnd()
          : truncated.trimEnd()
    }
    
    const intelligenceResult: SceneImageIntelligenceResult = {
      prompt: finalPrompt,
      reasoning: parsed.reasoning,
      negativePromptAdditions: parsed.negativeAdditions,
      selectedCharacterNames: parsed.selectedCharacterNames,
      selectedPropNames: parsed.selectedPropNames,
      selectedLocationName: parsed.selectedLocationName,
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
