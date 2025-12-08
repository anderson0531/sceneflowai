/**
 * Ken Burns Animation Utility
 * 
 * Provides scene-aware, cinematically intelligent Ken Burns (pan/zoom) effects
 * with direction detection, shot-type intensity, and cinematic easing curves.
 */

export type KenBurnsDirection = 
  | 'left' | 'right' | 'up' | 'down'
  | 'up-left' | 'up-right' | 'down-left' | 'down-right'
  | 'zoom-in' | 'zoom-out'

export type KenBurnsIntensity = 'subtle' | 'medium' | 'dramatic'

export type EasingCurve = 
  | 'smooth'      // Gentle, cinematic flow
  | 'drift'       // Slow start, maintains momentum
  | 'push'        // Quick start, gradual ease
  | 'dramatic'    // Strong acceleration/deceleration

export interface KenBurnsConfig {
  direction: KenBurnsDirection
  intensity: KenBurnsIntensity
  easing: string // CSS cubic-bezier or easing keyword
  duration: number // seconds
  holdStart: number // percentage of duration to hold at start (0-0.2)
  holdEnd: number // percentage of duration to hold at end (0-0.2)
  transform: {
    from: string
    to: string
  }
}

// Movement keywords for direction detection
const MOVEMENT_PATTERNS = {
  left: [
    /\b(moves?|walks?|runs?|goes?|heads?|exits?|leaves?|departs?)\s+(to\s+the\s+)?left\b/i,
    /\bpan\s+left\b/i,
    /\btrack(ing|s)?\s+left\b/i,
    /\bleft\s+to\s+right\b/i,
    /\b(enters?|arrives?)\s+(from\s+the\s+)?right\b/i,
  ],
  right: [
    /\b(moves?|walks?|runs?|goes?|heads?|exits?|leaves?|departs?)\s+(to\s+the\s+)?right\b/i,
    /\bpan\s+right\b/i,
    /\btrack(ing|s)?\s+right\b/i,
    /\bright\s+to\s+left\b/i,
    /\b(enters?|arrives?)\s+(from\s+the\s+)?left\b/i,
  ],
  up: [
    /\b(looks?|gazes?|glances?)\s+up\b/i,
    /\b(rises?|stands?|climbs?|ascends?)\b/i,
    /\btilt\s+up\b/i,
    /\bpedestal\s+up\b/i,
    /\bsky\b/i,
    /\bceiling\b/i,
    /\btall\s+(building|tower|structure)\b/i,
  ],
  down: [
    /\b(looks?|gazes?|glances?)\s+down\b/i,
    /\b(falls?|drops?|descends?|sits?|kneels?|bows?)\b/i,
    /\btilt\s+down\b/i,
    /\bpedestal\s+down\b/i,
    /\bfloor\b/i,
    /\bground\b/i,
  ],
  'zoom-in': [
    /\bclose[\s-]?up\b/i,
    /\bpush\s+in\b/i,
    /\bzoom\s+in\b/i,
    /\bmove\s+closer\b/i,
    /\bintimate\b/i,
    /\bfocus(es|ing)?\s+on\b/i,
    /\breveals?\b/i,
    /\bemotion(al)?\b/i,
    /\beyes?\b/i,
    /\bface\b/i,
  ],
  'zoom-out': [
    /\bwide\s+shot\b/i,
    /\bpull\s+back\b/i,
    /\bzoom\s+out\b/i,
    /\bestablishing\b/i,
    /\blandscape\b/i,
    /\bpanorama\b/i,
    /\bskyline\b/i,
    /\boverview\b/i,
  ],
}

