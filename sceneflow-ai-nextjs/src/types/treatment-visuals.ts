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
    // Enhanced params for accurate character/story representation
    antagonist?: string
    antagonistAppearance?: string
    themes?: string[]
    visualStyle?: string
    conflictDynamic?: string  // e.g., "father-son ideological battle"
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
 * Cinematography specifications by genre for professional-quality hero images
 * Uses the Layered Narrative Construction method
 */
export const CINEMATOGRAPHY_SPECS: Record<string, {
  camera: string
  lens: string
  lighting: string
  colorGrade: string
}> = {
  drama: {
    camera: 'Shot on Arri Alexa Mini',
    lens: '35mm Anamorphic lens, shallow depth of field',
    lighting: 'Natural balanced lighting with motivated sources',
    colorGrade: 'Cinematic color grading, rich shadows'
  },
  documentary: {
    camera: 'Shot on Arri Alexa Mini',
    lens: '35mm Anamorphic lens, shallow depth of field (bokeh background)',
    lighting: 'High-contrast lighting, neon reflections on skin',
    colorGrade: 'Documentary realism with cinematic color grading'
  },
  noir: {
    camera: 'Shot on Red Monstro 8K',
    lens: '50mm Anamorphic, razor-sharp focus on eyes',
    lighting: 'Neon Noir lighting, high contrast, harsh shadows',
    colorGrade: 'Deep blacks, single accent color, desaturated'
  },
  thriller: {
    camera: 'Shot on Arri Alexa LF',
    lens: '40mm Anamorphic, tension-building composition',
    lighting: 'Chiaroscuro lighting, motivated shadows',
    colorGrade: 'Cool color palette, teal and orange split'
  },
  horror: {
    camera: 'Shot on Red Komodo',
    lens: '24mm wide angle, unsettling perspective',
    lighting: 'Low-key lighting, single source, deep shadows',
    colorGrade: 'Desaturated greens and blacks, sickly undertones'
  },
  romance: {
    camera: 'Shot on Sony Venice 2',
    lens: '85mm with heavy bokeh',
    lighting: 'Golden hour warmth, soft diffused light',
    colorGrade: 'Warm tones, soft pinks and oranges'
  },
  scifi: {
    camera: 'Shot on Arri Alexa 65',
    lens: '28mm Ultra Prime, clinical precision',
    lighting: 'Futuristic lighting, LED accents, volumetric atmosphere',
    colorGrade: 'Cyans and purples, digital textures, clean highlights'
  },
  action: {
    camera: 'Shot on Red V-Raptor',
    lens: '35mm, dynamic angle',
    lighting: 'High energy lighting, practical fire/explosion sources',
    colorGrade: 'Punchy contrast, orange and teal'
  },
  comedy: {
    camera: 'Shot on Arri Alexa Mini',
    lens: '40mm, balanced composition',
    lighting: 'Bright even lighting, warm and inviting',
    colorGrade: 'Saturated, vibrant, clean midtones'
  },
  fantasy: {
    camera: 'Shot on Arri Alexa 65',
    lens: '35mm Anamorphic, magical flares',
    lighting: 'Ethereal lighting, practical magic sources, rim light',
    colorGrade: 'Rich jewel tones, magical glow, painterly'
  }
}

/**
 * Tone-to-lighting style mapping for the Lighting & Atmosphere layer
 */
export const TONE_LIGHTING_STYLES: Record<string, string> = {
  melancholic: 'Melancholic lighting with muted blues and soft vignette',
  neon: 'Neon Noir lighting, high-contrast with neon reflections on skin',
  hopeful: 'Warm golden hour lighting with lens flares',
  tense: 'Stark contrast lighting with cold blue undertones',
  romantic: 'Soft diffused lighting with warm pink and orange tones',
  dark: 'Low-key dramatic lighting, deep shadows, single source',
  gritty: 'Harsh practical lighting, desaturated, documentary realism',
  dreamlike: 'Ethereal soft focus, gauzy lighting, magical quality',
  comedic: 'Bright even lighting, warm and saturated',
  epic: 'Sweeping dramatic lighting, golden rim light, volumetric atmosphere'
}

