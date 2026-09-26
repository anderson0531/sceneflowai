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
import { CONCURRENCY_DEFAULTS } from '@/lib/utils/concurrent-processor'
import { fullJitterDelayMs } from '@/lib/utils/retry'
import type { 
  SceneSegment, 
  VideoGenerationConfig,
  DirectorQueueItem,
  BatchRenderOptions,
  VideoGenerationMethod,
} from '@/components/vision/scene-production/types'
import type { SegmentGuideContext, SegmentConfigResult } from '@/lib/vision/segmentConfigBuilder'
import { resolveEffectiveStartFrameUrl, resolveF2VFrameUrls, shouldAttachBeatStartFrame } from '@/lib/vision/segmentConfigBuilder'
import { deriveClipQueueStatus } from '@/lib/storyboard/mediaVersions'
import { DEFAULT_VEO_CLIP_DURATION } from '@/lib/config/modelConfig'
import {
  claimNextRunnableVideoIndex,
  isVeoChainContinuation,
  resolvePriorChainLastFrameUrl,
  resolveVeoRefForExtension,
} from '@/lib/video/veoChainQueue'
import { normalizeReferenceImages } from '@/lib/video/normalizeReferenceImages'
import type {
  VideoQueueRunReporter,
  VideoRunItem,
  VideoRunItemStatus,
} from '@/lib/video/videoQueueRunReport'

