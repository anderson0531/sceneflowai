import { NextRequest, NextResponse } from 'next/server'
import { 
  generateVideoWithGeminiStudio, 
  waitForGeminiVideoCompletion, 
  downloadGeminiVideoFile 
} from '@/lib/gemini/geminiStudioVideoClient'
import { uploadVideoToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BACKDROP_MODES, BackdropMode } from '@/lib/vision/backdropGenerator'

export const maxDuration = 300 // 5 minutes for video generation
export const runtime = 'nodejs'

interface GenerateBackdropVideoRequest {
  prompt: string
  mode: BackdropMode
  sourceSceneNumber?: number
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
}

export async function POST(req: NextRequest) {
  try {
    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateBackdropVideoRequest = await req.json()
    const { 
      prompt, 
      mode = 'master',
      sourceSceneNumber,
      negativePrompt,
      duration = 5,
      aspectRatio = '16:9',
    } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const modeConfig = BACKDROP_MODES[mode]
    
    // Build enhanced prompt with style modifiers
    let enhancedPrompt = prompt
    
    // Add style modifiers from the selected mode
    if (modeConfig.styleModifiers.length > 0) {
      const styleNote = modeConfig.styleModifiers.join(', ')
      enhancedPrompt = `${prompt}. Style: ${styleNote}.`
    }
    
    // Add lens if specified
    if (modeConfig.lensDefault) {
      enhancedPrompt = `${enhancedPrompt} Shot with ${modeConfig.lensDefault}.`
    }

    console.log('[Generate Backdrop Video] Mode:', mode, 'Scene:', sourceSceneNumber)
    console.log('[Generate Backdrop Video] Enhanced prompt:', enhancedPrompt)

    // Generate video using Veo 3.1 via Gemini Studio API (T2V mode - no start frame)
    const veoResult = await generateVideoWithGeminiStudio(enhancedPrompt, {
      negativePrompt: negativePrompt || modeConfig.negativePrompt,
      aspectRatio,
      durationSeconds: Math.min(duration, 8) as 4 | 6 | 8, // Veo 3.1 supports up to 8s
      personGeneration: modeConfig.allowPeople ? 'allow_adult' : 'dont_allow',
    })

    if (veoResult.status === 'FAILED') {
      throw new Error(veoResult.error || 'Video generation failed')
    }

    console.log('[Generate Backdrop Video] Waiting for completion:', veoResult.operationName)
    
    // Wait for video to complete
    let finalResult = veoResult
    if (veoResult.status === 'QUEUED' || veoResult.status === 'PROCESSING') {
      finalResult = await waitForGeminiVideoCompletion(veoResult.operationName!, 240, 10)
    }
    
    if (finalResult.status !== 'COMPLETED' || !finalResult.videoUrl) {
      throw new Error(finalResult.error || 'Video generation did not complete')
    }

    console.log('[Generate Backdrop Video] Video generated, downloading...')

    // Download the video from Gemini
    let videoBuffer: Buffer
    if (finalResult.videoUrl.startsWith('file:')) {
      const downloaded = await downloadGeminiVideoFile(finalResult.videoUrl)
      if (!downloaded) {
        throw new Error('Failed to download video file')
      }
      videoBuffer = downloaded
    } else {
      // Download from HTTP URL
      const videoResponse = await fetch(finalResult.videoUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`)
      }
      videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
    }

    // Upload to Vercel Blob
    const filename = `backdrop-${mode}-${sourceSceneNumber || 'unknown'}-${Date.now()}.mp4`
    const videoUrl = await uploadVideoToBlob(videoBuffer, filename)

    console.log('[Generate Backdrop Video] Uploaded to blob:', videoUrl)

    return NextResponse.json({
      success: true,
      videoUrl,
      duration: duration,
      mode,
      operationName: finalResult.operationName,
    })
  } catch (error: any) {
    console.error('[Generate Backdrop Video] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate backdrop video' },
      { status: 500 }
    )
  }
}
