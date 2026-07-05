/**
 * useVideoQueue Hook - Batch Video Rendering Queue Manager
 * 
 * Manages the video generation queue for Director's Console.
 * Supports two rendering modes:
 * - approved_only: Only renders segments explicitly approved by user
 * - all: Renders all segments, using auto-drafts for unreviewed items
 * 
 * Features:
 * - Queue state management with segment configs
 * - Progress tracking during batch rendering
 * - Rate limiting between API calls (500ms delay)
 * - Error handling and retry support
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { 
  SceneSegment, 
  VideoGenerationConfig,
  DirectorQueueItem,
  BatchRenderOptions,
  VideoGenerationMethod,
} from '@/components/vision/scene-production/types'
import type { SegmentGuideContext, SegmentConfigResult } from './useSegmentConfig'
import { DEFAULT_VEO_CLIP_DURATION } from '@/lib/config/modelConfig'
import {
  isVeoChainContinuation,
  resolveVeoRefForExtension,
  segmentHasVeoChain,
} from '@/lib/video/veoChainQueue'
import { normalizeReferenceImages } from '@/lib/video/normalizeReferenceImages'

export interface VideoQueueState {
  /** All queue items with their configs */
  queue: DirectorQueueItem[]
  /** Whether batch rendering is in progress */
  isRendering: boolean
  /** Current rendering progress (0-100) */
  progress: number
  /** Currently rendering segment ID */
  currentSegmentId: string | null
  /** Count of completed segments */
  completedCount: number
  /** Count of failed segments */
  failedCount: number
  /** Whether queue is paused due to rate limiting */
  isRateLimitPaused: boolean
  /** Seconds remaining until rate limit pause ends */
  rateLimitCountdown: number
}

export interface BatchRenderOptionsWithOverrides extends BatchRenderOptions {
  /** Override configs for specific segments - bypasses React state async timing issues */
  overrideConfigs?: Map<string, VideoGenerationConfig>
  /** Number of concurrent generation tasks (defaults to 1) */
  concurrency?: number
}

export interface VideoQueueActions {
  /** Update config for a specific segment */
  updateConfig: (segmentId: string, config: VideoGenerationConfig) => void
  /** Mark a segment as approved */
  approveSegment: (segmentId: string) => void
  /** Process the queue with specified options */
  processQueue: (options: BatchRenderOptionsWithOverrides) => Promise<void>
  /** Cancel ongoing batch rendering */
  cancelRendering: () => void
  /** Reset queue to auto-drafted state */
  resetQueue: () => void
  /** Get queue item by segment ID */
  getQueueItem: (segmentId: string) => DirectorQueueItem | undefined
}

export interface UseVideoQueueReturn extends VideoQueueState, VideoQueueActions {}

/**
 * Hook to manage video rendering queue for Director's Console
 */