// Shot type patterns for intensity detection
const SHOT_TYPE_PATTERNS = {
  subtle: [
    /\bextreme\s+close[\s-]?up\b/i,
    /\bECU\b/,
    /\bclose[\s-]?up\b/i,
    /\bCU\b/,
    /\bintimate\b/i,
    /\bdetail\s+shot\b/i,
    /\bmacro\b/i,
  ],
  medium: [
    /\bmedium\s+shot\b/i,
    /\bMS\b/,
    /\bmedium\s+close[\s-]?up\b/i,
    /\bMCU\b/,
    /\btwo[\s-]?shot\b/i,
    /\bover[\s-]?the[\s-]?shoulder\b/i,
    /\bOTS\b/,
  ],
  dramatic: [
    /\bwide\s+shot\b/i,
    /\bWS\b/,
    /\bestablishing\s+shot\b/i,
    /\blong\s+shot\b/i,
    /\bLS\b/,
    /\bextreme\s+wide\b/i,
    /\bEWS\b/,
    /\baerial\b/i,
    /\bdrone\b/i,
    /\bpanorama\b/i,
    /\blandscape\b/i,
  ],
}

// Easing curves for different moods
const EASING_CURVES: Record<EasingCurve, string> = {
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design standard
  drift: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // Slow start, gentle throughout
  push: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // Quick start, slow end
  dramatic: 'cubic-bezier(0.4, 0.0, 0.6, 1)', // Strong S-curve
}

// Intensity to translation percentage mapping
const INTENSITY_SCALE: Record<KenBurnsIntensity, number> = {
  subtle: 3,
  medium: 5,
  dramatic: 8,
}

// Duration based on intensity (faster for dramatic, slower for subtle)
const INTENSITY_DURATION: Record<KenBurnsIntensity, number> = {
  subtle: 15,
  medium: 12,
  dramatic: 10,
}

// Alternating direction sequence to avoid repetition
const DIRECTION_SEQUENCE: KenBurnsDirection[] = [
  'right',
  'up-left',
  'left',
  'down-right',
  'up',
  'down-left',
  'down',
  'up-right',
]

/**
 * Extracts text content from scene object for analysis
 */
function getSceneText(scene: any): string {
  if (!scene) return ''
  
  const parts: string[] = []
  
  // Try various common scene text fields
  if (scene.action) parts.push(scene.action)
  if (scene.visualDescription) parts.push(scene.visualDescription)
  if (scene.description) parts.push(scene.description)
  if (scene.visual_notes) parts.push(scene.visual_notes)
  if (scene.camera_details) parts.push(scene.camera_details)
  if (scene.composition) parts.push(scene.composition)
  if (scene.shotType) parts.push(scene.shotType)
  if (scene.setting) parts.push(scene.setting)
  
  return parts.join(' ')
}

/**
 * Detects optimal pan direction based on scene content
 */
export function detectDirectionFromScene(scene: any): KenBurnsDirection | null {
  const text = getSceneText(scene)
  if (!text) return null
  
  // Check each direction pattern
  for (const [direction, patterns] of Object.entries(MOVEMENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return direction as KenBurnsDirection
      }
    }
  }
  
  return null
}

/**
 * Detects optimal intensity based on shot type in scene
 */
export function detectIntensityFromScene(scene: any): KenBurnsIntensity | null {
  const text = getSceneText(scene)
  if (!text) return null
  
  // Check shot type patterns - subtle shots need gentle movement
  for (const [intensity, patterns] of Object.entries(SHOT_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return intensity as KenBurnsIntensity
      }
    }
  }
  
  return null
}

/**
 * Returns cinematic easing curve based on scene mood/content
 */
export function getCinematicEasing(scene: any): EasingCurve {
  const text = getSceneText(scene).toLowerCase()
  
  // Dramatic scenes get dramatic easing
  if (/\b(dramatic|intense|climax|confrontation|revelation|shock)\b/.test(text)) {
    return 'dramatic'
  }
  
  // Action/movement scenes get push easing
  if (/\b(runs?|chases?|fights?|escapes?|rushes?|hurries?)\b/.test(text)) {
    return 'push'
  }
  
  // Calm/emotional scenes get drift easing
  if (/\b(quiet|peaceful|tender|gentle|sad|melancholy|reflects?)\b/.test(text)) {
    return 'drift'
  }
  
  // Default to smooth
  return 'smooth'
}

