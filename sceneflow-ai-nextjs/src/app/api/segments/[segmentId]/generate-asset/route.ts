import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { 
  generateProductionVideo, 
  waitForProductionVideoCompletion, 
  downloadProductionVideo,
  getEndpointStatus,
  type ProductionVideoResult
} from '@/lib/gemini/productionVideoClient'
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
  // Guide prompt containing voice/dialogue/SFX cues for Veo 3.1 native audio
  // Composed by GuidePromptEditor with proper voice anchors and Veo formatting
  guidePrompt?: string
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
      audioContext,
      // Guide prompt with voice/dialogue/SFX cues for Veo 3.1 native audio
      guidePrompt
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
    let veoVideoRefExpiry: string | undefined = undefined  // ISO timestamp when veoVideoRef expires (48 hours)
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
      
      // Handle different Veo 3.1 generation methods based on EFFECTIVE method
      const method = effectiveMethod
      
      // Determine if this is an image-based generation method
      // T2V: allow_all ONLY
      // I2V, FTV, EXT, REF (with images): allow_adult ONLY
      const isImageBasedMethod = method === 'I2V' || method === 'FTV' || method === 'EXT' || 
        (method === 'REF' && referenceImages && referenceImages.length > 0)
      
      // Duration constraints:
      // - FTV (interpolation) requires duration = 8
      // - REF (reference images) requires duration = 8  
      // - 1080p resolution requires duration = 8
      // - Otherwise, snap to valid values: 4, 6, or 8
      const requiresDuration8 = method === 'FTV' || 
        (method === 'REF' && referenceImages && referenceImages.length > 0) ||
        (resolution === '1080p')
      
      let effectiveDuration: 4 | 6 | 8 = 8
      if (requiresDuration8) {
        effectiveDuration = 8
        if (duration && duration !== 8) {
          console.log(`[Segment Asset Generation] Duration forced to 8s (required for ${method === 'FTV' ? 'FTV interpolation' : method === 'REF' ? 'reference images' : '1080p resolution'})`)
        }
      } else if (duration) {
        // Snap to nearest valid value: 4, 6, or 8
        if (duration <= 5) effectiveDuration = 4
        else if (duration <= 7) effectiveDuration = 6
        else effectiveDuration = 8
      }
      
      // Build video generation options based on effective method
      const videoOptions: any = {
        aspectRatio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        durationSeconds: effectiveDuration,
        negativePrompt: negativePrompt,
        personGeneration: isImageBasedMethod ? 'allow_adult' : 'allow_all'
      }
      
      console.log(`[Segment Asset Generation] personGeneration: ${videoOptions.personGeneration} (method: ${method}, isImageBased: ${isImageBasedMethod})`)
      console.log(`[Segment Asset Generation] durationSeconds: ${effectiveDuration} (requested: ${duration || 'default'})`)
      
      // Start Frame - used for I2V and FTV methods
      if ((method === 'I2V' || method === 'FTV') && startFrameUrl) {
        videoOptions.startFrame = startFrameUrl
        console.log('[Segment Asset Generation] Using start frame for', method)
      }
      
      // EXT (Extend) mode: True video extension using Veo's native capability
      // Priority 1: Use sourceVideoUrl if provided (from Video Editor - user selected a specific take)
      // Priority 2: Use previousSegmentVeoRef if available (auto-extend from previous segment)
      // Priority 3: Fall back to I2V with the last frame as start frame
      if (method === 'EXT') {
        // Determine which veoVideoRef to use - explicit selection takes priority
        const veoRefToUse = sourceVideoUrl || previousSegmentVeoRef
        
        if (veoRefToUse) {
          // True video extension - use the Veo video reference from selected take or previous generation
          // This only works if the video is still in Gemini's 2-day cache
          videoOptions.sourceVideo = veoRefToUse
          console.log('[Segment Asset Generation] Using TRUE EXT mode with Veo video reference:', veoRefToUse)
          console.log('[Segment Asset Generation] Source:', sourceVideoUrl ? 'Video Editor selection' : 'Previous segment auto-chain')
          // Note: When using sourceVideo, we don't need startFrame - Veo continues from where the video left off
        } else if (startFrameUrl) {
          // Fallback: No Veo reference available (video too old or from external source)
          // Use I2V mode with the last frame as the start frame
          videoOptions.startFrame = startFrameUrl
          console.log('[Segment Asset Generation] EXT mode fallback: Using I2V with last frame (no valid veoVideoRef)')
          console.log('[Segment Asset Generation] Tip: For seamless extension, generate videos back-to-back within 48 hours')
        } else {
          console.warn('[Segment Asset Generation] EXT mode requested but no veoVideoRef or startFrameUrl available')
          console.warn('[Segment Asset Generation] Falling back to T2V mode')
        }
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
      
      // Enhance prompt with guidePrompt for Veo 3.1 native voice/dialogue/SFX generation
      // The guidePrompt contains properly formatted audio cues from GuidePromptEditor:
      // - Dialogue with voice anchors: CHARACTER says with [voice type]: "dialogue text"
      // - Narration with voice anchors: Narrator in [voice type] says: "narration text"
      // - SFX/Ambience: Ambient: sound description
      let enhancedPrompt = prompt
      if (guidePrompt && guidePrompt.trim()) {
        // Append guidePrompt to visual prompt - Veo 3.1 will generate synchronized audio
        enhancedPrompt = `${prompt}\n\n${guidePrompt}`
        console.log('[Segment Asset Generation] Enhanced prompt with guidePrompt for voice/SFX generation')
        console.log('[Segment Asset Generation] Guide prompt length:', guidePrompt.length, 'chars')
      }
      
      // Additional atmospheric guidance from audioContext (legacy support)
      // Veo 3.1 supports voice and SFX, so we can guide the atmosphere
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
      
      // Trigger video generation using Production Video Client
      // Automatically uses Vertex AI with multi-region failover, falls back to Gemini API
      console.log('[Segment Asset Generation] Using Production Video Client for Veo 3.1')
      console.log('[Segment Asset Generation] Endpoint status:', JSON.stringify(getEndpointStatus()))
      const veoResult = await generateProductionVideo(enhancedPrompt, videoOptions)

      if (veoResult.status === 'FAILED') {
        // Check if this is a rate limit error - return 429 instead of 500
        if (veoResult.error?.toLowerCase().includes('rate limit')) {
          const waitSeconds = (veoResult as any).estimatedWaitSeconds || 60
          console.log('[Segment Asset Generation] Rate limited, returning 429 with retry after:', waitSeconds, 'seconds')
          return NextResponse.json(
            { 
              error: veoResult.error,
              retryAfter: waitSeconds,
              isRateLimited: true
            },
            { status: 429 }
          )
        }
        throw new Error(veoResult.error || 'Video generation failed')
      }

      // If video is queued/processing, wait for completion (up to 4 minutes)
      let finalResult: ProductionVideoResult = veoResult
      if (veoResult.status === 'QUEUED' || veoResult.status === 'PROCESSING') {
        console.log('[Segment Asset Generation] Waiting for video completion...')
        console.log('[Segment Asset Generation] Provider:', veoResult.provider, 'Region:', veoResult.region)
        finalResult = await waitForProductionVideoCompletion(
          veoResult.operationName!,
          veoResult.provider, // Route to correct provider
          240, // 4 minutes max wait
          10   // Poll every 10 seconds
        )
        
        // Check if Vertex AI returned a content policy error during polling
        // If so, retry with Gemini API (more permissive consumer classifier)
        if (finalResult.status === 'FAILED' && finalResult.provider === 'vertex' && finalResult.error) {
          const errorLower = finalResult.error.toLowerCase()
          const isContentPolicyError = 
            errorLower.includes('usage guidelines') ||
            errorLower.includes('content policy') ||
            errorLower.includes('safety') ||
            errorLower.includes('policy violation') ||
            errorLower.includes('blocked') ||
            errorLower.includes('prohibited') ||
            finalResult.error.includes('Code 3') // Vertex AI content policy error code
          
          if (isContentPolicyError) {
            console.log('[Segment Asset Generation] Vertex AI content policy error, retrying with Gemini API...')
            console.log('[Segment Asset Generation] Original error:', finalResult.error)
            
            // Retry with Gemini API (forceProvider: 'gemini')
            const geminiResult = await generateProductionVideo(enhancedPrompt, {
              ...videoOptions,
              forceProvider: 'gemini'
            })
            
            if (geminiResult.status === 'FAILED') {
              throw new Error(geminiResult.error || 'Video generation failed with both Vertex AI and Gemini')
            }
            
            // Wait for Gemini completion if needed
            if (geminiResult.status === 'QUEUED' || geminiResult.status === 'PROCESSING') {
              console.log('[Segment Asset Generation] Waiting for Gemini video completion...')
              finalResult = await waitForProductionVideoCompletion(
                geminiResult.operationName!,
                'gemini',
                240,
                10
              )
            } else {
              finalResult = geminiResult
            }
            
            console.log('[Segment Asset Generation] Gemini fallback result:', finalResult.status)
          }
        }
      }

      if (finalResult.status !== 'COMPLETED' || !finalResult.videoUrl) {
        throw new Error(finalResult.error || 'Video generation did not complete')
      }

      // Handle file download if needed
      let videoBuffer: Buffer | null = null
      if (finalResult.videoUrl.startsWith('file:')) {
        console.log('[Segment Asset Generation] Downloading video from Files API...')
        console.log('[Segment Asset Generation] Provider:', finalResult.provider)
        videoBuffer = await downloadProductionVideo(finalResult.videoUrl, finalResult.provider)
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
      veoVideoRefExpiry = finalResult.veoVideoRefExpiry
      if (veoVideoRef) {
        console.log('[Segment Asset Generation] Stored Veo video reference:', veoVideoRef)
        if (finalResult.veoVideoRefExpiry) {
          console.log('[Segment Asset Generation] Veo reference expires:', finalResult.veoVideoRefExpiry)
        }
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
      veoVideoRefExpiry,  // ISO timestamp when veoVideoRef expires (48 hours from generation)
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
    let statusCode = 500
    let retryAfter: number | undefined = undefined
    
    // Check for rate limit errors first - return 429 not 500
    if (errorMessage.toLowerCase().includes('rate limit')) {
      statusCode = 429
      retryAfter = 60
      errorMessage = 'Rate limit exceeded. Please wait 60 seconds and try again.'
    }
    
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
    if (errorMessage.includes('Content Safety Filter') || 
        errorMessage.includes('filtered') || 
        errorMessage.includes('violate') ||
        errorMessage.includes('usage guidelines')) {
      statusCode = 422 // Unprocessable Entity - indicates content issue, not server error
      errorMessage = 'Content Policy Violation: Your prompt was flagged by Google\'s safety filters. This often happens with medical, violent, or graphic terms. Use the "Auto-Fix" button in the editor to rephrase with cinematic alternatives, or try the "AI Rephrase" feature for a complete rewrite.'
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
        retryAfter,
        isRateLimited: statusCode === 429,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: statusCode }
    )
  }
}


