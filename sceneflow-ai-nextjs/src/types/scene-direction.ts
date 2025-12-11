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

export interface DetailedSceneDirection {
  camera: CameraDirection
  lighting: LightingDirection
  scene: SceneDirection
  talent: TalentDirection
  audio: AudioDirection
  generatedAt?: string
  /** Content hash of the scene when this direction was generated (for workflow sync tracking) */
  basedOnContentHash?: string
}

