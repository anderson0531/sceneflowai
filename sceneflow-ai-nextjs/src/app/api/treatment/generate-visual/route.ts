import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { put } from '@vercel/blob'
import { DEFAULT_PROMPT_TEMPLATES, TREATMENT_VISUAL_CREDITS } from '@/types/treatment-visuals'
import type { TreatmentMood, TreatmentVisuals, GeneratedImage, CharacterPortrait, ActAnchor } from '@/types/treatment-visuals'
import type { FilmTreatmentData } from '@/lib/types/reports'

interface GenerateVisualRequest {
  projectId: string
  treatment: FilmTreatmentData
  generateAll?: boolean
  visualType?: 'hero' | 'character' | 'act' | 'keyProp'
  visualId?: string | number
  mood?: TreatmentMood
}

// Build prompt based on mood
function buildPromptWithMood(basePrompt: string, mood: TreatmentMood): string {
  const moodModifiers: Record<TreatmentMood, string> = {
    dark: 'Dark, moody lighting with deep shadows, desaturated colors, noir aesthetic.',
    balanced: 'Natural balanced lighting, cinematic color grading.',
    light: 'Bright, airy lighting with warm tones, optimistic feel.',
    stylized: 'Highly stylized, bold colors, artistic interpretation, graphic novel aesthetic.'
  }
  
  return `${basePrompt} ${moodModifiers[mood]}`
}

