/**
 * Video Prompt Compiler
 * 
 * Converts Smart Prompt UI constraint settings into a structured Veo 3.1 API payload.
 * This is the "brains" that translates user-friendly settings into technical prompts.
 * 
 * @module videoPromptCompiler
 */

import {
  SmartPromptSettings,
  VideoPromptPayload,
  VideoGenerationMethod,
  CameraMovementType,
  ShotFramingType,
  LightingStyle,
  ColorGradingPreset,
  VisualStylePreset,
  SceneSegment,
} from './types'

import type { DetailedSceneDirection } from '@/types/scene-direction'

// ============================================================================
// Prompt Fragment Mappings
// ============================================================================

/**
 * Camera movement to natural language descriptions
 */
const CAMERA_MOVEMENT_DESCRIPTIONS: Record<CameraMovementType, string> = {
  'static': 'static camera, no movement',
  'dolly-in': 'slow dolly in toward the subject',
  'pull-out': 'camera pulls back from the subject',
  'pan-left': 'smooth pan left across the scene',
  'pan-right': 'smooth pan right across the scene',
  'tilt-up': 'camera tilts upward',
  'tilt-down': 'camera tilts downward',
  'crane': 'elegant crane shot rising or descending',
  'handheld': 'handheld camera with natural movement',
  'steadicam': 'smooth steadicam following the action',
  'track': 'lateral tracking shot',
  'orbit': 'camera orbits around the subject',
  'whip-pan': 'fast whip pan with motion blur',
}

/**
 * Shot framing to natural language descriptions
 */
const SHOT_FRAMING_DESCRIPTIONS: Record<ShotFramingType, string> = {
  'extreme-wide': 'extreme wide shot establishing the environment',
  'wide': 'wide shot showing full scene context',
  'medium-wide': 'medium-wide shot, characters visible from knees up',
  'medium': 'medium shot framing characters from waist up',
  'medium-close': 'medium close-up, characters from chest up',
  'close-up': 'close-up shot on face or subject details',
  'extreme-close-up': 'extreme close-up focusing on eyes or small details',
  'over-shoulder': 'over-the-shoulder shot for dialogue',
  'two-shot': 'two-shot framing both characters',
  'insert': 'insert shot focusing on specific object or detail',
}

/**
 * Lighting style to natural language descriptions
 */
const LIGHTING_DESCRIPTIONS: Record<LightingStyle, string> = {
  'natural': 'natural lighting',
  'studio': 'professional studio lighting',
  'dramatic': 'dramatic lighting with strong shadows',
  'soft': 'soft diffused lighting',
  'high-key': 'high-key bright lighting',
  'low-key': 'low-key moody lighting',
  'golden-hour': 'warm golden hour sunlight',
  'blue-hour': 'cool blue hour twilight',
  'neon': 'neon lighting with vibrant colors',
  'practical': 'practical lighting from scene sources',
}

/**
 * Color grading to natural language descriptions
 */
const COLOR_GRADING_DESCRIPTIONS: Record<ColorGradingPreset, string> = {
  'neutral': 'neutral color grading',
  'warm': 'warm color palette',
  'cool': 'cool color temperature',
  'teal-orange': 'cinematic teal and orange color grading',
  'bleach-bypass': 'bleach bypass look with reduced saturation',
  'vintage': 'vintage film look',
  'high-contrast': 'high contrast look',
  'desaturated': 'desaturated muted colors',
  'vibrant': 'vibrant punchy colors',
}

/**
 * Visual style presets - complete look packages
 */
const STYLE_PRESET_PROMPTS: Record<VisualStylePreset, string> = {
  'cinematic': 'cinematic look, film grain, shallow depth of field, 2.39:1 framing feel',
  'documentary': 'documentary style, natural lighting, handheld aesthetic',
  'commercial': 'commercial polish, clean lighting, vibrant colors',
  'music-video': 'music video style, dynamic camera, stylized lighting',
  'horror': 'horror atmosphere, high contrast, unsettling shadows',
  'romantic': 'romantic mood, soft lighting, warm tones',
  'noir': 'film noir style, high contrast black and white inspired',
  'vintage': 'vintage film look, grain, faded colors',
  'custom': '', // No preset, uses individual settings
}

// ============================================================================
// Negative Prompt Fragments
// ============================================================================

/**
 * Common negative prompt fragments to avoid quality issues
 */
