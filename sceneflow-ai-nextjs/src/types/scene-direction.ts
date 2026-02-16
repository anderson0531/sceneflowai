/**
 * Detailed Scene Direction types for live-action film crew instructions
 */

export interface CameraDirection {
  shots: string[] // e.g., ["Wide Shot", "Medium Close-Up", "Insert Shot"]
  angle: string // e.g., "Eye-Level", "Low Angle", "High Angle", "Over-the-Shoulder"
  movement: string // e.g., "Static", "Handheld", "Steadicam", "Dolly In", "Pan Left", "Jib Up"
  lensChoice: string // e.g., "Wide-Angle (24mm) for depth", "Standard (50mm)", "Telephoto (85mm) for compression"
  focus: string // e.g., "Deep Focus", "Shallow Depth-of-Field", "Rack Focus from [Prop] to [Actor]"
}

export interface LightingDirection {
  overallMood: string // e.g., "High-Key", "Low-Key", "Soft & Natural", "Hard & Dramatic", "Film Noir"
  timeOfDay: string // e.g., "Golden Hour", "Mid-day", "Night", "Twilight"
  keyLight: string // e.g., "Hard light from camera left"
  fillLight: string // e.g., "Soft fill from camera right, 50% power"
  backlight: string // e.g., "To create separation from the background"
  practicals: string // e.g., "Desk lamp ON", "TV screen as primary source"
  colorTemperature: string // e.g., "Warm (Tungsten)", "Cool (Daylight)", "Stylized (e.g., blue/orange)"
}

export interface SceneDirection {
  location: string // e.g., "Messy apartment living room", "Sterile office environment"
  keyProps: string[] // e.g., ["A steaming coffee mug", "A flickering neon sign", "A specific document on the desk"]
  atmosphere: string // e.g., "Hazy/Smoky", "Clean & Minimalist", "Cluttered & Chaotic"
}

export interface TalentDirection {
  blocking: string // e.g., "Actor A starts at the window, walks to the desk on [line]", "Actor B enters from screen left"
  keyActions: string[] // e.g., ["Slams the phone down", "Looks away wistfully", "Taps fingers impatiently"]
  emotionalBeat: string // e.g., "Convey anxiety", "A moment of realization", "Suppressed anger"
}

export interface AudioDirection {
  priorities: string // e.g., "Capture clean dialogue", "Prioritize environmental sounds", "Silence on set"
  considerations: string // e.g., "Be aware of HVAC noise", "Room tone needed for this location"
}

/**
 * Performance direction for cinematic acting - optimized for Veo-3 video generation
 * Focuses on the "how" and "why" of performance rather than just "what"
 */
export interface PerformanceDirection {
  /** Micro-expressions and facial transitions (e.g., "lower lip trembles imperceptibly", "eyes widen with recognition") */
  microExpressions: string[]
  /** Physical weight and physics-based movement (e.g., "fingers dig into cardboard", "knees buckle under weight") */
  physicalWeight: string
  /** Emotional transition sequence (e.g., "Recognition → Grief → Comfort") */
  emotionalTransitions: string[]
  /** Character's inner motivation/subtext (e.g., "desperately clinging to hope while accepting defeat") */
  subtextMotivation: string
  /** Breathing and physiological cues (e.g., "breathing becomes shallow and heavy") */
  physiologicalCues: string
}

/**
 * Veo-3 specific optimization settings for video generation
 * Based on empirical testing of what produces the most realistic results
 */
export interface VeoOptimization {
  /** Enable subsurface scattering for realistic skin rendering during facial acting */
  subsurfaceScattering: boolean
  /** Negative prompts to prevent stiff/mannequin-like renders */
  negativePrompts: string[]
  /** Motion quality hints (e.g., "fluid", "weighted", "deliberate") */
  motionQuality: 'fluid' | 'weighted' | 'deliberate' | 'dynamic'
  /** Interaction style with objects (e.g., "acts WITH objects not just NEAR them") */
  objectInteraction: string
  /** Texture and materiality hints for the scene */
  textureHints: string[]
}

/**
 * Narrative lighting that defines mood through light
 * Goes beyond technical settings to story-driven lighting choices
 */
export interface NarrativeLighting {
  /** Key practical light sources that tell the story (e.g., "single warm lamp creating isolation") */
  keyPracticals: string[]
  /** Atmospheric elements visible in light (e.g., "dust motes visible in light beam", "steam rising") */
  atmosphericElements: string[]
  /** Color temperature story (e.g., "cool screens dominating with contrasting warm desk lamp spot") */
  colorTemperatureStory: string
  /** Shadow narrative (e.g., "heavy shadows emphasizing psychological depth") */
  shadowNarrative: string
}

export interface DetailedSceneDirection {
  camera: CameraDirection
  lighting: LightingDirection
  scene: SceneDirection
  talent: TalentDirection
  audio: AudioDirection
  generatedAt?: string
  /** Content hash of the scene when this direction was generated (for workflow sync tracking) */
  basedOnContentHash?: string
  
  // === Production Optimization Extensions ===
  
  /** Cinematic performance direction for talent - optimized for Veo-3 */
  performanceDirection?: PerformanceDirection
  /** Veo-3 specific optimization settings */
  veoOptimization?: VeoOptimization
  /** Story-driven narrative lighting */
  narrativeLighting?: NarrativeLighting
  /** Whether this direction has been optimized for video production */
  productionOptimized?: boolean
  /** Optimization timestamp */
  optimizedAt?: string
}

