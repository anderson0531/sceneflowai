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
  
  // Helper function to build character appearance string from physical attributes
  function buildCharacterAppearance(character: any): string {
    if (!character) return ''
    
    const parts: string[] = []
    if (character.ethnicity) parts.push(character.ethnicity)
    if (character.age) parts.push(`${character.age} year old`)
    if (character.build) parts.push(character.build)
    if (character.hairColor && character.hairStyle) {
      parts.push(`${character.hairColor} ${character.hairStyle} hair`)
    }
    if (character.keyFeature) parts.push(character.keyFeature)
    if (character.expression) parts.push(character.expression)
    if (character.defaultWardrobe) parts.push(`wearing ${character.defaultWardrobe}`)
    
    if (parts.length > 0) {
      // Include character name at the start for context
      const namePrefix = character.name ? `${character.name} - ` : ''
      return namePrefix + parts.join(', ')
    } else if (character.description) {
      const namePrefix = character.name ? `${character.name} - ` : ''
      return namePrefix + character.description
    }
    return character.name || ''
  }
  
  const mainCharacterAppearance = buildCharacterAppearance(protagonist)
  const antagonistAppearance = buildCharacterAppearance(antagonist)
  
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