const COMMON_NEGATIVE_PROMPTS = [
  'blurry',
  'low quality',
  'pixelated',
  'watermark',
  'text overlay',
  'logo',
  'frame drops',
  'temporal inconsistency',
  'morphing artifacts',
  'face distortion',
  'extra limbs',
  'unnatural movement',
]

/**
 * Default Veo-3 anti-mannequin negative prompts
 * Used when scene direction doesn't have custom negatives
 */
const VEO3_ANTI_MANNEQUIN_PROMPTS = [
  'stiff posture',
  'frozen expression', 
  'robotic movement',
  'mannequin-like',
  'digital mask',
  'dead eyes',
  'mechanical motion',
  'unnatural pose',
]

/**
 * Additional negative prompts based on context
 */
const CONTEXT_NEGATIVE_PROMPTS = {
  preserveFaces: ['face morphing', 'identity change', 'facial distortion'],
  staticCamera: ['camera shake', 'camera movement', 'unstable framing'],
  highQuality: ['compression artifacts', 'banding', 'noise'],
}

// ============================================================================
// Compiler Functions
// ============================================================================

/**
 * Compiles camera settings into a prompt fragment
 */
function compileCameraPrompt(camera: SmartPromptSettings['camera']): string {
  const fragments: string[] = []

  // Movement type
  fragments.push(CAMERA_MOVEMENT_DESCRIPTIONS[camera.movementType])

  // Velocity modifier
  if (camera.movementType !== 'static') {
    const velocityMod = camera.velocity === 'slow' ? 'gentle' :
                        camera.velocity === 'fast' ? 'dynamic' : 'smooth'
    fragments[0] = `${velocityMod} ${fragments[0]}`
  }

  // Shot framing
  fragments.push(SHOT_FRAMING_DESCRIPTIONS[camera.shotFraming])

  // Focus mode
  if (camera.focusMode === 'rack') {
    fragments.push('rack focus transition')
  } else if (camera.focusMode === 'follow') {
    fragments.push(`focus follows ${camera.focusTarget || 'subject'}`)
  } else if (camera.focusMode === 'deep') {
    fragments.push('deep focus, everything sharp')
  }

  // Motion intensity
  if (camera.motionIntensity > 70) {
    fragments.push('high energy movement')
  } else if (camera.motionIntensity < 30) {
    fragments.push('minimal movement, contemplative')
  }

  // Pacing style
  if (camera.pacingStyle !== 'natural') {
    const pacingDesc = {
      'contemplative': 'slow meditative pacing',
      'dynamic': 'dynamic energetic pacing',
      'frenetic': 'frenetic fast-paced action',
    }
    fragments.push(pacingDesc[camera.pacingStyle as keyof typeof pacingDesc] || '')
  }

  return fragments.filter(Boolean).join(', ')
}

/**
 * Compiles performance settings into a prompt fragment
 */
function compilePerformancePrompt(performance: SmartPromptSettings['performance']): string {
  const fragments: string[] = []

  // Primary character focus
  if (performance.primaryCharacter) {
    fragments.push(`focus on ${performance.primaryCharacter}`)
  }

  // Emotional state
  if (performance.emotionalState) {
    fragments.push(`${performance.emotionalState} emotional state`)
  }

  // Expression intensity
  if (performance.expressionIntensity > 70) {
    fragments.push('expressive, emotive performance')
  } else if (performance.expressionIntensity < 30) {
    fragments.push('subtle, restrained expression')
  }

  // Micro-expressions
  if (performance.microExpressionsEnabled) {
    fragments.push('natural micro-expressions')
  }

  // Eye contact
  if (performance.eyeContactMode === 'camera-aware') {
    fragments.push('occasional eye contact with camera')
  } else if (performance.eyeContactMode === 'avoid') {
    fragments.push('character avoids direct gaze')
  }

  // Body language
  if (performance.bodyLanguageIntensity > 70) {
    fragments.push('animated body language')
  } else if (performance.bodyLanguageIntensity < 30) {
    fragments.push('minimal body movement')
  }

  return fragments.filter(Boolean).join(', ')
}

/**
 * Compiles visual style settings into a prompt fragment
 */
