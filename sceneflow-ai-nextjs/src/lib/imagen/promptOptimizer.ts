import { GoogleGenerativeAI } from '@google/generative-ai'

interface OptimizePromptParams {
  rawPrompt: string
  sceneAction: string
  visualDescription: string
  characterNames: string[]
  hasCharacterReferences: boolean
  characterMetadata?: Array<{
    name: string
    referenceImageGCS?: string
    appearanceDescription?: string
  }>
}

interface ParsedSceneDetails {
  compositionType: string
  characterAction: string
  environment: string
  characterExpression: string
  props: string[]
  lighting: string
  atmosphere: string
  colorScheme: string
}

/**
 * Hybrid prompt optimizer: Uses AI to parse scene details, then deterministically constructs template
 * ALWAYS starts fresh from scene description, ignoring any pre-built prompts
 */
export async function optimizePromptForImagen(params: OptimizePromptParams): Promise<string> {
  // Input validation
  if (!params.hasCharacterReferences || !params.characterMetadata || params.characterMetadata.length === 0) {
    // No character references - return cleaned scene description
    return cleanSceneDescription(params.visualDescription || params.rawPrompt)
  }

  const primaryCharacter = params.characterMetadata[0]
  
  if (!primaryCharacter.referenceImageGCS) {
    throw new Error('Character reference GCS URL is required')
  }

  console.log('[Prompt Optimizer] Starting fresh prompt build from scene description')
  console.log('[Prompt Optimizer] Ignoring any pre-built prompts - using only scene action and visual description')

  // Use AI to intelligently extract scene details from CLEAN scene description
  const sceneDetails = await parseSceneWithAI(params)
  
  // Deterministically construct the template using extracted details
  const optimizedPrompt = constructPromptTemplate(primaryCharacter.referenceImageGCS, sceneDetails)
  
  console.log('[Prompt Optimizer] Hybrid approach: AI parsing + deterministic template')
  console.log('[Prompt Optimizer] Composition:', sceneDetails.compositionType)
  console.log('[Prompt Optimizer] GCS Reference:', primaryCharacter.referenceImageGCS.substring(0, 50))
  console.log('[Prompt Optimizer] Action:', sceneDetails.characterAction.substring(0, 80))

  return optimizedPrompt
}

/**
 * Clean scene action by removing SFX, Music, dialogue, and ALL non-visual noise
 */
function cleanSceneAction(action: string): string {
  let cleaned = action
  
  // Remove everything after SFX: or Music: markers
  cleaned = cleaned.split(/\n\n(?:SFX|Music):/)[0]
  
  // Remove "SOUND of..." descriptions
  cleaned = cleaned.replace(/SOUND\s+of[^.]*[.!?]/gi, '')
  
  // Remove character name annotations like "BRIAN ANDERSON SR (50s, sharp but weary)"
  // Replace with neutral "Character" or remove entirely
  cleaned = cleaned.replace(/[A-Z][A-Z\s]+\([^)]+\)/g, 'Character')
  
  // Remove sound-related phrases
  cleaned = cleaned.replace(/distant office chatter/gi, '')
  cleaned = cleaned.replace(/fluorescent lights hum/gi, 'fluorescent lights')
  cleaned = cleaned.replace(/keyboard clicking/gi, '')
  
  // Clean up extra whitespace and commas
  cleaned = cleaned.replace(/\s*,\s*,/g, ',')
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.replace(/^\s*,\s*/g, '')
  
  return cleaned.trim()
}

/**
 * Use Gemini to intelligently parse scene description into structured components
 */
