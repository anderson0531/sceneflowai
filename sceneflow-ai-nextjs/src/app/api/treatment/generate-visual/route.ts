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
  const prompt = buildPromptWithMood(
    DEFAULT_PROMPT_TEMPLATES.heroImage
      .replace('{title}', treatment.title || 'Untitled')
      .replace('{genre}', treatment.genre || 'drama')
      .replace('{tone}', treatment.tone || 'dramatic')
      .replace('{logline}', treatment.logline || treatment.synopsis?.slice(0, 200) || ''),
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
    DEFAULT_PROMPT_TEMPLATES.characterPortrait
      .replace('{name}', character.name)
      .replace('{role}', character.role || 'character')
      .replace('{description}', character.description || '')
      .replace('{genre}', treatment.genre || 'drama')
      .replace('{visualStyle}', treatment.visual_style || 'cinematic'),
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
    DEFAULT_PROMPT_TEMPLATES.actEstablishing
      .replace('{actNumber}', String(actNumber))
      .replace('{setting}', treatment.setting || 'dramatic location')
      .replace('{actSummary}', actContent.slice(0, 300))
      .replace('{visualStyle}', treatment.visual_style || 'cinematic')
      .replace('{tone}', treatment.tone || 'dramatic'),
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