function compileVisualStylePrompt(style: SmartPromptSettings['visualStyle']): string {
  const fragments: string[] = []

  // Style preset (if not custom, use the preset as base)
  if (style.stylePreset !== 'custom' && STYLE_PRESET_PROMPTS[style.stylePreset]) {
    fragments.push(STYLE_PRESET_PROMPTS[style.stylePreset])
  }

  // Lighting (only add if custom or different from preset default)
  if (style.stylePreset === 'custom' || style.lighting !== 'natural') {
    fragments.push(LIGHTING_DESCRIPTIONS[style.lighting])
    if (style.lightingIntensity > 70) {
      fragments.push('strong bold lighting')
    } else if (style.lightingIntensity < 30) {
      fragments.push('subtle lighting')
    }
  }

  // Color grading
  if (style.stylePreset === 'custom' || style.colorGrading !== 'neutral') {
    fragments.push(COLOR_GRADING_DESCRIPTIONS[style.colorGrading])
  }

  // Saturation
  if (style.saturation > 70) {
    fragments.push('rich saturated colors')
  } else if (style.saturation < 30) {
    fragments.push('desaturated muted tones')
  }

  // Contrast
  if (style.contrast > 70) {
    fragments.push('high contrast')
  } else if (style.contrast < 30) {
    fragments.push('low contrast flat look')
  }

  // Film grain
  if (style.filmGrainEnabled && style.filmGrainIntensity > 0) {
    const grainDesc = style.filmGrainIntensity > 50 ? 'heavy film grain' : 'subtle film grain'
    fragments.push(grainDesc)
  }

  // Depth of field
  if (style.depthOfFieldEnabled) {
    if (style.apertureStyle === 'shallow') {
      fragments.push('shallow depth of field, bokeh background')
    } else if (style.apertureStyle === 'wide') {
      fragments.push('deep focus, sharp throughout')
    }
  }

  // Atmosphere
  if (style.atmosphereType && style.atmosphereType !== 'none') {
    const atmIntensity = (style.atmosphereIntensity || 50) > 50 ? 'heavy' : 'light'
    fragments.push(`${atmIntensity} ${style.atmosphereType} atmosphere`)
  }

  return fragments.filter(Boolean).join(', ')
}

/**
 * Compiles magic edit settings into a prompt fragment (for the edit operation)
 */
function compileMagicEditPrompt(magicEdit: SmartPromptSettings['magicEdit']): string | null {
  if (!magicEdit.enabled) return null

  const fragments: string[] = []

  switch (magicEdit.operationType) {
    case 'replace':
      fragments.push(`replace ${magicEdit.targetDescription} with ${magicEdit.changeDescription}`)
      break
    case 'remove':
      fragments.push(`remove ${magicEdit.targetDescription} from the scene`)
      break
    case 'add':
      fragments.push(`add ${magicEdit.changeDescription} to the scene`)
      break
    case 'modify':
      fragments.push(`modify ${magicEdit.targetDescription}: ${magicEdit.changeDescription}`)
      break
    case 'style-transfer':
      fragments.push(`apply ${magicEdit.changeDescription} style to ${magicEdit.targetDescription}`)
      break
  }

  if (magicEdit.preserveFaces) {
    fragments.push('preserve facial identity')
  }

  return fragments.join(', ')
}

/**
 * Builds the negative prompt from settings
 */
function buildNegativePrompt(settings: SmartPromptSettings): string {
  const negatives = [...COMMON_NEGATIVE_PROMPTS]

  // Add context-specific negatives
  if (settings.magicEdit.preserveFaces) {
    negatives.push(...CONTEXT_NEGATIVE_PROMPTS.preserveFaces)
  }

  if (settings.camera.movementType === 'static') {
    negatives.push(...CONTEXT_NEGATIVE_PROMPTS.staticCamera)
  }

  negatives.push(...CONTEXT_NEGATIVE_PROMPTS.highQuality)

  // Deduplicate
  return [...new Set(negatives)].join(', ')
}

// ============================================================================
// Main Compiler
// ============================================================================

export interface CompileOptions {
  /** Base prompt from segment or user input */
  basePrompt: string
  /** Smart Prompt settings from UI */
  settings: SmartPromptSettings
  /** Generation method to use */
  method: VideoGenerationMethod
  /** Duration in seconds */
  durationSeconds: number
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1'
  /** Start frame URL for I2V/FTV */
  startFrameUrl?: string
  /** End frame URL for FTV (interpolation) */
  endFrameUrl?: string
  /** Reference image URLs */
  referenceImages?: string[]
  /** Source video reference for extension */
  sourceVideoRef?: string
  /** Audio URL for lip-sync */
  audioUrl?: string
  /** Character names to preserve */
  preserveCharacters?: string[]
  /** Previous segment URL for continuity */
  previousSegmentUrl?: string
  /** Scene direction for professional video optimization */
  sceneDirection?: DetailedSceneDirection | null
}