async function parseSceneWithAI(params: OptimizePromptParams): Promise<ParsedSceneDetails> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  // Clean the scene action to remove noise
  const cleanedAction = cleanSceneAction(params.sceneAction)
  
  // Only use the core scene description
  const sceneText = `${params.visualDescription} ${cleanedAction}`.trim()
  
  const prompt = `Analyze this scene description and extract specific visual elements for image generation.

Scene Description:
"${sceneText}"

Extract the following elements and respond ONLY with valid JSON (no markdown fences, no explanations):

{
  "compositionType": "close-up" | "medium close-up" | "medium shot" | "wide shot" | "overhead shot",
  "characterAction": "concise description of what the character is doing (e.g., 'sitting at desk, rubbing temples in exhaustion')",
  "environment": "location and setting (e.g., 'cluttered office desk covered in coffee cups and takeout containers')",
  "characterExpression": "facial expression or emotional state (e.g., 'weary and stressed expression, tired eyes')",
  "props": ["list", "of", "visible", "objects"],
  "lighting": "lighting description (e.g., 'harsh overhead fluorescent lighting')",
  "atmosphere": "mood/atmosphere (e.g., 'sterile office atmosphere')",
  "colorScheme": "color palette (e.g., 'muted cool color scheme')"
}

CRITICAL RULES:
1. Output ONLY the JSON object, nothing else
2. Keep descriptions concise and visual
3. Focus on what can be seen, not sounds or abstract concepts
4. Remove character names - use "character" or pronouns
5. Avoid emotional interpretations - describe visible appearance only
6. If a field isn't clear from the description, use empty string ""

START JSON:`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[Prompt Optimizer] AI failed to return JSON, using fallback')
      return getFallbackSceneDetails(params)
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate and fill missing fields
    return {
      compositionType: parsed.compositionType || 'medium shot',
      characterAction: parsed.characterAction || 'standing',
      environment: parsed.environment || '',
      characterExpression: parsed.characterExpression || '',
      props: Array.isArray(parsed.props) ? parsed.props : [],
      lighting: parsed.lighting || '',
      atmosphere: parsed.atmosphere || '',
      colorScheme: parsed.colorScheme || ''
    }
  } catch (error) {
    console.error('[Prompt Optimizer] AI parsing failed:', error)
    return getFallbackSceneDetails(params)
  }
}

/**
 * Fallback scene parser if AI fails
 */
function getFallbackSceneDetails(params: OptimizePromptParams): ParsedSceneDetails {
  const text = `${params.visualDescription} ${params.sceneAction}`.toLowerCase()
  
  // Simple pattern matching fallback
  let compositionType = 'medium shot'
  if (/close.?up/i.test(text)) compositionType = 'close-up'
  if (/wide\s+shot/i.test(text)) compositionType = 'wide shot'
  
  return {
    compositionType,
    characterAction: params.sceneAction || 'in scene',
    environment: params.visualDescription || '',
    characterExpression: '',
    props: [],
    lighting: /fluores/i.test(text) ? 'fluorescent lighting' : '',
    atmosphere: '',
    colorScheme: ''
  }
}

/**
 * Deterministically construct the final prompt using the template structure
 */
function constructPromptTemplate(gcsUrl: string, details: ParsedSceneDetails): string {
  // 1. Core Instruction
  const actionPart = details.characterAction ? details.characterAction : 'in scene'
  const environmentPart = details.environment ? `. ${details.environment}` : ''
  
  const coreInstruction = `Create a ${details.compositionType} of [Image Reference: ${gcsUrl}] ${actionPart}${environmentPart}.`
  
  // 2. Character Modifiers
  const characterModifiers = [
    details.characterExpression || 'natural expression',
    'photo-realistic',
    'detailed skin texture',
    'cinematic look',
    '8k resolution'
  ]
  
  // 3. Scene Modifiers
  const sceneModifiers: string[] = []
  
  if (details.lighting) sceneModifiers.push(details.lighting)
  if (details.props.length > 0) {
    sceneModifiers.push(`${details.props.join(', ')} in foreground`)
  }
  if (details.atmosphere) sceneModifiers.push(details.atmosphere)
  if (details.colorScheme) sceneModifiers.push(details.colorScheme)
  
  // Add defaults if empty
  if (sceneModifiers.length === 0) {
    sceneModifiers.push('cinematic composition', 'depth of field', 'high contrast')
  }
  
  // 4. Construct final prompt with explicit structure
  const finalPrompt = `${coreInstruction}

Character Modifiers: ${characterModifiers.join(', ')}.

Scene Modifiers: ${sceneModifiers.join(', ')}.`

  return finalPrompt.trim()
}

/**
 * Clean scene description for non-reference images
 */
function cleanSceneDescription(description: string): string {
  let cleaned = description
  
  // Remove SOUND of...
  cleaned = cleaned.replace(/SOUND\s+of[^.]*\.?/gi, '')
  
  // Add photorealistic quality
  if (!cleaned.includes('photorealistic')) {
    cleaned += '. Photorealistic, cinematic lighting, 8K resolution, sharp focus.'
  }
  
  return cleaned.trim()
}
