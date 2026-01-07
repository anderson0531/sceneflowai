/**
 * Modern Treatment Visual Types
 * 
 * Types for the enhanced, visually-rich Film Treatment layout
 * that leverages AI image generation for cinematic presentation.
 */

/**
 * Aspect ratios for different visual elements
 */
export type AspectRatio = '16:9' | '2.39:1' | '1:1' | '3:4' | '4:3'

/**
 * Treatment mood options for the "Regenerate Vibe" feature
 */
export type TreatmentMood = 'dark' | 'balanced' | 'light' | 'stylized'

/**
 * Tone keywords for generating abstract tone strips
 */
export type TonePalette = 
  | 'hopeful'      // Warm golds, soft blues, lens flares
  | 'tense'        // Deep blues, cold greys, sharp edges
  | 'romantic'     // Warm pinks, soft oranges, bokeh
  | 'horror'       // Desaturated greens, blacks, fog
  | 'action'       // Neon accents, fire oranges, motion blur
  | 'melancholy'   // Muted blues, greys, soft vignette
  | 'comedic'      // Bright, saturated, warm
  | 'noir'         // High contrast blacks, single color accent
  | 'scifi'        // Cyans, purples, digital textures
  | 'fantasy'      // Rich jewel tones, magical glow

/**
 * A generated image with metadata
 */
export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  seed?: number
  generatedAt: string
  aspectRatio: AspectRatio
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
}

/**
 * Abstract tone strip representing mood/color grading
 */
export interface ToneStrip {
  id: string
  palette: TonePalette
  colors: string[]        // Hex codes
  textures: string[]      // Texture keywords
  generatedUrl?: string
  status: 'pending' | 'generating' | 'ready' | 'error'
}

/**
 * Character portrait for "Trading Card" display
 */
export interface CharacterPortrait {
  characterId: string
  characterName: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator'
  portrait: GeneratedImage | null
  bio?: string
}

/**
 * Act anchor section with establishing shot
 */
export interface ActAnchor {
  actNumber: 1 | 2 | 3
  title: string
  establishingShot: GeneratedImage | null
  toneStrip: ToneStrip | null
  content: string
  mood?: TonePalette
}

/**
 * Key prop/MacGuffin visualization
 */
export interface KeyProp {
  id: string
  name: string
  description: string
  image: GeneratedImage | null
  centralToPlot: boolean
}

/**
 * Complete treatment visuals configuration
 */
export interface TreatmentVisuals {
  id: string
  projectId: string
  
  // Hero image for title page
  heroImage: GeneratedImage | null
  
  // Key prop / MacGuffin
  keyProp: KeyProp | null
  
  // Character portraits
  characterPortraits: CharacterPortrait[]
  
  // Act anchors with establishing shots
  actAnchors: ActAnchor[]
  
  // Global mood settings
  mood: TreatmentMood
  colorTemperature: number  // -100 (cool) to +100 (warm)
  
  // Generation state
  isGenerating: boolean
  lastGeneratedAt?: string
  
  // Credit cost tracking
  estimatedCredits: number
  creditsUsed: number
}

/**
 * Prompt templates for different visual elements
 */
export interface TreatmentPromptTemplates {
  heroImage: (params: {
    title: string
    genre: string
    mood: string
    setting?: string
    synopsis?: string
    protagonist?: string
    mainCharacterAppearance?: string
  }) => string
  
  characterPortrait: (params: {
    name: string
    description: string
    role: string
    ethnicity?: string
    age?: string
  }) => string
  
  actEstablishing: (params: {
    actNumber: number
    setting: string
    timeOfDay: string
    mood: string
    genre: string
  }) => string
  
  keyProp: (params: {
    name: string
    description: string
    genre: string
  }) => string
  
  toneStrip: (params: {
    palette: TonePalette
    genre: string
    sceneType?: string
  }) => string
}

/**
 * Default prompt templates
 */