/**
 * Compile scene direction into video-optimized prompt fragment
 * NEW: Includes performance direction for Veo-3 cinematic quality
 */
function compileSceneDirectionPrompt(sceneDirection: DetailedSceneDirection | null | undefined): string {
  if (!sceneDirection) return ''
  
  const fragments: string[] = []
  
  // Performance direction (NEW - critical for Veo-3 quality)
  if (sceneDirection.performanceDirection) {
    const perf = sceneDirection.performanceDirection
    
    // Micro-expressions
    if (perf.microExpressions?.length) {
      fragments.push(`subtle facial details: ${perf.microExpressions.slice(0, 2).join(', ')}`)
    }
    
    // Physical weight
    if (perf.physicalWeight) {
      fragments.push(perf.physicalWeight)
    }
    
    // Emotional transitions
    if (perf.emotionalTransitions?.length) {
      fragments.push(`emotional arc: ${perf.emotionalTransitions[0]}`)
    }
    
    // Subtext
    if (perf.subtextMotivation) {
      fragments.push(`inner state: ${perf.subtextMotivation}`)
    }
    
    // Physiological cues
    if (perf.physiologicalCues) {
      fragments.push(perf.physiologicalCues)
    }
  }
  
  // Veo optimization keywords (NEW)
  if (sceneDirection.veoOptimization) {
    const veo = sceneDirection.veoOptimization
    
    if (veo.subsurfaceScattering) {
      fragments.push('subsurface scattering for realistic skin')
    }
    
    if (veo.motionQuality) {
      fragments.push(`${veo.motionQuality} movement`)
    }
    
    if (veo.objectInteraction) {
      fragments.push(veo.objectInteraction)
    }
    
    if (veo.textureHints?.length) {
      fragments.push(`material detail: ${veo.textureHints.slice(0, 2).join(', ')}`)
    }
  }
  
  // Narrative lighting (NEW)
  if (sceneDirection.narrativeLighting) {
    const light = sceneDirection.narrativeLighting
    
    if (light.atmosphericElements?.length) {
      fragments.push(light.atmosphericElements.slice(0, 2).join(', '))
    }
    
    if (light.colorTemperatureStory) {
      fragments.push(light.colorTemperatureStory)
    }
    
    if (light.shadowNarrative) {
      fragments.push(light.shadowNarrative)
    }
  }
  
  // Traditional talent direction
  if (sceneDirection.talent?.emotionalBeat) {
    fragments.push(`expression: ${sceneDirection.talent.emotionalBeat}`)
  }
  
  return fragments.filter(Boolean).join('. ')
}

/**
 * Main compiler function - converts Smart Prompt settings to Veo 3.1 payload
 * 
 * @param options Compilation options
 * @returns VideoPromptPayload ready for Veo 3.1 API
 */
