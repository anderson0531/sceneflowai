import { NextRequest, NextResponse } from 'next/server'
import { VideoGenerationGateway } from '@/services/VideoGenerationGateway'
import { StandardVideoRequest } from '@/services/ai-providers/BaseAIProviderAdapter'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'

export const maxDuration = 300 // 5 minutes for video generation
export const runtime = 'nodejs'

interface GenerateAssetRequest {
  prompt: string
  genType: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'
  referenceImageIds?: string[]
  startFrameUrl?: string
  sceneId: string
  projectId: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const { segmentId } = await params
    const body: GenerateAssetRequest = await req.json()
    const { prompt, genType, referenceImageIds, startFrameUrl, sceneId, projectId } = body

    // Get user session for BYOK credentials
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

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
      // Video generation using Veo
      const videoGateway = VideoGenerationGateway.getInstance()
      
      // Get user's video provider config (BYOK)
      // For now, default to GOOGLE_VEO if available
      const providerName = AIProvider.GOOGLE_VEO // TODO: Get from user's BYOK config
      
      // Build video generation request
      const videoRequest: StandardVideoRequest = {
        prompt: prompt,
        duration: 8, // Default segment duration, can be adjusted
        resolution: '1920x1080',
        aspect_ratio: '16:9',
        motion_intensity: 5, // Default motion intensity
        quality: 'standard',
        // For I2V, pass startFrame through custom_settings
        custom_settings: genType === 'I2V' && startFrameUrl
          ? { startFrame: startFrameUrl, referenceImages: referenceImageIds || [] }
          : { referenceImages: referenceImageIds || [] },
      }

      // Generate video
      const result = await videoGateway.trigger_generation(
        userId,
        videoRequest,
        providerName
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Video generation failed')
      }

      // Video generation is async - we get a job ID
      // For now, return the job ID and status
      // In production, you'd poll for completion or use webhooks
      const jobId = result.data.provider_job_id
      assetUrl = result.data.video_url || `job:${jobId}` // Placeholder until video is ready
      assetType = 'video'

      // Note: Last frame extraction will happen asynchronously when video completes
      // This should be handled via webhook or polling mechanism
      // For now, we'll extract it if the video is immediately available
      if (result.data.status === 'COMPLETED' && result.data.video_url) {
        try {
          lastFrameUrl = await extractAndStoreLastFrame(result.data.video_url, segmentId)
          console.log('[Segment Asset Generation] Extracted last frame:', lastFrameUrl)
        } catch (error) {
          console.error('[Segment Asset Generation] Failed to extract last frame:', error)
          // Continue without last frame - not critical
        }
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