// Generate hero image
async function generateHeroImage(
  treatment: FilmTreatmentData,
  mood: TreatmentMood,
  projectId: string
): Promise<GeneratedImage> {
  // Extract character details for accurate depiction
  const characters = (treatment as any).character_descriptions || []
  
  // DEBUG: Log character data availability for prompt validation
  console.log('[HeroImage] Character data received:', {
    hasCharacterDescriptions: characters.length > 0,
    characterCount: characters.length,
    hasTreatmentProtagonist: !!(treatment as any).protagonist,
    hasTreatmentAntagonist: !!(treatment as any).antagonist,
    treatmentTitle: treatment.title,
    hasLogline: !!treatment.logline,
    hasSetting: !!treatment.setting,
    hasTone: !!treatment.tone
  })
  
  if (characters.length === 0) {
    console.warn('[HeroImage] WARNING: No character_descriptions provided - hero image may lack accurate character depiction')
  }
  
  // Find protagonist
  const protagonist = characters.find((c: any) => 
    c.role?.toLowerCase()?.includes('protagonist') || 
    c.role?.toLowerCase()?.includes('lead') ||
    c.role?.toLowerCase()?.includes('main')
  ) || characters[0]
  
  // Find antagonist
  const antagonist = characters.find((c: any) => 
    c.role?.toLowerCase()?.includes('antagonist') || 
    c.role?.toLowerCase()?.includes('villain')
  )
  
  /**
   * Enhanced character appearance builder with emotional state extraction
   * and detailed physical description for cinematic hero images.
   * 
   * Follows the "Subject & Micro-Expression" layer of Layered Narrative Construction.
   */
  function buildCharacterAppearance(character: any, isProtagonist: boolean = false): string {
    if (!character) return ''
    
    const parts: string[] = []
    
    // Core physical attributes (maintain order for natural description)
    if (character.name) parts.push(character.name)
    
    // Age and ethnicity first for accurate representation
    if (character.ethnicity) parts.push(`${character.ethnicity} ethnicity`)
    if (character.age) parts.push(`${character.age} years old`)
    if (character.gender) parts.push(character.gender)
    
    // Build/physical presence
    if (character.build) parts.push(character.build + ' build')
    if (character.height) parts.push(character.height)
    
    // Hair styling (combine for natural flow)
    const hairParts: string[] = []
    if (character.hairColor) hairParts.push(character.hairColor)
    if (character.hairStyle) hairParts.push(character.hairStyle)
    if (hairParts.length > 0) parts.push(`${hairParts.join(' ')} hair`)
    
    // Distinctive features
    if (character.eyeColor) parts.push(`${character.eyeColor} eyes`)
    if (character.keyFeature) parts.push(character.keyFeature)
    if (character.distinguishingFeatures) parts.push(character.distinguishingFeatures)
    
    // Wardrobe - critical for establishing character
    if (character.defaultWardrobe) {
      parts.push(`wearing ${character.defaultWardrobe}`)
    } else if (character.wardrobe) {
      parts.push(`wearing ${character.wardrobe}`)
    }
    
    // MICRO-EXPRESSION: Emotional state from character arc or logline context
    // This is the "inner emptiness" or emotional weight the camera captures
    if (character.expression) {
      parts.push(`expression: ${character.expression}`)
    } else if (character.emotionalState) {
      parts.push(`expression: ${character.emotionalState}`)
    } else if (isProtagonist && treatment.logline) {
      // Infer emotional state from logline for protagonist
      const logline = treatment.logline.toLowerCase()
      if (logline.includes('heartbreak') || logline.includes('loss') || logline.includes('grief')) {
        parts.push('expression: hollow and introspective, look of profound regret')
      } else if (logline.includes('revenge') || logline.includes('justice')) {
        parts.push('expression: steely determination, simmering intensity')
      } else if (logline.includes('discover') || logline.includes('uncover') || logline.includes('search')) {
        parts.push('expression: searching gaze, restless curiosity')
      } else if (logline.includes('escape') || logline.includes('flee') || logline.includes('survive')) {
        parts.push('expression: haunted vigilance, survival instinct')
      } else if (logline.includes('love') || logline.includes('romance')) {
        parts.push('expression: vulnerable longing, guarded hope')
      }
    }
    
    // Physical stance for cinematic framing
    if (character.stance) {
      parts.push(character.stance)
    } else if (isProtagonist) {
      parts.push('standing perfectly still, staring directly through the camera lens')
    }
    
    // Fallback to description if no structured data
    if (parts.length <= 1 && character.description) {
      return character.name ? `${character.name} - ${character.description}` : character.description
    }
    
    return parts.join(', ')
  }
  
  const mainCharacterAppearance = buildCharacterAppearance(protagonist, true)
  const antagonistAppearance = buildCharacterAppearance(antagonist, false)
  
  // Log appearance strings for debugging
  console.log('[HeroImage] Character appearances built:', {
    protagonist: mainCharacterAppearance.substring(0, 100) + (mainCharacterAppearance.length > 100 ? '...' : ''),
    antagonist: antagonistAppearance.substring(0, 100) + (antagonistAppearance.length > 100 ? '...' : '')
  })
  
  // Extract themes - handle both array and string formats
  let themes: string[] = []
  if (treatment.themes) {
    if (Array.isArray(treatment.themes)) {
      themes = treatment.themes
    } else if (typeof treatment.themes === 'string') {
      themes = treatment.themes.split(',').map(t => t.trim())
    }
  }
  
  // Build conflict dynamic from character roles/relationships
  let conflictDynamic = ''
  if (protagonist && antagonist) {
    // Try to infer relationship from character data
    const protRole = protagonist.role || 'protagonist'
    const antRole = antagonist.role || 'antagonist'
    conflictDynamic = `${protagonist.name || 'protagonist'} (${protRole}) vs ${antagonist.name || 'antagonist'} (${antRole})`
  }
  
  const prompt = buildPromptWithMood(
    DEFAULT_PROMPT_TEMPLATES.heroImage({
      title: treatment.title || 'Untitled',
      genre: treatment.genre || 'drama',
      mood: treatment.tone || 'dramatic',
      setting: treatment.setting || '',
      synopsis: treatment.synopsis || treatment.logline || '',
      protagonist: treatment.protagonist || protagonist?.name || '',
      mainCharacterAppearance,
      antagonist: treatment.antagonist || antagonist?.name || '',
      antagonistAppearance,
      themes,
      visualStyle: treatment.visual_style || '',
      conflictDynamic
    }),
    mood
  )
  
  // Log final prompt for debugging hero image quality
  console.log('[HeroImage] Final prompt generated:', {
    promptLength: prompt.length,
    hasSubjectLayer: prompt.includes('(Subject)'),
    hasEnvironmentLayer: prompt.includes('(Environment)'),
    hasLightingLayer: prompt.includes('(Lighting/Mood)'),
    hasCinematographyLayer: prompt.includes('(Cinematography)'),
    promptPreview: prompt.substring(0, 300) + '...'
  })
  
  const base64Image = await generateImageWithGemini(prompt, {
    aspectRatio: '16:9',
    imageSize: '2K'
  })
  
  // Upload to blob storage
  const imageBuffer = Buffer.from(base64Image.split(',')[1] || base64Image, 'base64')
  const blob = await put(`treatment-visuals/${projectId}/hero-${Date.now()}.png`, imageBuffer, {
    access: 'public',
    contentType: 'image/png'
  })
  
  return {
    id: `hero-${projectId}-${Date.now()}`,
    url: blob.url,
    prompt,
    generatedAt: new Date().toISOString(),
    aspectRatio: '16:9',
    status: 'ready' as const
  }
}