export function compileVideoPrompt(options: CompileOptions): VideoPromptPayload {
  const {
    basePrompt,
    settings,
    method,
    durationSeconds,
    aspectRatio = '16:9',
    startFrameUrl,
    endFrameUrl,
    referenceImages,
    sourceVideoRef,
    audioUrl,
    preserveCharacters = [],
    previousSegmentUrl,
    sceneDirection,
  } = options

  // Compile individual sections
  const cameraPrompt = compileCameraPrompt(settings.camera)
  const performancePrompt = compilePerformancePrompt(settings.performance)
  const visualPrompt = compileVisualStylePrompt(settings.visualStyle)
  const magicEditPrompt = compileMagicEditPrompt(settings.magicEdit)
  
  // NEW: Compile scene direction for professional video production
  const sceneDirectionPrompt = compileSceneDirectionPrompt(sceneDirection)

  // Assemble the full prompt (include scene direction for Veo-3 optimization)
  const promptParts = [
    basePrompt,
    cameraPrompt,
    performancePrompt,
    visualPrompt,
    sceneDirectionPrompt, // NEW: Add scene direction
  ].filter(Boolean)

  const fullPrompt = promptParts.join('. ')

  // Build negative prompt (include Veo-3 anti-mannequin prompts from scene direction)
  let negativePrompt = buildNegativePrompt(settings)
  
  // Append Veo-3 specific negative prompts if scene direction has them
  if (sceneDirection?.veoOptimization?.negativePrompts?.length) {
    const veoNegatives = sceneDirection.veoOptimization.negativePrompts.join(', ')
    negativePrompt = `${negativePrompt}, ${veoNegatives}`
  } else {
    // Add default anti-mannequin prompts if no custom ones provided
    negativePrompt = `${negativePrompt}, ${VEO3_ANTI_MANNEQUIN_PROMPTS.join(', ')}`
  }

  // Build the payload
  const payload: VideoPromptPayload = {
    basePrompt: fullPrompt,
    negativePrompt,
    method,
    durationSeconds: settings.camera.durationOverride || durationSeconds,
    aspectRatio,
    startFrameUrl,
    endFrameUrl,
    referenceImages,
    sourceVideoRef,
    controlSignals: {
      cameraMovement: settings.camera.movementType,
      cameraVelocity: settings.camera.velocity,
      shotFraming: settings.camera.shotFraming,
      motionIntensity: settings.camera.motionIntensity,
      lightingStyle: settings.visualStyle.lighting,
      colorGrading: settings.visualStyle.colorGrading,
      atmosphereType: settings.visualStyle.atmosphereType,
    },
    temporalConsistency: {
      preserveCharacters,
      preserveEnvironment: true,
      previousSegmentUrl,
    },
  }

  // Add audio guidance if lip-sync is enabled
  if (settings.performance.lipSyncEnabled && audioUrl) {
    payload.audioGuidance = {
      audioUrl,
      lipSyncEnabled: true,
      syncPriority: settings.performance.lipSyncPriority,
    }
  }

  // Add magic edit payload if enabled
  if (settings.magicEdit.enabled && magicEditPrompt) {
    payload.magicEditPayload = {
      targetMask: settings.magicEdit.maskUrl,
      targetPrompt: settings.magicEdit.targetDescription,
      changePrompt: settings.magicEdit.changeDescription,
      preserveFaces: settings.magicEdit.preserveFaces,
      blendStrength: settings.magicEdit.blendStrength,
    }
  }

  return payload
}

/**
 * Extract Smart Prompt settings from an existing segment
 * Useful for editing existing segments
 */
export function extractSettingsFromSegment(segment: SceneSegment): Partial<SmartPromptSettings> {
  const settings: Partial<SmartPromptSettings> = {}

  // Extract camera settings from segment metadata
  if (segment.cameraMovement) {
    settings.camera = {
      movementType: (segment.cameraMovement as CameraMovementType) || 'static',
      velocity: 'medium',
      shotFraming: (segment.shotType as ShotFramingType) || 'medium',
      focusMode: 'locked',
      motionIntensity: 50,
      pacingStyle: 'natural',
    }
  }

  // Extract character info for performance settings
  if (segment.characters && segment.characters.length > 0) {
    const speakingChar = segment.characters.find(c => c.role === 'speaking')
    settings.performance = {
      lipSyncEnabled: false,
      lipSyncPriority: 'off',
      expressionIntensity: 50,
      microExpressionsEnabled: true,
      eyeContactMode: 'natural',
      primaryCharacter: speakingChar?.name,
      emotionalState: segment.emotionalBeat,
      bodyLanguageIntensity: 50,
    }
  }

  return settings
}

/**
 * Format a VideoPromptPayload for display/debugging
 */
export function formatPayloadForDisplay(payload: VideoPromptPayload): string {
  const lines = [
    `Method: ${payload.method}`,
    `Duration: ${payload.durationSeconds}s`,
    `Aspect Ratio: ${payload.aspectRatio}`,
    '',
    'Prompt:',
    payload.basePrompt,
    '',
    'Negative Prompt:',
    payload.negativePrompt,
    '',
    'Control Signals:',
    `  Camera: ${payload.controlSignals.cameraMovement} (${payload.controlSignals.cameraVelocity})`,
    `  Framing: ${payload.controlSignals.shotFraming}`,
    `  Motion: ${payload.controlSignals.motionIntensity}%`,
    `  Lighting: ${payload.controlSignals.lightingStyle}`,
    `  Color: ${payload.controlSignals.colorGrading}`,
  ]

  if (payload.audioGuidance?.lipSyncEnabled) {
    lines.push('', 'Audio Sync: Enabled', `  Priority: ${payload.audioGuidance.syncPriority}`)
  }

  if (payload.magicEditPayload) {
    lines.push('', 'Magic Edit:', `  Target: ${payload.magicEditPayload.targetPrompt}`, `  Change: ${payload.magicEditPayload.changePrompt}`)
  }

  return lines.join('\n')
}
