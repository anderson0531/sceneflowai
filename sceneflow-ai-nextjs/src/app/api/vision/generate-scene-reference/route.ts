import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

interface GenerateSceneReferenceRequest {
  prompt: string
  name: string
  description?: string
  sourceSceneNumber?: number
  aspectRatio?: '16:9' | '9:16' | '1:1'
  negativePrompt?: string
}

/**
 * Generate a scene reference image using Gemini 3.0
 * Uses personGeneration: 'dont_allow' to ensure no people are generated
 * This creates clean environment/location references for video generation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateSceneReferenceRequest = await req.json()
    const { 
      prompt, 
      name, 
      description, 
      sourceSceneNumber,
      aspectRatio = '16:9',
      negativePrompt = 'people, characters, faces, crowds, humans, persons, figures'
    } = body

    if (!prompt || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, name' },
        { status: 400 }
      )
    }

    console.log('[Scene Reference Generation] Generating scene reference:', name)
    console.log('[Scene Reference Generation] Prompt:', prompt.substring(0, 200))
    console.log('[Scene Reference Generation] Source scene:', sourceSceneNumber)

    // Enhance prompt to explicitly exclude people
    const enhancedPrompt = `${prompt}

Environment only. No people, no characters, no human figures. Empty scene showing only the location, props, lighting, and atmosphere.`

    // Generate image using Gemini 3.0 with personGeneration: 'dont_allow'
    const base64Image = await generateImageWithGemini(enhancedPrompt, {
      aspectRatio: aspectRatio,
      numberOfImages: 1,
      imageSize: '2K',
      personGeneration: 'dont_allow',  // Critical: ensures no people in scene reference
      negativePrompt: negativePrompt,
    })

    console.log('[Scene Reference Generation] Image generated, uploading to storage...')

    // Upload to blob storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `scene-references/${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`
    )

    console.log('[Scene Reference Generation] Upload complete:', imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      name,
      description,
      sourceSceneNumber,
    })

  } catch (error: any) {
    console.error('[Scene Reference Generation] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate scene reference',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