/**
 * Default prompt templates
 */
export const DEFAULT_PROMPT_TEMPLATES: TreatmentPromptTemplates = {
  heroImage: ({ title, genre, mood, setting, synopsis, protagonist, mainCharacterAppearance, antagonist, antagonistAppearance, themes, visualStyle, conflictDynamic }) => {
    /**
     * LAYERED NARRATIVE CONSTRUCTION METHOD
     * Formula: [Subject & Micro-Expression] + [Environment & "The Trap"] + 
     *          [Lighting & Atmosphere] + [Cinematography]
     * 
     * This produces cinematic hero images with emotional resonance and visual subtext.
     */
    const parts: string[] = []
    
    // Normalize genre for cinematography lookup
    const normalizedGenre = (genre || 'drama').toLowerCase().replace(/[^a-z]/g, '')
    const cinSpecs = CINEMATOGRAPHY_SPECS[normalizedGenre] || CINEMATOGRAPHY_SPECS.drama
    
    // Normalize tone/mood for lighting lookup
    const normalizedMood = (mood || 'balanced').toLowerCase()
    const lightingStyle = TONE_LIGHTING_STYLES[normalizedMood] || TONE_LIGHTING_STYLES.melancholic
    
    // =========================================================================
    // LAYER 1: SUBJECT & MICRO-EXPRESSION
    // Define protagonist with emotional state and physical stance
    // =========================================================================
    if (mainCharacterAppearance) {
      parts.push(`(Subject): ${mainCharacterAppearance}, standing perfectly still.`)
    } else if (protagonist) {
      parts.push(`(Subject): ${protagonist}, centered in frame with a contemplative expression.`)
    }
    
    // =========================================================================
    // LAYER 2: ENVIRONMENT & "THE TRAP"
    // Setting arranged to create visual enclosure/metaphor for story tension
    // =========================================================================
    if (setting) {
      // Create environmental composition that visually represents the story's tension
      parts.push(`(Environment): ${setting}.`)
      parts.push(`The background elements are arranged to visually frame and enclose the character, creating a sense of the story's central tension.`)
    }
    
    // Add visual metaphor from title if present (e.g., "Gilded Cage" = neon bars)
    if (title) {
      parts.push(`The composition subtly reflects the title "${title}" through visual metaphor in the environment.`)
    }
    
    // Antagonist in background if present (subtext layer)
    if (antagonistAppearance) {
      parts.push(`(Background subtext): ${antagonistAppearance} is visible in the deep background, slightly out of focus, observing the protagonist.`)
    } else if (antagonist) {
      parts.push(`(Background subtext): ${antagonist} is visible in the deep background, slightly out of focus.`)
    }
    
    // =========================================================================
    // LAYER 3: LIGHTING & ATMOSPHERE
    // Use tone to dictate color palette and emotional texture
    // =========================================================================
    parts.push(`(Lighting/Mood): Nighttime or dramatic lighting. ${lightingStyle}.`)
    
    // Visual style enhancement
    if (visualStyle) {
      parts.push(`Visual aesthetic: ${visualStyle}.`)
    }
    
    // Theme-based color story
    if (themes && themes.length > 0) {
      const themeList = themes.slice(0, 3).join(', ')
      parts.push(`The color palette reflects the themes of ${themeList}.`)
    }
    
    // =========================================================================
    // LAYER 4: CINEMATOGRAPHY & TECHNICAL SPECS
    // Professional camera/lens specs for film-quality output
    // =========================================================================
    parts.push(`(Cinematography): ${cinSpecs.camera}, ${cinSpecs.lens}, sharp focus on eyes.`)
    parts.push(`${cinSpecs.colorGrade}, 8K resolution, ultra-realistic texture.`)
    
    // Conflict dynamic for compositional tension
    if (conflictDynamic) {
      parts.push(`Central relationship tension: ${conflictDynamic}.`)
    }
    
    // Final technical requirements
    parts.push(`Cinematic movie poster composition, professional film quality, no text overlays, 16:9 aspect ratio.`)
    
    return parts.join(' ')
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