export function useVideoQueue(
  segments: SceneSegment[],
  sceneId: string,
  sceneImageUrl?: string,
  onGenerate?: (
    sceneId: string,
    segmentId: string,
    mode: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD',
    options?: {
      startFrameUrl?: string
      endFrameUrl?: string
      sourceVideoUrl?: string
      prompt?: string
      negativePrompt?: string
      duration?: number
      aspectRatio?: '16:9' | '9:16'
      resolution?: '720p' | '1080p'
      generationMethod?: VideoGenerationMethod
      guidePrompt?: string
      previousSegmentVeoRef?: string
      endFrameUrl?: string
      referenceImages?: Array<{ url: string; type?: 'style' | 'character'; name?: string; role?: string }> | string[]
      qualityTier?: 'fast' | 'premium'
      apiPromptOverride?: string
      allowPolicyFallback?: boolean
      videoProvider?: 'vertex' | 'aggregator'
      videoModel?: string
    }
  ) => Promise<void>,
  segmentGuideContext?: SegmentGuideContext,
  /** Fresh segment list after each generate (for EXT veoVideoRef handoff). */
  getSegments?: () => SceneSegment[],
  defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9'
): UseVideoQueueReturn {
  // QUARANTINE GUARD: Delay initialization by one frame to let module graph settle
  // This prevents TDZ errors from rapid re-renders during initial mount
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    // Delay by one frame using requestAnimationFrame to ensure all modules are fully evaluated
    // This breaks the synchronous execution that triggers TDZ errors
    const rafId = requestAnimationFrame(() => {
      setIsReady(true)
    })
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Dynamically import segment config builder in a separate chunk — static import of
  // useSegmentConfig in the same webpack bundle as DirectorConsole causes TDZ crashes
  // ('Cannot access tO/tz before initialization') when the queue first builds.
  const [configsMap, setConfigsMap] = useState<Map<string, SegmentConfigResult>>(new Map())
  const [configsReady, setConfigsReady] = useState(false)

  useEffect(() => {
    if (!isReady) {
      setConfigsMap(new Map())
      setConfigsReady(false)
      return
    }

    let cancelled = false
    import('./useSegmentConfig')
      .then(({ buildSegmentConfigsMap }) => {
        if (cancelled) return
        setConfigsMap(
          buildSegmentConfigsMap(
            segments,
            sceneImageUrl,
            segmentGuideContext,
            defaultAspectRatio
          )
        )
        setConfigsReady(true)
      })
      .catch((err) => {
        console.error('[useVideoQueue] Failed to load segment config builder:', err)
        if (!cancelled) {
          setConfigsMap(new Map())
          setConfigsReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isReady, segments, sceneImageUrl, segmentGuideContext, defaultAspectRatio])
  
  // Local state for user-modified configs
  const [userConfigs, setUserConfigs] = useState<Map<string, VideoGenerationConfig>>(new Map())
  
  // Rendering state
  const [isRendering, setIsRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [cancelRequested, setCancelRequested] = useState(false)
  const [isRateLimitPaused, setIsRateLimitPaused] = useState(false)
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0)
  
  // Content hash to prevent redundant queue rebuilds during render loops
  // This compares actual segment content, not just array references
  const lastContentHashRef = useRef<string>('')
  const lastQueueRef = useRef<DirectorQueueItem[]>([])
  
  // Build queue from segments and configs
  const queue = useMemo<DirectorQueueItem[]>(() => {
    // QUARANTINE: Skip all processing until module graph has settled
    // This is the critical guard that prevents TDZ errors during rapid initial renders
    if (!isReady || !configsReady) {
      return []
    }

    // Early return empty array for empty segments to avoid expensive processing
    if (!segments || segments.length === 0) {
      return []
    }
    
    // CONTENT HASH GUARD: Prevent render loop by checking actual content, not references
    // This stops the cascade where new Map/array references trigger infinite re-renders
    const contentHash = JSON.stringify(
      segments.map(s => ({
        id: s.segmentId,
        status: s.status,
        locked: s.lockedForProduction,
        asset: s.activeAssetUrl?.slice(-20), // Last 20 chars of URL for change detection
      }))
    )
    
    if (contentHash === lastContentHashRef.current && lastQueueRef.current.length > 0) {
      // Content hasn't changed - return cached queue to break render loop
      return lastQueueRef.current
    }
    
    // Content has changed - update hash and proceed with rebuild
    lastContentHashRef.current = contentHash
    
    // Filter out any undefined or invalid segments
    const validSegments = segments.filter((s): s is SceneSegment => 
      s != null && typeof s.segmentId === 'string'
    )
    
    // Log only when actually rebuilding (not during loop iterations)
    console.log('[useVideoQueue] Building queue from segments:', validSegments.length)
    
    const result = validSegments.map((segment) => {
      const autoConfig = configsMap.get(segment.segmentId)
      const userConfig = userConfigs.get(segment.segmentId)
      
      const videoAspect =
        defaultAspectRatio === '1:1' || defaultAspectRatio === '4:3'
          ? '16:9'
          : defaultAspectRatio

      // Prefer user config over auto config
      let config = userConfig || autoConfig?.config || {
        mode: 'T2V' as VideoGenerationMethod,
        prompt: '',
        motionPrompt: '',
        visualPrompt: '',
        negativePrompt: '',
        aspectRatio: videoAspect,
        resolution: '720p' as const,
        duration: 6,
        startFrameUrl: null,
        endFrameUrl: null,
        sourceVideoUrl: null,
        approvalStatus: 'auto-ready' as const,
        confidence: 50,
      }
      
      // If segment is locked in DB (persisted), override the approval status
      if (segment.lockedForProduction && config.approvalStatus !== 'locked') {
        console.log('[useVideoQueue] Segment locked from DB:', segment.segmentId, segment.lockedForProduction)
        config = { ...config, approvalStatus: 'locked' as const }
      }
      
      // Determine status
      // A segment is 'complete' if:
      // 1. Status is COMPLETE with a video asset, OR
      // 2. Has an activeAssetUrl that looks like a video (fallback for data inconsistencies)
      let status: DirectorQueueItem['status'] = 'queued'
      const hasVideoAsset = segment.activeAssetUrl && (
        segment.assetType === 'video' || 
        segment.activeAssetUrl.includes('.mp4') ||
        segment.activeAssetUrl.includes('video')
      )
      
      if (segment.status === 'COMPLETE' && hasVideoAsset) {
        status = 'complete'
      } else if (segment.status === 'COMPLETE' && segment.activeAssetUrl) {
        // Fallback: if status is COMPLETE with any asset, consider it complete
        status = 'complete'
      } else if (config.approvalStatus === 'rendered') {
        // If user marked as rendered (In the Can), treat as complete even if segment status is inconsistent
        status = 'complete'
      } else if (segment.status === 'GENERATING') {
        status = 'rendering'
      } else if (segment.status === 'ERROR') {
        status = 'error'
      }
      
      return {
        segmentId: segment.segmentId,
        sequenceIndex: segment.sequenceIndex,
        config,
        thumbnailUrl: segment.startFrameUrl || segment.references?.startFrameUrl || sceneImageUrl || null,
        status,
        error: segment.errorMessage,
      }
    }).sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    
    // Cache the result to return on subsequent render loop iterations
    lastQueueRef.current = result
    return result
  }, [isReady, configsReady, segments, configsMap, userConfigs, sceneImageUrl, defaultAspectRatio])
  
  // Update config for a segment
  const updateConfig = useCallback((segmentId: string, config: VideoGenerationConfig) => {
    setUserConfigs((prev) => {
      const next = new Map(prev)
      next.set(segmentId, config)
      return next
    })
  }, [])
  
  // Mark segment as approved
  const approveSegment = useCallback((segmentId: string) => {
    setUserConfigs((prev) => {
      const next = new Map(prev)
      const existing = next.get(segmentId) || configsMap.get(segmentId)?.config
      if (existing) {
        next.set(segmentId, {
          ...existing,
          approvalStatus: 'user-approved',
        })
      }
      return next
    })
  }, [configsMap])
  
  // Get queue item by ID
  const getQueueItem = useCallback((segmentId: string): DirectorQueueItem | undefined => {
    return queue.find((item) => item.segmentId === segmentId)
  }, [queue])
  
  // Process the queue
  const processQueue = useCallback(async (options: BatchRenderOptionsWithOverrides) => {
    if (!onGenerate) {
      toast.error('Video generation handler not available')
      return
    }
    
    const { mode, priority, delayBetween, selectedIds, overrideConfigs } = options
    const requestedConcurrency = options.concurrency || 1
    const chainInBatch = queue.some((item) => {
      const seg = segments.find((s) => s.segmentId === item.segmentId)
      return seg && segmentHasVeoChain(seg)
    })
    const concurrency = chainInBatch ? 1 : requestedConcurrency
    if (chainInBatch && requestedConcurrency > 1) {
      toast.info('Veo extension chain detected — rendering parts one at a time')
    }
    
    // Filter queue based on mode
    let itemsToProcess = queue.filter((item) => {
      // Skip actively rendering
      if (item.status === 'rendering') {
        return false
      }
      
      // For 'selected' mode: only render explicitly selected segments
      if (mode === 'selected') {
        return selectedIds?.includes(item.segmentId) ?? false
      }
      
      // For approved_only mode: include user-approved items (even if already complete for re-rendering)
      if (mode === 'approved_only') {
        return item.config.approvalStatus === 'user-approved'
      }
      
      // 'all' mode: skip already complete, include everything else
      if (item.status === 'complete') {
        return false
      }
      
      return true
    })
    
    // Sort by priority
    if (priority === 'approved_first') {
      itemsToProcess.sort((a, b) => {
        const aApproved = a.config.approvalStatus === 'user-approved' ? 0 : 1
        const bApproved = b.config.approvalStatus === 'user-approved' ? 0 : 1
        if (aApproved !== bApproved) return aApproved - bApproved
        return a.sequenceIndex - b.sequenceIndex
      })
    } else {
      // sequence order
      itemsToProcess.sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    }
    
    if (itemsToProcess.length === 0) {
      toast.info('No segments to render')
      return
    }
    
    setIsRendering(true)
    setProgress(0)
    setCompletedCount(0)
    setFailedCount(0)
    setCancelRequested(false)
    
    toast.info(`Starting batch render of ${itemsToProcess.length} segments...`)
    
    let currentIndex = 0
    let completed = 0
    let failed = 0
    
    // Worker function for concurrent processing
    const worker = async () => {
      while (currentIndex < itemsToProcess.length) {
        if (cancelRequested) break
        
        const i = currentIndex++
        const item = itemsToProcess[i]
        
        // Update progress and current segment (only accurate for single concurrency)
        if (concurrency === 1) {
          setCurrentSegmentId(item.segmentId)
          setProgress(Math.round((i / itemsToProcess.length) * 100))
        } else {
          // For concurrent mode, update progress based on completed items
          setProgress(Math.round((completed / itemsToProcess.length) * 100))
        }
        
        const config = overrideConfigs?.get(item.segmentId) || item.config
        const liveSegments = getSegments?.() ?? segments
        const liveSegment = liveSegments.find((s) => s.segmentId === item.segmentId)
        
        try {
          let batchMethod = config.mode
          if (liveSegment && isVeoChainContinuation(liveSegment)) {
            const veoRef = resolveVeoRefForExtension(liveSegments, liveSegment)
            if (veoRef) {
              batchMethod = 'EXT'
            } else if (batchMethod === 'EXT' || liveSegment.generationMethod === 'EXT') {
              toast.error(
                `Generate the previous part of this beat first (segment ${item.segmentId.slice(0, 6)}…). Veo extension references expire after ~2 days.`
              )
              failed++
              setFailedCount(failed)
              continue
            }
          }

          let startUrl = config.startFrameUrl?.trim() ? config.startFrameUrl : undefined
          const endUrl = config.endFrameUrl?.trim() ? config.endFrameUrl : undefined
          if (batchMethod === 'FTV') {
            batchMethod = startUrl ? 'I2V' : 'T2V'
          }

          const genType: 'T2V' | 'I2V' =
            batchMethod === 'I2V' || batchMethod === 'EXT'
              ? 'I2V'
              : 'T2V'

          const previousSegmentVeoRef =
            liveSegment && batchMethod === 'EXT'
              ? resolveVeoRefForExtension(liveSegments, liveSegment)
              : undefined

          const referenceImages = normalizeReferenceImages(config.referenceImages)
          
          await onGenerate(
            sceneId,
            item.segmentId,
            genType,
            {
              startFrameUrl: startUrl,
              endFrameUrl: endUrl,
              sourceVideoUrl: previousSegmentVeoRef || config.sourceVideoUrl || undefined,
              prompt: config.prompt,
              negativePrompt: config.negativePrompt || undefined,
              duration: batchMethod === 'EXT' ? DEFAULT_VEO_CLIP_DURATION : config.duration,
              aspectRatio: config.aspectRatio,
              resolution: batchMethod === 'EXT' ? '720p' : config.resolution,
              generationMethod: batchMethod,
              guidePrompt: config.guidePrompt,
              previousSegmentVeoRef,
              referenceImages,
              qualityTier: config.qualityTier,
              apiPromptOverride: config.useCustomApiPrompt ? config.apiPromptOverride : undefined,
              allowPolicyFallback: config.allowPolicyFallback === true,
              videoProvider: config.videoProvider,
              videoModel: config.videoModel,
            }
          )
          
          completed++
          setCompletedCount(completed)
        } catch (error: any) {
          console.error(`[VideoQueue] Failed to render segment ${item.segmentId}:`, error)
          
          // Check if this is a rate limit error
          const errorMessage = error?.message || error?.toString() || ''
          const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || 
                             errorMessage.includes('429') ||
                             errorMessage.includes('isRateLimited')
          
          if (isRateLimit) {
            // Extract retry time or default to 60 seconds
            const retryMatch = errorMessage.match(/(\d+)\s*seconds?/i)
            const waitSeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60
            
            console.log(`[VideoQueue] Rate limited! Pausing for ${waitSeconds} seconds...`)
            toast.warning(`Rate limit hit. Pausing for ${waitSeconds} seconds...`, {
              duration: 5000
            })
            
            // Set paused state with countdown
            setIsRateLimitPaused(true)
            setRateLimitCountdown(waitSeconds)
            
            // Countdown timer
            for (let sec = waitSeconds; sec > 0; sec--) {
              if (cancelRequested) break
              setRateLimitCountdown(sec)
              await new Promise(r => setTimeout(r, 1000))
            }
            
            setIsRateLimitPaused(false)
            setRateLimitCountdown(0)
            
            if (!cancelRequested) {
              toast.info('Rate limit cleared. Resuming queue...')
              // Push item back to process later
              itemsToProcess.push(item)
              continue
            }
          } else {
            failed++
            setFailedCount(failed)
          }
        }
        
        // Rate limiting delay between API calls (only if not concurrent)
        if (currentIndex < itemsToProcess.length && concurrency === 1) {
          await new Promise((resolve) => setTimeout(resolve, delayBetween))
        }
      }
    }
    
    // Start workers
    const workers = Array.from({ length: Math.min(concurrency, itemsToProcess.length) }, () => worker())
    await Promise.all(workers)
    
    setProgress(100)
    setCurrentSegmentId(null)
    setIsRendering(false)
    
    if (failed === 0) {
      toast.success(`Successfully rendered ${completed} segments!`)
    } else {
      toast.warning(`Rendered ${completed} segments, ${failed} failed`)
    }
  }, [queue, sceneId, onGenerate, cancelRequested, segments, getSegments])
  
  // Cancel rendering
  const cancelRendering = useCallback(() => {
    setCancelRequested(true)
  }, [])
  
  // Reset queue to auto-drafted state
  const resetQueue = useCallback(() => {
    setUserConfigs(new Map())
    setProgress(0)
    setCompletedCount(0)
    setFailedCount(0)
  }, [])
  
  return {
    // State
    queue,
    isRendering,
    progress,
    currentSegmentId,
    completedCount,
    failedCount,
    isRateLimitPaused,
    rateLimitCountdown,
    // Actions
    updateConfig,
    approveSegment,
    processQueue,
    cancelRendering,
    resetQueue,
    getQueueItem,
  }
}

export default useVideoQueue