// Generate character portrait
async function generateCharacterPortrait(
  character: { name: string; role?: string; description?: string; image_prompt?: string },
  treatment: FilmTreatmentData,
  mood: TreatmentMood,
  projectId: string
): Promise<CharacterPortrait> {
  const role = character.role?.toLowerCase() || 'supporting'
  const roleType = role.includes('protagonist') || role.includes('lead') || role.includes('hero') 
    ? 'protagonist' 
    : role.includes('antagonist') || role.includes('villain') 
      ? 'antagonist' 
      : 'supporting'
  
  const prompt = buildPromptWithMood(
    DEFAULT_PROMPT_TEMPLATES.characterPortrait({
      name: character.name,
      description: character.description || '',
      role: character.role || 'character',
      ethnicity: (character as any).ethnicity,
      age: (character as any).age
    }),
    mood
  )
  
  const base64Image = await generateImageWithGemini(prompt, {
    aspectRatio: '3:4',
    imageSize: '1K'
  })
  
  const imageBuffer = Buffer.from(base64Image.split(',')[1] || base64Image, 'base64')
  const blob = await put(`treatment-visuals/${projectId}/character-${character.name.replace(/\s+/g, '-')}-${Date.now()}.png`, imageBuffer, {
    access: 'public',
    contentType: 'image/png'
  })
  
  return {
    characterName: character.name,
    role: roleType,
    image: {
      id: `char-${character.name.replace(/\s+/g, '-')}-${Date.now()}`,
      url: blob.url,
      prompt,
      generatedAt: new Date().toISOString(),
      aspectRatio: '3:4',
      status: 'ready' as const
    }
  }
}

