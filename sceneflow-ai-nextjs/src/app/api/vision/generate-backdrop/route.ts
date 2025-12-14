import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  BackdropMode, 
  getPersonGenerationForMode, 
  getNegativePromptForMode 
} from '@/lib/vision/backdropGenerator'

export const runtime = 'nodejs'
export const maxDuration = 60

interface GenerateBackdropRequest {
  prompt: string
  mode: BackdropMode
  sourceSceneNumber?: number
  characterId?: string
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

/**
 * Generate a backdrop image using Gemini 3.0
 * Supports 4 modes: atmospheric, portrait, master, animatic
 * Uses personGeneration settings based on mode
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateBackdropRequest = await req.json()
    const { 
      prompt, 
      mode = 'master',
      sourceSceneNumber,
      characterId,
      aspectRatio = '16:9',
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      )
    }

    console.log(`[Backdrop Generation] Mode: ${mode}, Scene: ${sourceSceneNumber}`)
    console.log(`[Backdrop Generation] Prompt: ${prompt.substring(0, 200)}...`)

    // Get mode-specific settings
    const personGeneration = getPersonGenerationForMode(mode)
    const negativePrompt = getNegativePromptForMode(mode)

    console.log(`[Backdrop Generation] personGeneration: ${personGeneration}`)

    // Generate image using Gemini 3.0
    const base64Image = await generateImageWithGemini(prompt, {
      aspectRatio,
      numberOfImages: 1,
      imageSize: '2K',
      personGeneration,
      negativePrompt: negativePrompt || undefined,
    })

    console.log('[Backdrop Generation] Image generated, uploading to storage...')

    // Upload to blob storage
    const filename = `backdrops/${mode}-scene${sourceSceneNumber || 'unknown'}-${Date.now()}.png`
    const imageUrl = await uploadImageToBlob(base64Image, filename)

    console.log('[Backdrop Generation] Upload complete:', imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      mode,
      sourceSceneNumber,
      characterId,
    })

  } catch (error: any) {
    console.error('[Backdrop Generation] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate backdrop',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
