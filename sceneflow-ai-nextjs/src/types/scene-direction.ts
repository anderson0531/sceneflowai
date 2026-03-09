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

/**
 * Per-dialogue-line talent direction for granular performance control
 * Enables cinematic precision per spoken line for Veo-3 video generation
 */
export interface DialogueTalentDirection {
  /** ID of the dialogue line this direction applies to */
  dialogueId?: string
  /** Character name for reference */
  character: string
  /** The dialogue line text for reference */
  lineText: string
  /** Cinematic setup description (e.g., "Cinematic Close-up: She sits at a mahogany desk under a single warm lamp") */
  cinematicSetup: string
  /** Micro-expression or subtle facial transition (e.g., "eyes widen with recognition, a shiver of grief passes through her jawline") */
  microExpression: string
  /** Physical action with weight and texture (e.g., "pulls the faded photograph into the light, fingers trembling") */
  physicalAction: string
  /** Emotional transition arc for this line (e.g., "Recognition → Grief → Comfort") */
  emotionalTransition: string
  /** Character's inner motivation/subtext (e.g., "desperately trying to hold onto fading memories") */
  subtextMotivation: string
  /** Breathing and physiological cues (e.g., "breathing becomes shallow and heavy") */
  physiologicalCues: string
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
  
  // === Per-Dialogue-Line Direction ===
  
  /** Per-dialogue-line talent direction for granular performance control */
  dialogueTalentDirections?: DialogueTalentDirection[]
}

// ============================================================================
// Per-Segment Direction (for user review before prompt generation)
// ============================================================================

/**
 * Lightweight segment-level direction for user review workflow.
 * Inherits/overrides scene-level DetailedSceneDirection.
 * Allows users to review and edit direction BEFORE generating video prompts.
 */
export interface SegmentDirection {
  /** Shot type for this segment (e.g., "Wide Shot", "Close-Up", "Medium Shot") */
  shotType: string
  /** Camera movement for this segment (e.g., "Static", "Dolly In", "Pan Right") */
  cameraMovement: string
  /** Camera angle (e.g., "Eye-Level", "Low Angle", "High Angle") */
  cameraAngle: string
  /** Lens/focal length recommendation (e.g., '85mm f/1.2', '24mm f/2.8') */
  lens?: string
  /** What talent does in this segment (e.g., "SARAH looks up from laptop, startled") */
  talentAction: string
  /** Emotional beat/tone (e.g., "Tension building", "Moment of realization") */
  emotionalBeat: string
  /** Characters appearing in this segment (empty for no-talent scenes) */
  characters: string[]
  /** Whether this segment has no on-screen talent (title sequence, abstract, etc.) */
  isNoTalent: boolean
  /** Lighting mood override (if different from scene) */
  lightingMood?: string
  /** Key props visible in this segment */
  keyProps?: string[]
  /** Dialogue line IDs covered by this segment (for reference) */
  dialogueLineIds?: string[]
  /** User has reviewed/approved this direction */
  isApproved: boolean
  /** User has edited this direction (vs AI-generated default) */
  isUserEdited: boolean
  /** Generation method recommendation from AI */
  generationMethod: 'T2V' | 'I2V' | 'EXT' | 'FTV'
  /** Why AI chose to cut here */
  triggerReason: string
  /** AI confidence in this direction (0-100) */
  confidence: number
  /** Transition from previous segment (e.g., 'cut', 'dissolve', 'match cut') */
  transitionIn?: string
  /** Description of opening frame for continuity */
  startFrameDescription?: string
  /** Description of final frame for next segment continuity */
  endFrameDescription?: string
  /** Continuity notes (wardrobe, props, lighting consistency) */
  continuityNotes?: string
}

/**
 * Helper to create a SegmentDirection from scene-level direction
 * with segment-specific overrides
 */
export function createSegmentDirection(
  sceneDirection: DetailedSceneDirection | null,
  overrides: Partial<SegmentDirection>
): SegmentDirection {
  const defaultDirection: SegmentDirection = {
    shotType: sceneDirection?.camera?.shots?.[0] || 'Medium Shot',
    cameraMovement: sceneDirection?.camera?.movement || 'Static',
    cameraAngle: sceneDirection?.camera?.angle || 'Eye-Level',
    talentAction: sceneDirection?.talent?.keyActions?.[0] || '',
    emotionalBeat: sceneDirection?.talent?.emotionalBeat || '',
    characters: [],
    isNoTalent: false,
    lightingMood: sceneDirection?.lighting?.overallMood,
    keyProps: sceneDirection?.scene?.keyProps,
    dialogueLineIds: [],
    isApproved: false,
    isUserEdited: false,
    generationMethod: 'T2V',
    triggerReason: 'AI-determined cut point',
    confidence: 75,
  }
  
  return { ...defaultDirection, ...overrides }
}

/**
 * Detect if a segment should be marked as no-talent based on direction
 */
export function detectNoTalentSegment(
  talentDirection: string | TalentDirection | undefined | null
): boolean {
  if (!talentDirection) return false
  
  const talentText = typeof talentDirection === 'string' 
    ? talentDirection 
    : talentDirection.blocking || talentDirection.emotionalBeat || ''
  
  const talentLower = talentText.toLowerCase()
  const noTalentIndicators = [
    'n/a',
    'no on-screen talent',
    'no talent',
    'no actors',
    'no characters',
    'no people',
    'no human',
    'abstract',
    'title sequence',
    'text only',
    'graphics only',
    'vfx only',
    'visual effects only',
    'establishing shot',
    'location only',
  ]
  
  return noTalentIndicators.some(indicator => talentLower.includes(indicator))
}