// Generate act anchor (establishing shot)
async function generateActAnchor(
  actNumber: 1 | 2 | 3,
  actContent: string,
  treatment: FilmTreatmentData,
  mood: TreatmentMood,
  projectId: string
): Promise<ActAnchor> {
  const prompt = buildPromptWithMood(
    DEFAULT_PROMPT_TEMPLATES.actEstablishing({
      actNumber,
      setting: treatment.setting || 'dramatic location',
      timeOfDay: 'day',
      mood: treatment.tone || 'dramatic',
      genre: treatment.genre || 'drama'
    }),
    mood
  )
  
  const base64Image = await generateImageWithGemini(prompt, {
    aspectRatio: '21:9', // Cinematic 2.39:1
    imageSize: '2K'
  })
  
  const imageBuffer = Buffer.from(base64Image.split(',')[1] || base64Image, 'base64')
  const blob = await put(`treatment-visuals/${projectId}/act${actNumber}-${Date.now()}.png`, imageBuffer, {
    access: 'public',
    contentType: 'image/png'
  })
  
  return {
    actNumber,
    title: `Act ${actNumber}`,
    establishingShot: {
      id: `act${actNumber}-${projectId}-${Date.now()}`,
      url: blob.url,
      prompt,
      generatedAt: new Date().toISOString(),
      aspectRatio: '21:9',
      status: 'ready' as const
    },
    description: actContent
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVisualRequest = await request.json()
    const { projectId, treatment, generateAll, visualType, visualId, mood = 'balanced' } = body
    
    if (!projectId || !treatment) {
      return NextResponse.json(
        { error: 'Missing projectId or treatment data' },
        { status: 400 }
      )
    }
    
    let visuals: Partial<TreatmentVisuals> = {
      id: `visuals-${projectId}`,
      projectId,
      mood,
      colorTemperature: 0,
      isGenerating: false,
      estimatedCredits: 0,
      creditsUsed: 0
    }
    
    // Generate all visuals
    if (generateAll) {
      // Hero image
      try {
        visuals.heroImage = await generateHeroImage(treatment, mood, projectId)
        visuals.creditsUsed = (visuals.creditsUsed || 0) + TREATMENT_VISUAL_CREDITS.heroImage
      } catch (error) {
        console.error('Failed to generate hero image:', error)
      }
      
      // Character portraits (first 4)
      const characters = treatment.character_descriptions?.slice(0, 4) || []
      visuals.characterPortraits = []
      for (const char of characters) {
        try {
          const portrait = await generateCharacterPortrait(char, treatment, mood, projectId)
          visuals.characterPortraits.push(portrait)
          visuals.creditsUsed = (visuals.creditsUsed || 0) + TREATMENT_VISUAL_CREDITS.characterPortrait
        } catch (error) {
          console.error(`Failed to generate portrait for ${char.name}:`, error)
        }
      }
      
      // Act anchors
      visuals.actAnchors = []
      const actBreakdown = treatment.act_breakdown || {}
      const acts: [1 | 2 | 3, string][] = [
        [1, actBreakdown.act1 || ''],
        [2, actBreakdown.act2 || ''],
        [3, actBreakdown.act3 || '']
      ]
      
      for (const [actNum, actContent] of acts) {
        if (actContent) {
          try {
            const anchor = await generateActAnchor(actNum, actContent, treatment, mood, projectId)
            visuals.actAnchors.push(anchor)
            visuals.creditsUsed = (visuals.creditsUsed || 0) + TREATMENT_VISUAL_CREDITS.actEstablishing
          } catch (error) {
            console.error(`Failed to generate act ${actNum} anchor:`, error)
          }
        }
      }
      
      visuals.lastGeneratedAt = new Date().toISOString()
    }
    // Generate single visual
    else if (visualType) {
      switch (visualType) {
        case 'hero':
          visuals.heroImage = await generateHeroImage(treatment, mood, projectId)
          visuals.creditsUsed = TREATMENT_VISUAL_CREDITS.heroImage
          break
          
        case 'character':
          const charIndex = typeof visualId === 'number' ? visualId : 0
          const char = treatment.character_descriptions?.[charIndex]
          if (char) {
            const portrait = await generateCharacterPortrait(char, treatment, mood, projectId)
            visuals.characterPortraits = [portrait]
            visuals.creditsUsed = TREATMENT_VISUAL_CREDITS.characterPortrait
          }
          break
          
        case 'act':
          const actNum = (typeof visualId === 'number' ? visualId : 1) as 1 | 2 | 3
          const actContent = treatment.act_breakdown?.[`act${actNum}` as keyof typeof treatment.act_breakdown] || ''
          if (actContent) {
            const anchor = await generateActAnchor(actNum, actContent as string, treatment, mood, projectId)
            visuals.actAnchors = [anchor]
            visuals.creditsUsed = TREATMENT_VISUAL_CREDITS.actEstablishing
          }
          break
      }
      
      visuals.lastGeneratedAt = new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      visuals
    })
    
  } catch (error) {
    console.error('Treatment visual generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate treatment visuals' },
      { status: 500 }
    )
  }
}
