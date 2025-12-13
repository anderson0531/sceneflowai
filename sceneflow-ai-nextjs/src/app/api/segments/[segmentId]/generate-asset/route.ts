import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { generateVideoWithVeo, waitForVideoCompletion, downloadVideoFile } from '@/lib/gemini/videoClient'
import { uploadImageToBlob, uploadVideoToBlob } from '@/lib/storage/blob'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxDuration = 300 // 5 minutes for video generation
export const runtime = 'nodejs'

interface GenerateAssetRequest {
  prompt: string
  genType: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'
  referenceImageIds?: string[]
  startFrameUrl?: string
  endFrameUrl?: string  // Veo 3.1: For Frame-to-Video (FTV) generation with end frame
  sourceVideoUrl?: string  // Veo 3.1: Source video URL for extension mode - Veo handles frame continuity automatically
  referenceImages?: Array<{ url: string; type: 'style' | 'character' }>  // Veo 3.1: Up to 3 reference images
  generationMethod?: 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF'  // Veo 3.1: Explicit generation method (EXT = extend from previous)
  sceneId: string
  projectId: string
  // Optional video settings from prompt builder
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const { segmentId } = await params
    const body: GenerateAssetRequest = await req.json()
    const { 
      prompt, 
      genType, 
      referenceImageIds, 
      startFrameUrl, 
      endFrameUrl,
      sourceVideoUrl,
      referenceImages,
      generationMethod,
      sceneId, 
      projectId,
      negativePrompt,
      duration,
      aspectRatio,
      resolution
    } = body

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!prompt || !genType || !sceneId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, genType, sceneId, projectId' },
        { status: 400 }
      )
    }

    console.log('[Segment Asset Generation] Generating asset for segment:', segmentId, 'Type:', genType)

    let assetUrl: string
    let assetType: 'video' | 'image'
    let lastFrameUrl: string | null = null

    if (genType === 'T2V' || genType === 'I2V') {
      // Video generation using Veo 3.1 (platform credentials)
      console.log('[Segment Asset Generation] Using Veo 3.1 for video generation')
      console.log('[Segment Asset Generation] Method:', generationMethod || genType)
      
      // Build video generation options based on generation method
      const videoOptions: any = {
        aspectRatio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        durationSeconds: (duration && [4, 6, 8].includes(duration)) ? duration as 4 | 6 | 8 : 8,
        negativePrompt: negativePrompt,
        personGeneration: 'allow_adult'
      }
      
      // Handle different Veo 3.1 generation methods
      const method = generationMethod || genType
      
      // Start Frame - used for I2V and FTV methods
      if ((method === 'I2V' || method === 'FTV') && startFrameUrl) {
        videoOptions.startFrame = startFrameUrl
        console.log('[Segment Asset Generation] Using start frame for', method)
      }
      
      // Source Video - used for EXT (extend) mode
      // Veo API handles frame continuity automatically - no FFmpeg needed
      if (method === 'EXT' && sourceVideoUrl) {
        videoOptions.sourceVideoUrl = sourceVideoUrl
        console.log('[Segment Asset Generation] Using source video for extension mode')
      }
      
      // End Frame - used for FTV (Frame-to-Video) only when end frame is provided
      // NOTE: Cannot use endFrame together with referenceImages per Veo 3.1 API constraints
      if (method === 'FTV' && endFrameUrl) {
        videoOptions.lastFrame = endFrameUrl
        console.log('[Segment Asset Generation] Using end frame for FTV')
      }
      
      // Reference Images - used for REF method (up to 3 images for style/character consistency)
      // NOTE: Cannot use referenceImages together with endFrame per Veo 3.1 API constraints
      if (method === 'REF' && referenceImages && referenceImages.length > 0) {
        // Pass the full reference image objects to preserve type information
        videoOptions.referenceImages = referenceImages.map(img => ({
          url: img.url,
          type: img.type  // 'style' or 'character' - videoClient will map to Veo's referenceType
        }))
        console.log('[Segment Asset Generation] Using', referenceImages.length, 'reference images')
        
        // REF can also include a start frame optionally
        if (startFrameUrl) {
          videoOptions.startFrame = startFrameUrl
        }
      }
      
      // Trigger video generation
      const veoResult = await generateVideoWithVeo(prompt, videoOptions)

      if (veoResult.status === 'FAILED') {
        throw new Error(veoResult.error || 'Video generation failed')
      }

      // If video is queued/processing, wait for completion (up to 4 minutes)
      let finalResult = veoResult
      if (veoResult.status === 'QUEUED' || veoResult.status === 'PROCESSING') {
        console.log('[Segment Asset Generation] Waiting for video completion...')
        finalResult = await waitForVideoCompletion(
          veoResult.operationName!,
          240, // 4 minutes max wait
          10   // Poll every 10 seconds
        )
      }

      if (finalResult.status !== 'COMPLETED' || !finalResult.videoUrl) {
        throw new Error(finalResult.error || 'Video generation did not complete')
      }

      // Handle file download if needed
      let videoBuffer: Buffer | null = null
      if (finalResult.videoUrl.startsWith('file:')) {
        console.log('[Segment Asset Generation] Downloading video from Files API...')
        videoBuffer = await downloadVideoFile(finalResult.videoUrl)
        if (!videoBuffer) {
          throw new Error('Failed to download video file')
        }
      }

      // Upload video to blob storage
      if (videoBuffer) {
        assetUrl = await uploadVideoToBlob(
          videoBuffer,
          `segments/${segmentId}-${Date.now()}.mp4`
        )
      } else if (finalResult.videoUrl.startsWith('http')) {
        // Download from URL and re-upload to our storage
        // Gemini Files API requires API key for authentication
        let fetchUrl = finalResult.videoUrl
        if (finalResult.videoUrl.includes('generativelanguage.googleapis.com')) {
          const apiKey = process.env.GEMINI_API_KEY
          if (apiKey) {
            // Add API key if URL doesn't already have one
            const url = new URL(finalResult.videoUrl)
            if (!url.searchParams.has('key')) {
              url.searchParams.set('key', apiKey)
            }
            fetchUrl = url.toString()
          }
        }
        console.log('[Segment Asset Generation] Downloading video from:', fetchUrl.replace(/key=[^&]+/, 'key=API_KEY'))
        const videoResponse = await fetch(fetchUrl)
        if (!videoResponse.ok) {
          console.error('[Segment Asset Generation] Video fetch failed:', videoResponse.status, videoResponse.statusText)
          throw new Error(`Failed to fetch video from Veo: ${videoResponse.status}`)
        }
        const videoArrayBuffer = await videoResponse.arrayBuffer()
        console.log('[Segment Asset Generation] Downloaded video size:', videoArrayBuffer.byteLength, 'bytes')
        assetUrl = await uploadVideoToBlob(
          Buffer.from(videoArrayBuffer),
          `segments/${segmentId}-${Date.now()}.mp4`
        )
      } else {
        // Use the URL directly if it's already a valid URL
        assetUrl = finalResult.videoUrl
      }
      
      assetType = 'video'

      // Extract last frame for I2V continuity
      try {
        lastFrameUrl = await extractAndStoreLastFrame(assetUrl, segmentId)
        console.log('[Segment Asset Generation] Extracted last frame:', lastFrameUrl)
      } catch (error) {
        console.error('[Segment Asset Generation] Failed to extract last frame:', error)
        // Continue without last frame - not critical
      }

    } else if (genType === 'T2I') {
      // Image generation using Gemini API
      const base64Image = await generateImageWithGemini(prompt, {
        aspectRatio: '16:9',
        numberOfImages: 1,
        imageSize: '2K',
        // TODO: Add reference images support when available
      })

      assetUrl = await uploadImageToBlob(
        base64Image,
        `segments/${segmentId}-${Date.now()}.png`
      )
      assetType = 'image'

    } else {
      return NextResponse.json(
        { error: 'UPLOAD type should be handled via upload endpoint' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      segmentId,
      assetUrl,
      assetType,
      lastFrameUrl,
      status: assetType === 'video' && assetUrl.startsWith('job:') ? 'QUEUED' : 'COMPLETE',
      jobId: assetType === 'video' && assetUrl.startsWith('job:') ? assetUrl.replace('job:', '') : undefined,
    })
  } catch (error: any) {
    console.error('[Segment Asset Generation] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate asset',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

