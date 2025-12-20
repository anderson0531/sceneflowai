import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { generateVideoWithVeo, waitForVideoCompletion, downloadVideoFile } from '@/lib/gemini/videoClient'
import { uploadImageToBlob, uploadVideoToBlob } from '@/lib/storage/blob'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  getMethodWithFallback, 
  buildMethodSelectionContext,
  VideoGenerationMethod,
  MethodSelectionResult
} from '@/lib/vision/intelligentMethodSelection'

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
  generationMethod?: 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF' | 'AUTO'  // Veo 3.1: Explicit generation method (AUTO = intelligent selection)
  sceneId: string
  projectId: string
  // Optional video settings from prompt builder
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
  // Context for intelligent method selection
  segmentIndex?: number
  totalSegments?: number
  sceneImageUrl?: string
  previousSegmentAssetUrl?: string
  previousSegmentVeoRef?: string
  isEstablishingShot?: boolean
  // Audio context for atmospheric guidance (Veo 3.1 supports voice/SFX)
  audioContext?: {
    hasNarration?: boolean
    narrationText?: string
    emotionalTone?: string
    dialogueBeat?: string
    suggestedAtmosphere?: string
  }
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
      resolution,
      // Context for intelligent method selection
      segmentIndex = 0,
      totalSegments = 1,
      sceneImageUrl,
      previousSegmentAssetUrl,
      previousSegmentVeoRef,
      isEstablishingShot = false,
      // Audio context for atmospheric guidance
      audioContext
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
    let veoVideoRef: string | undefined = undefined  // Store Veo video reference for video extension
    let methodSelectionResult: MethodSelectionResult | undefined = undefined  // Store method selection details

    if (genType === 'T2V' || genType === 'I2V') {
      // Video generation using Veo 3.1 (platform credentials)
      console.log('[Segment Asset Generation] Using Veo 3.1 for video generation')
      
      // Intelligent Method Selection
      // Build context for method selection
      const methodContext = buildMethodSelectionContext(
        {
          segmentId,
          sequenceIndex: segmentIndex,
          generatedPrompt: prompt,
          isEstablishingShot,
          references: {
            startFrameUrl,
            characterIds: referenceImages?.filter(r => r.type === 'character').map((_, i) => `char-${i}`) || [],
          }
        },
        { imageUrl: sceneImageUrl },
        previousSegmentAssetUrl ? {
          activeAssetUrl: previousSegmentAssetUrl,
          takes: previousSegmentVeoRef ? [{ veoVideoRef: previousSegmentVeoRef }] : []
        } : undefined,
        totalSegments,
        referenceImages?.filter(r => r.type === 'character').map(r => r.url) || []
      )
      
      // Get optimal method (handles AUTO and validates user-selected methods)
      const requestedMethod = (generationMethod || genType) as VideoGenerationMethod
      methodSelectionResult = getMethodWithFallback(requestedMethod, methodContext)
      const effectiveMethod = methodSelectionResult.method
      
      console.log('[Segment Asset Generation] Requested method:', requestedMethod)
      console.log('[Segment Asset Generation] Effective method:', effectiveMethod)
      console.log('[Segment Asset Generation] Selection confidence:', methodSelectionResult.confidence)
      console.log('[Segment Asset Generation] Reasoning:', methodSelectionResult.reasoning)
      
      if (methodSelectionResult.warnings) {
        methodSelectionResult.warnings.forEach(w => console.warn('[Segment Asset Generation] Warning:', w))
      }
      
      // Build video generation options based on effective method
      const videoOptions: any = {
        aspectRatio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        durationSeconds: (duration && [4, 6, 8].includes(duration)) ? duration as 4 | 6 | 8 : 8,
        negativePrompt: negativePrompt,
        personGeneration: 'allow_adult'
      }
      
      // Handle different Veo 3.1 generation methods based on EFFECTIVE method
      const method = effectiveMethod
      
      // Start Frame - used for I2V and FTV methods
      if ((method === 'I2V' || method === 'FTV') && startFrameUrl) {
        videoOptions.startFrame = startFrameUrl
        console.log('[Segment Asset Generation] Using start frame for', method)
      }
      
      // EXT (Extend) mode: Veo video extension only works with videos still in Gemini's system.
      // For our workflow (videos in Vercel Blob), we use I2V with the last frame instead.
      // The SegmentPromptBuilder passes lastFrameUrl as startFrameUrl for EXT mode.
      if (method === 'EXT' && startFrameUrl) {
        videoOptions.startFrame = startFrameUrl
        console.log('[Segment Asset Generation] Using last frame as start frame for EXT mode (I2V fallback)')
      }
      
      // End Frame - used for FTV (Frame-to-Video/Interpolation) mode
      // FTV requires BOTH startFrame AND lastFrame for proper interpolation
      // NOTE: Cannot use endFrame together with referenceImages per Veo 3.1 API constraints
      if (method === 'FTV') {
        if (endFrameUrl) {
          videoOptions.lastFrame = endFrameUrl
          console.log('[Segment Asset Generation] Using end frame for FTV interpolation')
        } else {
          // FTV without endFrame will behave like I2V - warn the user
          console.warn('[Segment Asset Generation] WARNING: FTV mode requested but no endFrameUrl provided')
          console.warn('[Segment Asset Generation] FTV requires both startFrame AND lastFrame for interpolation')
          console.warn('[Segment Asset Generation] Falling back to I2V behavior (start frame only)')
          // Add warning to method selection result for UI feedback
          if (!methodSelectionResult.warnings) {
            methodSelectionResult.warnings = []
          }
          methodSelectionResult.warnings.push(
            'FTV mode requires an ending frame for interpolation. Without it, the video will animate from the start frame only (I2V behavior).'
          )
        }
      }
      
      // Reference Images - used for REF method (up to 3 images for style/character consistency)
      // IMPORTANT: referenceImages is T2V only - CANNOT be combined with startFrame (I2V)
      // Per Veo 3.1 API: referenceImages guides T2V generation, it's NOT compatible with image parameter
      if (method === 'REF' && referenceImages && referenceImages.length > 0) {
        // Pass the full reference image objects to preserve type information
        videoOptions.referenceImages = referenceImages.map(img => ({
          url: img.url,
          type: img.type  // 'style' or 'character' - videoClient will map to Veo's referenceType
        }))
        console.log('[Segment Asset Generation] Using', referenceImages.length, 'reference images (T2V mode)')
        
        // NOTE: Do NOT add startFrame here - referenceImages is T2V only, not compatible with I2V
        // If user wants I2V with character consistency, they should use I2V mode without referenceImages
      }
      
      // Enhance prompt with audio context for atmospheric guidance
      // Veo 3.1 supports voice and SFX, so we can guide the atmosphere
      let enhancedPrompt = prompt
      if (audioContext) {
        const atmosphericGuidance: string[] = []
        
        if (audioContext.emotionalTone) {
          atmosphericGuidance.push(`Emotional atmosphere: ${audioContext.emotionalTone}`)
        }
        if (audioContext.suggestedAtmosphere) {
          atmosphericGuidance.push(`Visual mood: ${audioContext.suggestedAtmosphere}`)
        }
        if (audioContext.hasNarration && audioContext.narrationText) {
          // Add a subtle note about the narration context without overwhelming the visual prompt
          atmosphericGuidance.push(`Scene accompanies narration about: ${audioContext.narrationText.slice(0, 100)}...`)
        }
        if (audioContext.dialogueBeat) {
          atmosphericGuidance.push(`Dialogue moment: ${audioContext.dialogueBeat}`)
        }
        
        if (atmosphericGuidance.length > 0) {
          enhancedPrompt = `${prompt}\n\n[Audio-Visual Sync Context]\n${atmosphericGuidance.join('\n')}`
          console.log('[Segment Asset Generation] Enhanced prompt with audio context')
        }
      }
      
      // Trigger video generation
      const veoResult = await generateVideoWithVeo(enhancedPrompt, videoOptions)

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
      } else if (finalResult.videoUrl.startsWith('data:video/')) {
        // Handle inline base64 video data from Veo 3.1
        console.log('[Segment Asset Generation] Processing inline base64 video data...')
        const base64Match = finalResult.videoUrl.match(/^data:video\/[^;]+;base64,(.+)$/)
        if (base64Match) {
          videoBuffer = Buffer.from(base64Match[1], 'base64')
          console.log('[Segment Asset Generation] Decoded video buffer size:', videoBuffer.length, 'bytes')
        } else {
          throw new Error('Invalid base64 video data format')
        }
      }

      // Upload video to blob storage
      if (videoBuffer) {
        console.log('[Segment Asset Generation] Uploading video buffer to blob storage...')
        assetUrl = await uploadVideoToBlob(
          videoBuffer,
          `segments/${segmentId}-${Date.now()}.mp4`
        )
        console.log('[Segment Asset Generation] Video uploaded to:', assetUrl.substring(0, 100))
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
      
      // Store Veo video reference for future video extension
      // This allows using Veo's native video extension with this video
      veoVideoRef = finalResult.veoVideoRef
      if (veoVideoRef) {
        console.log('[Segment Asset Generation] Stored Veo video reference:', veoVideoRef)
      }

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
      veoVideoRef,  // Gemini Files API reference for video extension
      status: assetType === 'video' && assetUrl.startsWith('job:') ? 'QUEUED' : 'COMPLETE',
      jobId: assetType === 'video' && assetUrl.startsWith('job:') ? assetUrl.replace('job:', '') : undefined,
      // Method selection info for UI feedback
      methodSelection: methodSelectionResult ? {
        method: methodSelectionResult.method,
        confidence: methodSelectionResult.confidence,
        reasoning: methodSelectionResult.reasoning,
        warnings: methodSelectionResult.warnings,
      } : undefined,
    })
  } catch (error: any) {
    console.error('[Segment Asset Generation] Error:', error)
    
    // Parse and simplify Vertex AI error messages
    let errorMessage = error.message || 'Failed to generate asset'
    
    // Extract cleaner error from Vertex AI JSON responses
    if (errorMessage.includes('Vertex AI error')) {
      try {
        // Try to parse the JSON error from Vertex AI
        const jsonMatch = errorMessage.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.error?.message) {
            errorMessage = `Vertex AI: ${parsed.error.message}`
          }
        }
      } catch {
        // Keep original message if parsing fails
      }
    }
    
    // Handle common error types with user-friendly messages
    if (errorMessage.includes('Content Safety Filter') || errorMessage.includes('filtered')) {
      errorMessage = 'Content Safety Filter: The prompt was flagged by safety policies. Try adjusting the prompt to be less dramatic or violent.'
    } else if (errorMessage.includes('Invalid JSON payload') || errorMessage.includes('INVALID_ARGUMENT')) {
      errorMessage = 'API Error: Invalid request format. Please try a different generation method.'
    } else if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = 'Rate limit reached. Please wait a moment and try again.'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
      errorMessage = 'Request timed out. The video generation is taking too long. Please try again.'
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    )
  }
}