/** One cooldown, then the beat fails. A exhausted quota must not loop. */
const MAX_RATE_LIMIT_REQUEUES_PER_BEAT = 1

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
      resolution?: '360p' | '720p' | '1080p' | '4k' | '4K'
      frameRate?: 24 | 30
      thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
      omniMultiShot?: boolean
      generationMethod?: VideoGenerationMethod
      guidePrompt?: string
      previousSegmentVeoRef?: string
      previousSegmentLastFrameUrl?: string
      endFrameUrl?: string
      referenceImages?: Array<{ url: string; type?: 'style' | 'character'; name?: string; role?: string }> | string[]
      qualityTier?: 'fast' | 'premium'
      apiPromptOverride?: string
      allowPolicyFallback?: boolean
      videoProvider?: 'kling' | 'vertex' | 'aggregator'
      videoModel?: string
      klingModel?: string
      klingQuality?: 'std' | 'pro' | '4k'
      cfgScale?: number
      sound?: boolean
      watermarkEnabled?: boolean
      elementIds?: string[]
      voiceList?: Array<{ voice_id: string; name?: string }>
      multiShot?: boolean
      shotType?: 'customize' | 'intelligence'
      multiPrompt?: Array<{ index: number; prompt: string; duration: string | number }>
      preset?: string
      allowVeoFallback?: boolean
      expressMode?: boolean
      useBeatFrameAsStart?: boolean
    }
  ) => Promise<void>,
  segmentGuideContext?: SegmentGuideContext,
  /** Fresh segment list after each generate (for EXT veoVideoRef handoff). */
  getSegments?: () => SceneSegment[],
  defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9',
  /**
   * Report the run to an owner that outlives this hook. The batch keeps going
   * when the console unmounts, so the record of it has to live elsewhere.
   */
  runReport?: {
    sceneLabel: string
    onReport: VideoQueueRunReporter
  }
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
    import('@/lib/vision/segmentConfigBuilder')
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
  
  // Refresh cached user configs when live beat start frames change
  useEffect(() => {
    if (!configsReady || !segmentGuideContext?.fullScene) return
    setUserConfigs((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const seg of segments) {
        const liveStart = resolveEffectiveStartFrameUrl(
          seg,
          segmentGuideContext.fullScene,
          sceneImageUrl
        )
        const existing = next.get(seg.segmentId)
        if (
          existing &&
          liveStart &&
          shouldAttachBeatStartFrame(existing) &&
          existing.startFrameUrl !== liveStart
        ) {
          next.set(seg.segmentId, { ...existing, startFrameUrl: liveStart })
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [segments, segmentGuideContext?.fullScene, sceneImageUrl, configsReady])
  
  // Local state for user-modified configs
  const [userConfigs, setUserConfigs] = useState<Map<string, VideoGenerationConfig>>(new Map())
  
  // Rendering state
  const [isRendering, setIsRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [isRateLimitPaused, setIsRateLimitPaused] = useState(false)
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0)

  // Cancellation lives in a ref, not state: the worker loop closed over the
  // state value as it stood when processQueue was built, so a mid-run Cancel
  // never reached the loop it was meant to stop.
  const cancelRequestedRef = useRef(false)
  const renderingRef = useRef(false)

  // Reporting goes through refs so the loop keeps reporting after a re-render
  // hands it a new callback, and after the console that owns it unmounts.
  const runReportRef = useRef(runReport)
  useEffect(() => {
    runReportRef.current = runReport
  }, [runReport])
  
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
        asset: s.activeAssetUrl?.slice(-20), // Last 20 chars of URL for change detection
        take: `${s.currentTakeId || ''}:${(s.takes || []).map((take) => take.id).join('|')}`,
        prompt: s.generatedPrompt,
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
      
      const liveStartFrameUrl = resolveEffectiveStartFrameUrl(
        segment,
        segmentGuideContext?.fullScene,
        sceneImageUrl
      )
      if (liveStartFrameUrl && shouldAttachBeatStartFrame(config)) {
        config = { ...config, startFrameUrl: liveStartFrameUrl }
      }
      
      // A stored take or video URL counts as complete even if segment.status was cleared.
      // GENERATING stays rendering so an in-progress retake is not hidden by older takes.
      const status = deriveClipQueueStatus(segment, config.approvalStatus)
      
      return {
        segmentId: segment.segmentId,
        sequenceIndex: segment.sequenceIndex,
        config,
        thumbnailUrl: liveStartFrameUrl || sceneImageUrl || null,
        status,
        error: segment.errorMessage,
      }
    }).sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    
    // Cache the result to return on subsequent render loop iterations
    lastQueueRef.current = result
    return result
  }, [isReady, configsReady, segments, configsMap, userConfigs, sceneImageUrl, segmentGuideContext, defaultAspectRatio])
  
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
    
    if (renderingRef.current) {
      toast.info('A video generation is already running. Wait for it to finish.')
      return
    }

    const { mode, priority, delayBetween, selectedIds, overrideConfigs } = options
    const concurrency = Math.min(
      options.concurrency || 1,
      CONCURRENCY_DEFAULTS.VIDEO_GENERATION
    )
    
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
    
    renderingRef.current = true
    setIsRendering(true)
    setProgress(0)
    setCompletedCount(0)
    setFailedCount(0)
    cancelRequestedRef.current = false
    
    toast.info(`Starting batch render of ${itemsToProcess.length} segments...`)
    
    let completed = 0
    let failed = 0
    const rateLimitRequeues = new Map<string, number>()
    const claimed = new Set<number>()
    const finishedSegmentIds = new Set<string>()
    const claimWaiters: Array<() => void> = []
    const notifyClaim = () => {
      const pending = claimWaiters.splice(0, claimWaiters.length)
      for (const wake of pending) wake()
    }
    const waitForClaim = () =>
      new Promise<void>((resolve) => {
        claimWaiters.push(resolve)
      })

    const runItems = new Map<string, VideoRunItem>(
      itemsToProcess.map((item, idx) => [
        item.segmentId,
        {
          key: item.segmentId,
          label: `Shot ${idx + 1}`,
          status: 'pending' as VideoRunItemStatus,
        },
      ])
    )
    let pausedFor = 0

    const report = (finished: boolean) => {
      const reporter = runReportRef.current
      if (!reporter) return
      reporter.onReport({
        sceneId,
        sceneLabel: reporter.sceneLabel,
        total: itemsToProcess.length,
        completed,
        failed,
        finished,
        cancelled: cancelRequestedRef.current,
        rateLimitCountdown: pausedFor,
        items: [...runItems.values()],
      })
    }

    const markItem = (
      segmentId: string,
      status: VideoRunItemStatus,
      error?: string
    ) => {
      const existing = runItems.get(segmentId)
      if (existing) {
        runItems.set(segmentId, { ...existing, status, ...(error ? { error } : {}) })
      }
      report(false)
    }

    report(false)
    
    // Worker function for concurrent processing.
    // Continuation parts wait until the previous part in this batch finishes.
    // Independent shots claim the other worker slot.
    const worker = async () => {
      while (!cancelRequestedRef.current) {
        const liveSegmentsForClaim = getSegments?.() ?? segments
        const index = claimNextRunnableVideoIndex(
          itemsToProcess,
          liveSegmentsForClaim,
          claimed,
          finishedSegmentIds
        )
        if (index >= 0) {
          claimed.add(index)
        } else {
          const unclaimed = itemsToProcess.some((_, itemIndex) => !claimed.has(itemIndex))
          const running = itemsToProcess.some(
            (entry, itemIndex) =>
              claimed.has(itemIndex) && !finishedSegmentIds.has(entry.segmentId)
          )
          if (!unclaimed || !running) break
          await waitForClaim()
          continue
        }

        const item = itemsToProcess[index]
        setCurrentSegmentId(item.segmentId)
        setProgress(Math.round(((completed + failed) / itemsToProcess.length) * 100))
        markItem(item.segmentId, 'running')
        let handedOff = false
        
        const config = overrideConfigs?.get(item.segmentId) || item.config
        const liveSegments = getSegments?.() ?? segments
        const liveSegment = liveSegments.find((s) => s.segmentId === item.segmentId)
        
        try {
          let batchMethod = config.mode
          const isKlingProvider = config.videoProvider === 'kling'
          if (liveSegment && isVeoChainContinuation(liveSegment)) {
            const veoRef = resolveVeoRefForExtension(liveSegments, liveSegment)
            if (veoRef) {
              batchMethod = 'EXT'
            } else if (batchMethod === 'EXT' || liveSegment.generationMethod === 'EXT') {
              if (isKlingProvider) {
                batchMethod = 'I2V'
              } else {
                const chainError =
                  'Generate the previous part of this beat first — Veo extension references expire after ~2 days.'
                toast.error(
                  `Generate the previous part of this beat first (segment ${item.segmentId.slice(0, 6)}…). Veo extension references expire after ~2 days.`
                )
                failed++
                setFailedCount(failed)
                markItem(item.segmentId, 'error', chainError)
                continue
              }
            }
          }

          const f2vFrames =
            batchMethod === 'FTV' && liveSegment
              ? resolveF2VFrameUrls(liveSegment, segmentGuideContext?.fullScene)
              : null
          const liveStart = liveSegment
            ? resolveEffectiveStartFrameUrl(
                liveSegment,
                segmentGuideContext?.fullScene,
                sceneImageUrl
              )
            : undefined
          let startUrl = f2vFrames
            ? f2vFrames.startFrameUrl ?? undefined
            : shouldAttachBeatStartFrame(config)
              ? liveStart ??
                (config.startFrameUrl?.trim() ? config.startFrameUrl : undefined)
              : undefined
          if (
            liveSegment &&
            isKlingProvider &&
            batchMethod === 'I2V' &&
            isVeoChainContinuation(liveSegment)
          ) {
            const priorLastFrame = resolvePriorChainLastFrameUrl(liveSegments, liveSegment)
            if (priorLastFrame) startUrl = priorLastFrame
          }
          const endUrl = f2vFrames
            ? f2vFrames.endFrameUrl ?? undefined
            : config.endFrameUrl?.trim()
              ? config.endFrameUrl
              : undefined
          if (f2vFrames && (!startUrl || !endUrl)) {
            const frameError = 'Generate start and end frames for frame-to-video first.'
            toast.error(frameError)
            failed++
            setFailedCount(failed)
            markItem(item.segmentId, 'error', frameError)
            continue
          }
          if (batchMethod === 'FTV') {
            batchMethod = 'I2V'
          }

          const genType: 'T2V' | 'I2V' =
            batchMethod === 'I2V' || batchMethod === 'EXT'
              ? 'I2V'
              : 'T2V'

          const previousSegmentVeoRef =
            liveSegment && batchMethod === 'EXT'
              ? resolveVeoRefForExtension(liveSegments, liveSegment)
              : undefined
          const previousSegmentLastFrameUrl =
            liveSegment && batchMethod === 'I2V' && isVeoChainContinuation(liveSegment)
              ? resolvePriorChainLastFrameUrl(liveSegments, liveSegment)
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
              duration:
                batchMethod === 'EXT'
                  ? config.videoProvider === 'vertex'
                    ? 10
                    : DEFAULT_VEO_CLIP_DURATION
                  : config.duration,
              aspectRatio: config.aspectRatio,
              resolution: batchMethod === 'EXT' ? '720p' : config.resolution,
              frameRate: config.frameRate,
              thinkingLevel: config.thinkingLevel,
              omniMultiShot: config.omniMultiShot,
              generationMethod: batchMethod,
              guidePrompt: config.guidePrompt,
              previousSegmentVeoRef,
              previousSegmentLastFrameUrl,
              referenceImages,
              qualityTier: config.qualityTier,
              apiPromptOverride: config.useCustomApiPrompt ? config.apiPromptOverride : undefined,
              allowPolicyFallback: config.allowPolicyFallback === true,
              videoProvider: config.videoProvider,
              videoModel: config.videoModel,
              klingModel: config.klingModel,
              klingQuality: config.klingQuality,
              cfgScale: config.cfgScale,
              sound: config.sound,
              watermarkEnabled: config.watermarkEnabled,
              elementList: config.elementIds,
              voiceList: config.voiceList,
              multiShot: config.multiShot,
              shotType: config.shotType,
              multiPrompt: config.multiPrompt,
              preset: config.preset,
              allowVeoFallback: config.allowVeoFallback,
              expressMode: config.expressMode,
              useBeatFrameAsStart: config.useBeatFrameAsStart === true,
            }
          )
          
          completed++
          setCompletedCount(completed)
          markItem(item.segmentId, 'done')
        } catch (error: any) {
          console.error(`[VideoQueue] Failed to render segment ${item.segmentId}:`, error)
          
          // Check if this is a rate limit error
          const errorMessage = error?.message || error?.toString() || ''
          const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || 
                             errorMessage.includes('429') ||
                             errorMessage.includes('isRateLimited')
          
          if (isRateLimit) {
            // Extract retry time or default to 60 seconds, then spread the resume
            // across the full jitter window so parallel Clip runs do not wake together.
            const retryMatch = errorMessage.match(/(\d+)\s*seconds?/i)
            const waitSeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60
            const delayMs = fullJitterDelayMs({
              attempt: 0,
              baseMs: 10_000,
              capMs: 30_000,
              retryAfterMs: waitSeconds * 1000,
            })
            const jitteredSeconds = Math.max(1, Math.ceil(delayMs / 1000))
            
            console.log(`[VideoQueue] Rate limited! Pausing for ${jitteredSeconds} seconds...`)
            toast.warning(`Rate limit hit. Pausing for ${jitteredSeconds} seconds...`, {
              duration: 5000
            })
            
            // Set paused state with countdown
            setIsRateLimitPaused(true)
            setRateLimitCountdown(jitteredSeconds)
            markItem(item.segmentId, 'pending', `Rate limited — retrying in ${jitteredSeconds}s`)
            
            // Countdown timer
            for (let sec = jitteredSeconds; sec > 0; sec--) {
              if (cancelRequestedRef.current) break
              setRateLimitCountdown(sec)
              pausedFor = sec
              report(false)
              await new Promise(r => setTimeout(r, 1000))
            }
            
            setIsRateLimitPaused(false)
            setRateLimitCountdown(0)
            pausedFor = 0
            
            if (!cancelRequestedRef.current) {
              const requeues = rateLimitRequeues.get(item.segmentId) ?? 0
              if (requeues < MAX_RATE_LIMIT_REQUEUES_PER_BEAT) {
                rateLimitRequeues.set(item.segmentId, requeues + 1)
                toast.info('Rate limit cleared. Resuming queue...')
                itemsToProcess.push(item)
                handedOff = true
                continue
              }
              failed++
              setFailedCount(failed)
              markItem(item.segmentId, 'error', 'Rate limit persisted after retries')
            }
          } else {
            failed++
            setFailedCount(failed)
            markItem(
              item.segmentId,
              'error',
              String(error?.message || error || 'Render failed')
            )
          }
        } finally {
          if (!handedOff) {
            finishedSegmentIds.add(item.segmentId)
            notifyClaim()
          }
        }

        // Serial runs keep a gap between calls. Parallel runs rely on the 429 pause.
        if (concurrency === 1 && itemsToProcess.some((_, itemIndex) => !claimed.has(itemIndex))) {
          await new Promise((resolve) => setTimeout(resolve, delayBetween))
        }
      }
    }
    
    try {
      // Start workers
      const workers = Array.from({ length: Math.min(concurrency, itemsToProcess.length) }, () => worker())
      await Promise.all(workers)

      setProgress(100)
      setCurrentSegmentId(null)
      report(true)

      if (cancelRequestedRef.current) {
        toast.info(`Video Agent cancelled after ${completed} segment${completed === 1 ? '' : 's'}`)
      } else if (failed === 0) {
        toast.success(`Successfully rendered ${completed} segments!`)
      } else {
        toast.warning(`Rendered ${completed} segments, ${failed} failed`)
      }
    } finally {
      renderingRef.current = false
      setCurrentSegmentId(null)
      setIsRendering(false)
    }
  }, [queue, sceneId, onGenerate, segments, getSegments, segmentGuideContext, sceneImageUrl])
  
  // Cancel rendering
  const cancelRendering = useCallback(() => {
    cancelRequestedRef.current = true
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