/**
 * Gets alternating direction for sequential scenes to add variety
 */
export function getAlternatingDirection(sceneIndex: number): KenBurnsDirection {
  return DIRECTION_SEQUENCE[sceneIndex % DIRECTION_SEQUENCE.length]
}

/**
 * Calculates transform values for a given direction and intensity
 */
function getTransformValues(
  direction: KenBurnsDirection,
  intensity: KenBurnsIntensity
): { from: string; to: string } {
  const scale = INTENSITY_SCALE[intensity]
  
  const transforms: Record<KenBurnsDirection, { from: string; to: string }> = {
    'left': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(-${scale}%, 0%) scale(1.1)`,
    },
    'right': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(${scale}%, 0%) scale(1.1)`,
    },
    'up': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(0%, -${scale}%) scale(1.1)`,
    },
    'down': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(0%, ${scale}%) scale(1.1)`,
    },
    'up-left': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(-${scale * 0.7}%, -${scale * 0.7}%) scale(1.1)`,
    },
    'up-right': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(${scale * 0.7}%, -${scale * 0.7}%) scale(1.1)`,
    },
    'down-left': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(-${scale * 0.7}%, ${scale * 0.7}%) scale(1.1)`,
    },
    'down-right': {
      from: 'translate(0%, 0%) scale(1.1)',
      to: `translate(${scale * 0.7}%, ${scale * 0.7}%) scale(1.1)`,
    },
    'zoom-in': {
      from: 'translate(0%, 0%) scale(1.0)',
      to: `translate(0%, 0%) scale(1.${scale + 5})`,
    },
    'zoom-out': {
      from: `translate(0%, 0%) scale(1.${scale + 5})`,
      to: 'translate(0%, 0%) scale(1.0)',
    },
  }
  
  return transforms[direction]
}

/**
 * Main function: Returns complete Ken Burns configuration for a scene
 */
export function getKenBurnsConfig(
  scene: any,
  sceneIndex: number,
  userIntensity?: KenBurnsIntensity
): KenBurnsConfig {
  // Direction: scene-detected > alternating fallback
  const detectedDirection = detectDirectionFromScene(scene)
  const direction = detectedDirection || getAlternatingDirection(sceneIndex)
  
  // Intensity: user override > scene-detected > default medium
  const detectedIntensity = detectIntensityFromScene(scene)
  const intensity = userIntensity || detectedIntensity || 'medium'
  
  // Easing: scene mood-based
  const easingType = getCinematicEasing(scene)
  const easing = EASING_CURVES[easingType]
  
  // Duration based on intensity
  const duration = INTENSITY_DURATION[intensity]
  
  // Transform values
  const transform = getTransformValues(direction, intensity)
  
  // Hold frames: 10% at start, 5% at end for subtle pause effect
  const holdStart = 0.1
  const holdEnd = 0.05
  
  return {
    direction,
    intensity,
    easing,
    duration,
    holdStart,
    holdEnd,
    transform,
  }
}

/**
 * Generates CSS keyframes string for the Ken Burns animation
 * Includes hold frames at start and end for cinematic pause
 */
export function generateKenBurnsKeyframes(
  animationName: string,
  config: KenBurnsConfig
): string {
  const holdStartPercent = config.holdStart * 100
  const holdEndPercent = 100 - (config.holdEnd * 100)
  
  return `
    @keyframes ${animationName} {
      0%, ${holdStartPercent}% {
        transform: ${config.transform.from};
      }
      ${holdEndPercent}%, 100% {
        transform: ${config.transform.to};
      }
    }
  `
}

/**
 * Returns inline animation style object for React
 */
export function getKenBurnsAnimationStyle(config: KenBurnsConfig): React.CSSProperties {
  return {
    animation: `kenBurns ${config.duration}s ${config.easing} infinite alternate`,
    transformOrigin: 'center center',
  }
}