export const DEFAULT_PROMPT_TEMPLATES: TreatmentPromptTemplates = {
  heroImage: ({ title, genre, mood, setting, synopsis, protagonist, mainCharacterAppearance }) => {
    // Build a story-accurate prompt with character details
    const characterClause = mainCharacterAppearance 
      ? `featuring ${mainCharacterAppearance}, ` 
      : '';
    const protagonistClause = protagonist && !mainCharacterAppearance
      ? `depicting ${protagonist}, `
      : '';
    const synopsisClause = synopsis 
      ? `Story: ${synopsis.slice(0, 150)}${synopsis.length > 150 ? '...' : ''}. `
      : '';
    
    return `Cinematic movie poster composition for "${title}". ${genre} atmosphere, ${mood} lighting. ` +
      `${synopsisClause}` +
      `${characterClause}${protagonistClause}` +
      `${setting ? `Setting: ${setting}. ` : ''}` +
      `Dramatic composition, professional film poster style, no text, high quality, 16:9 aspect ratio`;
  },
  
  characterPortrait: ({ name, description, role, ethnicity, age }) => {
    // Be explicit about ethnicity for accurate representation
    const ethnicityClause = ethnicity 
      ? `${ethnicity} ethnicity, ` 
      : '';
    const ageClause = age 
      ? `${age} years old, ` 
      : '';
    
    return `Studio portrait photography of ${name}. ${description}. ` +
      `${ethnicityClause}${ageClause}` +
      `${role} character archetype, neutral grey background, ` +
      `dramatic rim lighting, close-up headshot, professional quality, ` +
      `cinematic lighting, 3:4 portrait orientation. ` +
      `IMPORTANT: Accurately depict the specified ethnicity and physical features.`;
  },
  
  actEstablishing: ({ actNumber, setting, timeOfDay, mood, genre }) =>
    `Wide establishing shot of ${setting}, ${timeOfDay}, ` +
    `${mood} atmosphere, cinematic composition, ` +
    `2.39:1 ultra-wide aspect ratio, no people, ${genre} film style, ` +
    `professional cinematography, high production value`,
  
  keyProp: ({ name, description, genre }) =>
    `Product photography of ${name}, ${description}, ` +
    `dramatic lighting, dark gradient background, ` +
    `high detail, centered composition, ${genre} aesthetic, ` +
    `cinematic quality, hero object shot`,
  
  toneStrip: ({ palette, genre, sceneType }) =>
    `Abstract texture strip, ${palette} mood, ${genre} film color grading, ` +
    `${sceneType ? `${sceneType} scene atmosphere, ` : ''}` +
    `horizontal gradient, cinematic color palette, no recognizable objects, ` +
    `artistic texture, 8:1 ultra-wide aspect ratio`
}

/**
 * Tone palette color mappings
 */
export const TONE_PALETTE_COLORS: Record<TonePalette, { colors: string[], textures: string[] }> = {
  hopeful: {
    colors: ['#FFD700', '#87CEEB', '#FFF5E6', '#FFFACD'],
    textures: ['lens flares', 'soft focus', 'golden hour', 'warm glow']
  },
  tense: {
    colors: ['#1a1a2e', '#16213e', '#4a5568', '#2d3748'],
    textures: ['sharp edges', 'rain streaks', 'cold steel', 'harsh shadows']
  },
  romantic: {
    colors: ['#FFB6C1', '#FFA07A', '#FFDAB9', '#F8E8E8'],
    textures: ['bokeh', 'grain', 'soft light', 'flower petals']
  },
  horror: {
    colors: ['#1a1a1a', '#2d2d2d', '#3d5a4c', '#4a4a4a'],
    textures: ['fog', 'scratches', 'decay', 'shadows']
  },
  action: {
    colors: ['#FF4500', '#FF6B35', '#00CED1', '#1E90FF'],
    textures: ['motion blur', 'sparks', 'explosions', 'speed lines']
  },
  melancholy: {
    colors: ['#708090', '#A9A9A9', '#B0C4DE', '#778899'],
    textures: ['linen', 'soft vignette', 'rain', 'muted tones']
  },
  comedic: {
    colors: ['#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B'],
    textures: ['bright', 'saturated', 'clean', 'playful']
  },
  noir: {
    colors: ['#0a0a0a', '#1a1a1a', '#B8860B', '#2a2a2a'],
    textures: ['high contrast', 'venetian blinds', 'smoke', 'single light source']
  },
  scifi: {
    colors: ['#00FFFF', '#8B5CF6', '#0EA5E9', '#3B82F6'],
    textures: ['digital', 'holographic', 'circuit patterns', 'neon glow']
  },
  fantasy: {
    colors: ['#9333EA', '#059669', '#EAB308', '#DC2626'],
    textures: ['magical glow', 'ethereal mist', 'ancient textures', 'jewel tones']
  }
}

/**
 * Credit costs for generating treatment visuals
 */
export const TREATMENT_VISUAL_CREDITS = {
  heroImage: 15,
  characterPortrait: 10,
  actEstablishing: 15,
  keyProp: 10,
  toneStrip: 5
} as const

/**
 * Calculate total credits for full treatment visualization
 */
export function calculateTreatmentCredits(
  characterCount: number = 2,
  includeKeyProp: boolean = true,
  includeToneStrips: boolean = true
): number {
  let total = TREATMENT_VISUAL_CREDITS.heroImage
  total += characterCount * TREATMENT_VISUAL_CREDITS.characterPortrait
  total += 3 * TREATMENT_VISUAL_CREDITS.actEstablishing // 3 acts
  
  if (includeKeyProp) {
    total += TREATMENT_VISUAL_CREDITS.keyProp
  }
  
  if (includeToneStrips) {
    total += 3 * TREATMENT_VISUAL_CREDITS.toneStrip // 3 acts
  }
  
  return total
}
