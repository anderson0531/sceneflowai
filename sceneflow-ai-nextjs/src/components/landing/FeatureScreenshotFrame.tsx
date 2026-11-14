'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ChevronDown,
  ChevronUp,
  Globe2,
  Maximize,
  Minimize,
  Move,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FEATURE_PAN_LOCALE_OPTIONS,
  FEATURE_PAN_UI_COPY,
  getKeyFeatureNarratedPan,
  normalizeFeaturePanLocale,
  type FeaturePanLocaleId,
} from '@/config/landing/keyFeatureNarratedPan'

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function isNativeVideoFullscreen(video: HTMLVideoElement): boolean {
  return Boolean((video as FullscreenVideo).webkitDisplayingFullscreen)
}

function enterNativeVideoFullscreen(video: HTMLVideoElement) {
  ;(video as FullscreenVideo).webkitEnterFullscreen?.()
}

function exitNativeVideoFullscreen(video: HTMLVideoElement) {
  const element = video as FullscreenVideo
  if (element.webkitDisplayingFullscreen) element.webkitExitFullscreen?.()
}

export type FeatureScreenshotVariant = {
  id: string
  label: string
  imageUrl: string
}

export type FeatureScreenshotFrameProps = {
  src: string
  label: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
  variants?: readonly FeatureScreenshotVariant[]
  featureIcon?: string
  locale?: string
}

type ScreenshotFramingPreset = {
  width: number
  height: number
  /** Fraction of horizontal surface occupied by the active UI column or modal (0..1). */
  contentWidthFraction: number
  /** Horizontal anchor in [-1, 1] where 1 = left edge, 0 = center, -1 = right edge. */
  anchorX?: number
  /** Vertical anchor in [-1, 1] where 1 = top edge, 0 = center, -1 = bottom edge. */
  anchorY: number
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25
const PAN_KEY_STEP = 72

/** Session-scoped cache for synthesized 7-language MP3 blobs + unlocked audio state. */
const ttsBlobUrlCache = new Map<string, string>()
const ttsInflightMap = new Map<string, Promise<string | null>>()
let sessionVoiceoverUnlocked = false

function fetchNarratedBeatAudioUrl(
  locale: FeaturePanLocaleId,
  text: string
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return Promise.resolve(null)
  }
  const cacheKey = `${locale}::${text}`
  const cached = ttsBlobUrlCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)
  const existing = ttsInflightMap.get(cacheKey)
  if (existing) return existing

  const request = fetch('/api/tts/edge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: locale, text }),
  })
    .then(async (res) => {
      if (!res.ok) return null
      const blob = await res.blob()
      if (!blob || blob.size < 256 || typeof URL.createObjectURL !== 'function') {
        return null
      }
      const objectUrl = URL.createObjectURL(blob)
      ttsBlobUrlCache.set(cacheKey, objectUrl)
      return objectUrl
    })
    .catch(() => null)
    .finally(() => {
      ttsInflightMap.delete(cacheKey)
    })

  ttsInflightMap.set(cacheKey, request)
  return request
}

const SCREENSHOT_FRAMING_PRESETS: Array<{
  match: string
  preset: ScreenshotFramingPreset
}> = [
  {
    match: 'new-series.webm',
    preset: { width: 5120, height: 3558, contentWidthFraction: 0.54, anchorY: 0.9 },
  },
  {
    match: 'series-review.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'series-resonance.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'series-director.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'episode-director.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'series-start-project.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'start-blueprint.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'blueprint-beats.webp',
    preset: { width: 5120, height: 8059, contentWidthFraction: 0.56, anchorY: 0.94 },
  },
  {
    match: 'blueprint-cast.webp',
    preset: { width: 5120, height: 9875, contentWidthFraction: 0.56, anchorY: 0.94 },
  },
  {
    match: 'blueprint-director.webp',
    preset: { width: 5120, height: 2880, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'blueprint-resonance.webp',
    preset: {
      width: 5120,
      height: 9875,
      contentWidthFraction: 0.85,
      anchorX: -1,
      anchorY: 0.94,
    },
  },
  {
    match: 'blueprint-production-stage.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'scene-director.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'scene-workflow.webp',
    preset: { width: 5120, height: 2845, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'continuity-library.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'script-resonance.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'production-planner.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'production-script.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'audio-agent.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'scene-audio-music.webp',
    preset: { width: 5120, height: 2656, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'stills-agent.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'scene-stills-workbench.webp',
    preset: { width: 5120, height: 2656, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'pre-vis-animatic.webp',
    preset: {
      width: 5120,
      height: 2936,
      contentWidthFraction: 0.94,
      anchorX: 0,
      anchorY: -0.92,
    },
  },
  {
    match: 'clips-agent.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'scene-clips-workbench.webp',
    preset: { width: 5120, height: 2656, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'script-supervisor-pickups.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'script-supervisor.webp',
    preset: {
      width: 5120,
      height: 3967,
      contentWidthFraction: 0.96,
      anchorX: 0,
      anchorY: 0.88,
    },
  },
  {
    match: 'production-agent.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'production-mixer.webp',
    preset: { width: 5120, height: 2996, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'streams-multilanguage.webp',
    preset: {
      width: 5120,
      height: 2856,
      contentWidthFraction: 0.94,
      anchorX: 0,
      anchorY: -0.92,
    },
  },
  {
    match: 'multilanguage-ui-',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: 0 },
  },
  {
    match: 'promo-trailers.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'direct-publishing.webp',
    preset: { width: 5120, height: 2936, contentWidthFraction: 0.94, anchorY: -0.92 },
  },
  {
    match: 'screening-player.webp',
    preset: {
      width: 5120,
      height: 2880,
      contentWidthFraction: 0.94,
      anchorX: 0,
      anchorY: 0,
    },
  },
  {
    match: 'screening-collab.webp',
    preset: {
      width: 5120,
      height: 2880,
      contentWidthFraction: 0.94,
      anchorX: 0,
      anchorY: 0,
    },
  },
  {
    match: 'production-agent-builder',
    preset: {
      width: 1600,
      height: 1160,
      contentWidthFraction: 0.92,
      anchorX: 0,
      anchorY: 0.9,
    },
  },
]

const DEFAULT_PRESET: ScreenshotFramingPreset = {
  width: 5120,
  height: 3558,
  contentWidthFraction: 0.65,
  anchorY: 0.85,
}

function getFramingPreset(src: string): ScreenshotFramingPreset {
  for (const entry of SCREENSHOT_FRAMING_PRESETS) {
    if (src.includes(entry.match)) return entry.preset
  }
  return DEFAULT_PRESET
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function computeBaseMediaBox(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number
) {
  const safeCw = Math.max(1, containerWidth)
  const safeCh = Math.max(1, containerHeight)
  const safeMw = Math.max(1, mediaWidth)
  const safeMh = Math.max(1, mediaHeight)
  const containerAspect = safeCw / safeCh
  const mediaAspect = safeMw / safeMh

  if (mediaAspect > containerAspect) {
    return {
      baseWidth: safeCw,
      baseHeight: safeCw / mediaAspect,
    }
  }
  return {
    baseWidth: safeCh * mediaAspect,
    baseHeight: safeCh,
  }
}

function computePanBounds(
  containerWidth: number,
  containerHeight: number,
  baseWidth: number,
  baseHeight: number,
  zoom: number
) {
  const scaledWidth = baseWidth * zoom
  const scaledHeight = baseHeight * zoom
  return {
    scaledWidth,
    scaledHeight,
    maxPanX: Math.max(0, (scaledWidth - containerWidth) / 2),
    maxPanY: Math.max(0, (scaledHeight - containerHeight) / 2),
  }
}

function computeReadableZoom(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
  contentWidthFraction: number
): number {
  const { baseWidth } = computeBaseMediaBox(
    containerWidth,
    containerHeight,
    mediaWidth,
    mediaHeight
  )
  const widthCompensation = containerWidth / Math.max(1, baseWidth)
  const targetFill = 0.92
  const rawZoom = (targetFill / Math.max(0.25, contentWidthFraction)) * widthCompensation
  return Number(clamp(rawZoom, 1.35, 3.25).toFixed(2))
}

/** Holds a still WebM on its first frame so the panel reads as a screenshot. */
function holdStill(video: HTMLVideoElement) {
  if (!video.paused) video.pause()
}

function isImageScreenshot(src: string): boolean {
  return /\.(webp|png|jpe?g|svg)(?:$|[?#])/i.test(src)
}

function prefersReducedMotionSetting(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export function FeatureScreenshotFrame({
  src,
  label,
  enterFullscreenLabel,
  exitFullscreenLabel,
  variants,
  featureIcon,
  locale,
}: FeatureScreenshotFrameProps) {
  const [activeVariantId, setActiveVariantId] = useState<string>(
    variants?.[0]?.id ?? ''
  )
  const [panLocale, setPanLocale] = useState<FeaturePanLocaleId>(() =>
    normalizeFeaturePanLocale(locale)
  )
  const [beatIndex, setBeatIndex] = useState(0)
  const [beatProgress, setBeatProgress] = useState(0)
  const [isTourPlaying, setIsTourPlaying] = useState<boolean>(
    () => !prefersReducedMotionSetting()
  )
  const [isVoiceoverEnabled, setIsVoiceoverEnabled] = useState<boolean>(
    () => sessionVoiceoverUnlocked
  )

  useEffect(() => {
    setPanLocale(normalizeFeaturePanLocale(locale))
  }, [locale])

  useEffect(() => {
    setActiveVariantId(variants?.[0]?.id ?? '')
    setBeatIndex(0)
    setBeatProgress(0)
    setIsTourPlaying(!prefersReducedMotionSetting())
  }, [src, featureIcon, variants])

  const activeVariant = useMemo(
    () => variants?.find((v) => v.id === activeVariantId) ?? variants?.[0],
    [variants, activeVariantId]
  )
  const effectiveSrc = activeVariant?.imageUrl || src
  const panSpec = useMemo(
    () => getKeyFeatureNarratedPan(featureIcon, src),
    [featureIcon, src]
  )
  const panUi = FEATURE_PAN_UI_COPY[panLocale]
  const currentBeat = panSpec?.beats[beatIndex] ?? panSpec?.beats[0] ?? null

  // Sync screenshot variant automatically when a tour beat targets a specific variant (e.g. FlowDirector)
  useEffect(() => {
    if (!isTourPlaying || !currentBeat?.variantId || !variants?.length) return
    if (variants.some((v) => v.id === currentBeat.variantId)) {
      setActiveVariantId(currentBeat.variantId)
    }
  }, [isTourPlaying, currentBeat?.variantId, variants])

  // Sync Multilanguage Studio UI screenshot variant when switching the 7-language narrator
  useEffect(() => {
    if (!variants?.length) return
    const targetId = panLocale === 'zh' ? 'zh-CN' : panLocale
    if (variants.some((v) => v.id === targetId)) {
      setActiveVariantId(targetId)
    }
  }, [panLocale, variants])

  const preset = useMemo(() => getFramingPreset(effectiveSrc), [effectiveSrc])
  const frameRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 880, height: 620 })
  const [naturalSize, setNaturalSize] = useState({
    width: preset.width,
    height: preset.height,
  })
  const [viewMode, setViewMode] = useState<'readable' | 'fit' | 'custom' | 'tour'>(
    panSpec && !prefersReducedMotionSetting() ? 'tour' : 'readable'
  )

  const initialFocusZoom = useMemo(
    () =>
      computeReadableZoom(
        880,
        620,
        preset.width,
        preset.height,
        preset.contentWidthFraction
      ),
    [preset]
  )

  const [zoom, setZoom] = useState<number>(initialFocusZoom)
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    const { baseWidth, baseHeight } = computeBaseMediaBox(
      880,
      620,
      preset.width,
      preset.height
    )
    const { maxPanX, maxPanY } = computePanBounds(
      880,
      620,
      baseWidth,
      baseHeight,
      initialFocusZoom
    )
    return {
      x: (preset.anchorX ?? 0) * maxPanX,
      y: preset.anchorY * maxPanY,
    }
  })
  const [isDragging, setIsDragging] = useState(false)

  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originPanX: number
    originPanY: number
    moved: boolean
  } | null>(null)

  const pinchDistanceRef = useRef<number | null>(null)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  const image = isImageScreenshot(effectiveSrc)

  const { baseWidth, baseHeight } = useMemo(
    () =>
      computeBaseMediaBox(
        containerSize.width,
        containerSize.height,
        naturalSize.width,
        naturalSize.height
      ),
    [containerSize.width, containerSize.height, naturalSize.width, naturalSize.height]
  )

  const readableZoom = useMemo(
    () =>
      computeReadableZoom(
        containerSize.width,
        containerSize.height,
        naturalSize.width,
        naturalSize.height,
        preset.contentWidthFraction
      ),
    [
      containerSize.width,
      containerSize.height,
      naturalSize.width,
      naturalSize.height,
      preset.contentWidthFraction,
    ]
  )

  const { scaledWidth, scaledHeight, maxPanX, maxPanY } = useMemo(
    () =>
      computePanBounds(
        containerSize.width,
        containerSize.height,
        baseWidth,
        baseHeight,
        zoom
      ),
    [containerSize.width, containerSize.height, baseWidth, baseHeight, zoom]
  )

  const stopActiveSpeech = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.src = ''
      } catch {
        // Ignore teardown errors in headless browsers
      }
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // Ignore unsupported speechSynthesis teardown
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      stopActiveSpeech()
    }
  }, [stopActiveSpeech])

  const pauseTourForManual = useCallback(() => {
    setIsTourPlaying(false)
    stopActiveSpeech()
  }, [stopActiveSpeech])

  // Apply smooth 5K camera choreography from the current beat + progress
  const applyBeatCamera = useCallback(
    (progress01: number) => {
      if (!currentBeat) return
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * clamp(progress01, 0, 1))
      const targetZoom = Number(
        clamp(lerp(currentBeat.fromZoom, currentBeat.toZoom, eased), MIN_ZOOM, MAX_ZOOM).toFixed(3)
      )
      const bounds = computePanBounds(
        containerSize.width,
        containerSize.height,
        baseWidth,
        baseHeight,
        targetZoom
      )
      const anchorX = lerp(currentBeat.fromAnchorX, currentBeat.toAnchorX, eased)
      const anchorY = lerp(currentBeat.fromAnchorY, currentBeat.toAnchorY, eased)
      setZoom(targetZoom)
      setPan({
        x: clamp(anchorX * bounds.maxPanX, -bounds.maxPanX, bounds.maxPanX),
        y: clamp(anchorY * bounds.maxPanY, -bounds.maxPanY, bounds.maxPanY),
      })
    },
    [currentBeat, containerSize.width, containerSize.height, baseWidth, baseHeight]
  )

  // Synchronized 5K Pan + 7-Language Neural Narration loop
  useEffect(() => {
    if (!panSpec || !currentBeat) return

    if (!isTourPlaying) {
      stopActiveSpeech()
      return
    }

    setViewMode('tour')
    applyBeatCamera(0)
    setBeatProgress(0)

    // Pre-warm the next beat's MP3 when voiceover is enabled so transitions have zero gap
    if (isVoiceoverEnabled && panSpec.beats.length > 1) {
      const nextBeat = panSpec.beats[(beatIndex + 1) % panSpec.beats.length]
      if (nextBeat) {
        void fetchNarratedBeatAudioUrl(panLocale, nextBeat.narration[panLocale])
      }
    }

    let cancelled = false
    let rafId = 0
    const totalBeats = panSpec.beats.length
    const fallbackDurationMs = Math.max(3500, currentBeat.durationSec * 1000)

    const advanceBeat = () => {
      if (cancelled) return
      setBeatProgress(1)
      setBeatIndex((prev) => (prev + 1) % totalBeats)
    }

    const startTimerLoop = (durationMs: number) => {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const tick = () => {
        if (cancelled) return
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
        const progress = clamp((now - startedAt) / durationMs, 0, 1)
        setBeatProgress(progress)
        applyBeatCamera(progress)
        if (progress >= 1) {
          advanceBeat()
          return
        }
        rafId = window.requestAnimationFrame(tick)
      }
      rafId = window.requestAnimationFrame(tick)
    }

    if (!isVoiceoverEnabled) {
      stopActiveSpeech()
      startTimerLoop(fallbackDurationMs)
      return () => {
        cancelled = true
        if (rafId) window.cancelAnimationFrame(rafId)
      }
    }

    const spokenText = currentBeat.narration[panLocale]
    void (async () => {
      stopActiveSpeech()
      const audioUrl = await fetchNarratedBeatAudioUrl(panLocale, spokenText)
      if (cancelled) return

      if (audioUrl && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(audioUrl)
          audioRef.current = audio
          const syncFromAudio = () => {
            if (cancelled) return
            const dur =
              Number.isFinite(audio.duration) && audio.duration > 0.4
                ? audio.duration
                : currentBeat.durationSec
            const progress = clamp(audio.currentTime / dur, 0, 1)
            setBeatProgress(progress)
            applyBeatCamera(progress)
            if (!audio.paused && !audio.ended) {
              rafId = window.requestAnimationFrame(syncFromAudio)
            }
          }
          audio.onended = () => {
            if (!cancelled) advanceBeat()
          }
          audio.onerror = () => {
            if (!cancelled) startTimerLoop(fallbackDurationMs)
          }
          await audio.play()
          rafId = window.requestAnimationFrame(syncFromAudio)
          return
        } catch {
          // Fall through to speechSynthesis + timer fallback
        }
      }

      if (
        !cancelled &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof SpeechSynthesisUtterance !== 'undefined'
      ) {
        try {
          const utterance = new SpeechSynthesisUtterance(spokenText)
          const langOpt = FEATURE_PAN_LOCALE_OPTIONS.find((opt) => opt.id === panLocale)
          utterance.lang = langOpt?.speechLang ?? 'en-US'
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
        } catch {
          // Ignore browser speechSynthesis errors
        }
      }

      if (!cancelled) {
        startTimerLoop(fallbackDurationMs)
      }
    })()

    return () => {
      cancelled = true
      if (rafId) window.cancelAnimationFrame(rafId)
      stopActiveSpeech()
    }
  }, [
    panSpec,
    currentBeat,
    beatIndex,
    panLocale,
    isTourPlaying,
    isVoiceoverEnabled,
    applyBeatCamera,
    stopActiveSpeech,
  ])

  const applyClampedTransform = useCallback(
    (
      nextZoom: number,
      targetPanX: number,
      targetPanY: number,
      nextMode: 'readable' | 'fit' | 'custom' = 'custom'
    ) => {
      pauseTourForManual()
      const clampedZoom = Number(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM).toFixed(2))
      const bounds = computePanBounds(
        containerSize.width,
        containerSize.height,
        baseWidth,
        baseHeight,
        clampedZoom
      )
      setZoom(clampedZoom)
      setPan({
        x: clamp(targetPanX, -bounds.maxPanX, bounds.maxPanX),
        y: clamp(targetPanY, -bounds.maxPanY, bounds.maxPanY),
      })
      setViewMode(nextMode)
    },
    [containerSize.width, containerSize.height, baseWidth, baseHeight, pauseTourForManual]
  )

  const applyReadableFraming = useCallback(
    (
      cw = containerSize.width,
      ch = containerSize.height,
      mw = naturalSize.width,
      mh = naturalSize.height,
      stopTour = true
    ) => {
      if (stopTour) pauseTourForManual()
      const targetZoom = computeReadableZoom(
        cw,
        ch,
        mw,
        mh,
        preset.contentWidthFraction
      )
      const base = computeBaseMediaBox(cw, ch, mw, mh)
      const bounds = computePanBounds(cw, ch, base.baseWidth, base.baseHeight, targetZoom)
      setZoom(targetZoom)
      setPan({
        x: clamp((preset.anchorX ?? 0) * bounds.maxPanX, -bounds.maxPanX, bounds.maxPanX),
        y: clamp(preset.anchorY * bounds.maxPanY, -bounds.maxPanY, bounds.maxPanY),
      })
      setViewMode('readable')
    },
    [
      containerSize.width,
      containerSize.height,
      naturalSize.width,
      naturalSize.height,
      preset,
      pauseTourForManual,
    ]
  )

  const applyFitFraming = useCallback(() => {
    pauseTourForManual()
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setViewMode('fit')
  }, [pauseTourForManual])

  // Reset to preset dimensions whenever screenshot src changes
  useEffect(() => {
    const nextPreset = getFramingPreset(effectiveSrc)
    setNaturalSize({ width: nextPreset.width, height: nextPreset.height })
    if (isTourPlaying && panSpec) return

    const viewport = viewportRef.current
    const cw = viewport?.clientWidth || containerSize.width || 880
    const ch = viewport?.clientHeight || containerSize.height || 620
    const targetZoom = computeReadableZoom(
      cw,
      ch,
      nextPreset.width,
      nextPreset.height,
      nextPreset.contentWidthFraction
    )
    const base = computeBaseMediaBox(cw, ch, nextPreset.width, nextPreset.height)
    const bounds = computePanBounds(cw, ch, base.baseWidth, base.baseHeight, targetZoom)
    setZoom(targetZoom)
    setPan({
      x: clamp((nextPreset.anchorX ?? 0) * bounds.maxPanX, -bounds.maxPanX, bounds.maxPanX),
      y: clamp(nextPreset.anchorY * bounds.maxPanY, -bounds.maxPanY, bounds.maxPanY),
    })
    setViewMode('readable')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSrc])

  // Track viewport size changes (window resize, fullscreen toggle)
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateSize = () => {
      const cw = viewport.clientWidth
      const ch = viewport.clientHeight
      if (cw <= 0 || ch <= 0) return
      setContainerSize((prev) => {
        if (Math.abs(prev.width - cw) < 2 && Math.abs(prev.height - ch) < 2) {
          return prev
        }
        return { width: cw, height: ch }
      })
    }

    updateSize()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize)
      observer.observe(viewport)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Keep framing synchronized when container size changes
  useEffect(() => {
    if (viewMode === 'tour' && isTourPlaying) {
      applyBeatCamera(beatProgress)
    } else if (viewMode === 'readable') {
      applyReadableFraming(
        containerSize.width,
        containerSize.height,
        naturalSize.width,
        naturalSize.height,
        false
      )
    } else if (viewMode === 'fit') {
      setPan({ x: 0, y: 0 })
    } else {
      setPan((current) => ({
        x: clamp(current.x, -maxPanX, maxPanX),
        y: clamp(current.y, -maxPanY, maxPanY),
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize.width, containerSize.height])

  useEffect(() => {
    const syncFullscreen = () => {
      const frame = frameRef.current
      const video = videoRef.current
      const native = video ? isNativeVideoFullscreen(video) : false
      setIsFullscreen(Boolean(frame && document.fullscreenElement === frame) || native)
    }

    document.addEventListener('fullscreenchange', syncFullscreen)
    const video = videoRef.current
    video?.addEventListener('webkitbeginfullscreen', syncFullscreen)
    video?.addEventListener('webkitendfullscreen', syncFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen)
      video?.removeEventListener('webkitbeginfullscreen', syncFullscreen)
      video?.removeEventListener('webkitendfullscreen', syncFullscreen)
    }
  }, [src])

  // Wheel & trackpad pinch support inside the viewport
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      const rect = viewport.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const cursorOffsetX = event.clientX - (rect.left + rect.width / 2)
        const cursorOffsetY = event.clientY - (rect.top + rect.height / 2)
        const zoomDelta = -event.deltaY * 0.008
        const nextZoom = clamp(zoom + zoomDelta, MIN_ZOOM, MAX_ZOOM)
        const scaleRatio = nextZoom / zoom
        const nextPanX = cursorOffsetX - (cursorOffsetX - pan.x) * scaleRatio
        const nextPanY = cursorOffsetY - (cursorOffsetY - pan.y) * scaleRatio
        applyClampedTransform(nextZoom, nextPanX, nextPanY, nextZoom <= 1.01 ? 'fit' : 'custom')
        return
      }

      if (zoom > 1.01) {
        const canPanDown = event.deltaY > 0 && pan.y > -maxPanY + 1
        const canPanUp = event.deltaY < 0 && pan.y < maxPanY - 1
        const canPanRight = event.deltaX > 0 && pan.x > -maxPanX + 1
        const canPanLeft = event.deltaX < 0 && pan.x < maxPanX - 1

        if (isFullscreen || canPanDown || canPanUp || canPanRight || canPanLeft) {
          event.preventDefault()
          applyClampedTransform(
            zoom,
            pan.x - event.deltaX,
            pan.y - event.deltaY,
            'custom'
          )
        }
      }
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [zoom, pan.x, pan.y, maxPanX, maxPanY, isFullscreen, applyClampedTransform])

  const toggleFullscreen = () => {
    const frame = frameRef.current
    const video = videoRef.current
    if (!frame) return

    if (document.fullscreenElement === frame) {
      void document.exitFullscreen?.()
      return
    }
    if (video && isNativeVideoFullscreen(video)) {
      exitNativeVideoFullscreen(video)
      return
    }

    const request =
      frame.requestFullscreen?.bind(frame) ??
      (frame as FullscreenElement).webkitRequestFullscreen?.bind(frame)
    if (request) {
      void Promise.resolve(request()).catch(() => {
        if (video) enterNativeVideoFullscreen(video)
      })
      return
    }
    if (video) enterNativeVideoFullscreen(video)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (activePointersRef.current.size === 2) {
      pauseTourForManual()
      const pts = Array.from(activePointersRef.current.values())
      pinchDistanceRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      dragStateRef.current = null
      setIsDragging(false)
      return
    }

    if (zoom <= 1.01) return

    pauseTourForManual()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originPanX: pan.x,
      originPanY: pan.y,
      moved: false,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
    }

    if (activePointersRef.current.size === 2 && pinchDistanceRef.current) {
      const pts = Array.from(activePointersRef.current.values())
      const nextDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const ratio = nextDist / pinchDistanceRef.current
      pinchDistanceRef.current = nextDist
      const nextZoom = clamp(zoom * ratio, MIN_ZOOM, MAX_ZOOM)
      applyClampedTransform(nextZoom, pan.x, pan.y, nextZoom <= 1.01 ? 'fit' : 'custom')
      return
    }

    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.hypot(dx, dy) > 3) {
      drag.moved = true
    }
    applyClampedTransform(zoom, drag.originPanX + dx, drag.originPanY + dy, 'custom')
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchDistanceRef.current = null
    }
    if (dragStateRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      dragStateRef.current = null
      setIsDragging(false)
    }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const cursorOffsetX = event.clientX - (rect.left + rect.width / 2)
    const cursorOffsetY = event.clientY - (rect.top + rect.height / 2)

    if (zoom < 2.6) {
      const targetZoom = Math.max(3, Number((readableZoom * 1.35).toFixed(2)))
      const nextZoom = clamp(targetZoom, 2.5, MAX_ZOOM)
      const scaleRatio = nextZoom / zoom
      const nextPanX = cursorOffsetX - (cursorOffsetX - pan.x) * scaleRatio
      const nextPanY = cursorOffsetY - (cursorOffsetY - pan.y) * scaleRatio
      applyClampedTransform(nextZoom, nextPanX, nextPanY, 'custom')
    } else {
      applyReadableFraming()
    }
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      applyClampedTransform(zoom + ZOOM_STEP, pan.x, pan.y, 'custom')
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      const next = zoom - ZOOM_STEP
      applyClampedTransform(next, pan.x, pan.y, next <= 1.01 ? 'fit' : 'custom')
    } else if (event.key === '0') {
      event.preventDefault()
      applyFitFraming()
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      applyReadableFraming()
    } else if (zoom > 1.01) {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        applyClampedTransform(zoom, pan.x, pan.y + PAN_KEY_STEP, 'custom')
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        applyClampedTransform(zoom, pan.x, pan.y - PAN_KEY_STEP, 'custom')
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        applyClampedTransform(zoom, pan.x + PAN_KEY_STEP, pan.y, 'custom')
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        applyClampedTransform(zoom, pan.x - PAN_KEY_STEP, pan.y, 'custom')
      }
    }
  }

  const scrubMinimap = (clientX: number, clientY: number) => {
    const node = minimapRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const nx = clamp((clientX - rect.left) / rect.width, 0, 1)
    const ny = clamp((clientY - rect.top) / rect.height, 0, 1)
    const targetPanX = (0.5 - nx) * scaledWidth
    const targetPanY = (0.5 - ny) * scaledHeight
    applyClampedTransform(zoom, targetPanX, targetPanY, 'custom')
  }

  const handleToggleTourPlay = () => {
    if (isTourPlaying) {
      setIsTourPlaying(false)
      stopActiveSpeech()
    } else {
      sessionVoiceoverUnlocked = true
      setIsVoiceoverEnabled(true)
      setIsTourPlaying(true)
    }
  }

  const handleToggleVoiceover = () => {
    const nextVoice = !isVoiceoverEnabled
    sessionVoiceoverUnlocked = nextVoice
    setIsVoiceoverEnabled(nextVoice)
    if (nextVoice && !isTourPlaying) {
      setIsTourPlaying(true)
    } else if (!nextVoice) {
      stopActiveSpeech()
    }
  }

  const handleSelectLanguage = (nextLoc: FeaturePanLocaleId) => {
    setPanLocale(nextLoc)
    sessionVoiceoverUnlocked = true
    setIsVoiceoverEnabled(true)
    setBeatProgress(0)
    setIsTourPlaying(true)
  }

  const visibleWidthRatio = Math.min(1, containerSize.width / Math.max(1, scaledWidth))
  const visibleHeightRatio = Math.min(1, containerSize.height / Math.max(1, scaledHeight))
  const viewportLeftRatio =
    maxPanX > 0 ? ((maxPanX - pan.x) / (2 * maxPanX)) * (1 - visibleWidthRatio) : 0
  const viewportTopRatio =
    maxPanY > 0 ? ((maxPanY - pan.y) / (2 * maxPanY)) * (1 - visibleHeightRatio) : 0

  const zoomPercent = Math.round(zoom * 100)

  const mediaClass = cn(
    'w-full bg-black object-contain object-center select-none pointer-events-none',
    isFullscreen ? 'absolute inset-0 h-full' : 'h-auto max-h-[70vh] lg:max-h-[78vh]'
  )

  return (
    <div
      ref={frameRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="feature-screenshot-frame"
      aria-label={`${label} interactive studio viewport`}
      className={cn(
        'group/frame relative mt-4 min-h-[56vh] lg:min-h-[68vh] w-full overflow-hidden rounded-xl border border-slate-700/90 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60',
        isFullscreen && 'mt-0 h-full min-h-0 rounded-none border-0'
      )}
    >
      {/* Subtle studio precision grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.22) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Interactive Pan & Zoom Stage */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'relative flex min-h-[56vh] lg:min-h-[68vh] w-full items-center justify-center overflow-hidden touch-none',
          isFullscreen && 'h-full min-h-0',
          zoom > 1.01
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-zoom-in'
        )}
      >
        <div
          className={cn(
            'relative flex w-full items-center justify-center will-change-transform',
            isFullscreen && 'h-full',
            !isDragging && !isTourPlaying && 'transition-transform duration-150 ease-out'
          )}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {image ? (
            <img
              key={effectiveSrc}
              src={effectiveSrc}
              alt={activeVariant ? `${label} — ${activeVariant.label}` : label}
              draggable={false}
              className={mediaClass}
              onLoad={(event) => {
                const img = event.currentTarget
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  setNaturalSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  })
                }
              }}
              onContextMenu={(event) => event.preventDefault()}
            />
          ) : (
            <video
              key={effectiveSrc}
              ref={videoRef}
              className={mediaClass}
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-label={label}
              onLoadedMetadata={(event) => {
                const vid = event.currentTarget
                if (vid.videoWidth > 0 && vid.videoHeight > 0) {
                  setNaturalSize({
                    width: vid.videoWidth,
                    height: vid.videoHeight,
                  })
                }
              }}
              onLoadedData={(event) => holdStill(event.currentTarget)}
              onPlaying={(event) => holdStill(event.currentTarget)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <source src={`${effectiveSrc}#t=0.1`} type="video/webm" />
            </video>
          )}
        </div>
      </div>

      {/* Top Overlay: 5K Narrated Pan Bar (7 Languages) + Fullscreen + Optional Variants */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="pointer-events-none absolute inset-x-2.5 top-2.5 z-30 flex flex-col gap-1.5 sm:inset-x-3 sm:top-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {panSpec ? (
            <div
              data-testid="feature-pan-narrator-bar"
              className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl border border-cyan-400/35 bg-slate-950/90 px-2 py-1 text-[11px] text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:gap-1.5 sm:px-2.5 sm:py-1.5"
            >
              {/* Play / Pause 5K Pan Tour */}
              <button
                type="button"
                onClick={handleToggleTourPlay}
                title={isTourPlaying ? panUi.pauseTourLabel : panUi.playTourLabel}
                aria-pressed={isTourPlaying}
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all',
                  isTourPlaying
                    ? 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/60'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                )}
              >
                {isTourPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current text-cyan-300" aria-hidden="true" />
                )}
                <span className="whitespace-normal leading-tight">
                  {isTourPlaying ? panUi.tourBadge : panUi.playTourLabel}
                </span>
              </button>

              {/* Voiceover Unmute / Mute */}
              <button
                type="button"
                onClick={handleToggleVoiceover}
                title={
                  isVoiceoverEnabled ? panUi.muteVoiceoverLabel : panUi.hearVoiceoverLabel
                }
                aria-pressed={isVoiceoverEnabled}
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all',
                  isVoiceoverEnabled
                    ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/60'
                    : 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/45 hover:bg-amber-500/30'
                )}
              >
                {isVoiceoverEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                )}
                <span className="whitespace-normal leading-tight">
                  {isVoiceoverEnabled ? panUi.voiceoverOnLabel : panUi.hearVoiceoverLabel}
                </span>
              </button>

              {/* 7-Language Instant Selector Pills */}
              <div
                role="group"
                aria-label={panUi.languagePickerTitle}
                className="inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/90 p-0.5"
              >
                <Globe2
                  className="mx-1 hidden h-3 w-3 text-cyan-300 sm:inline-block"
                  aria-hidden="true"
                />
                {FEATURE_PAN_LOCALE_OPTIONS.map((opt) => {
                  const active = opt.id === panLocale
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={`${opt.nativeName} (${opt.shortLabel})`}
                      aria-pressed={active}
                      onClick={() => handleSelectLanguage(opt.id)}
                      className={cn(
                        'rounded-lg px-1.5 py-0.5 text-[10px] font-bold transition-all sm:px-2 sm:text-[11px]',
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {opt.shortLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="pointer-events-none hidden items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-lg backdrop-blur-md sm:flex">
              <Move className="h-3 w-3 text-cyan-400" />
              <span>Drag or scroll to pan · Double-click to zoom</span>
            </div>
          )}

          {/* Top-Right Fullscreen Action */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-900"
            aria-label={isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span>{isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}</span>
          </button>
        </div>

        {/* Interactive Screenshot Variant Switcher (when screenshot has multiple views) */}
        {variants && variants.length > 1 ? (
          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label={`${label} language variants`}
              className="pointer-events-auto inline-flex flex-wrap items-center gap-1 rounded-full border border-indigo-400/35 bg-slate-950/90 p-1 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.75)] backdrop-blur-xl"
            >
              {variants.map((variant) => {
                const isSelected = variant.id === (activeVariant?.id ?? variants[0].id)
                return (
                  <button
                    key={variant.id}
                    type="button"
                    role="tab"
                    title={variant.label}
                    aria-selected={isSelected}
                    onClick={() => {
                      pauseTourForManual()
                      setActiveVariantId(variant.id)
                    }}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {variant.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Corner Interactive Minimap (when zoomed in manually or during tour) */}
      {zoom > 1.08 ? (
        <div className="hidden lg:flex flex-col gap-1 absolute right-3 bottom-28 z-20 rounded-xl border border-cyan-500/30 bg-slate-950/90 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <div
            ref={minimapRef}
            onPointerDown={(event) => {
              event.stopPropagation()
              event.currentTarget.setPointerCapture?.(event.pointerId)
              scrubMinimap(event.clientX, event.clientY)
            }}
            onPointerMove={(event) => {
              if (event.buttons !== 1) return
              event.stopPropagation()
              scrubMinimap(event.clientX, event.clientY)
            }}
            className="relative cursor-crosshair overflow-hidden rounded-lg border border-white/10 bg-slate-900"
            style={{
              width: 96,
              height: Math.round(
                clamp(96 * (naturalSize.height / Math.max(1, naturalSize.width)), 58, 116)
              ),
            }}
            title="Click or drag to jump to any area"
          >
            {image ? (
              <img
                src={effectiveSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-full w-full object-contain opacity-65 select-none pointer-events-none"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-full w-full opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(34,211,238,0.2) 1px, transparent 1px), linear-gradient(to top, rgba(34,211,238,0.2) 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />
            )}
            <div
              className="pointer-events-none absolute rounded-sm border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              style={{
                left: `${viewportLeftRatio * 100}%`,
                top: `${viewportTopRatio * 100}%`,
                width: `${visibleWidthRatio * 100}%`,
                height: `${visibleHeightRatio * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Bottom Stack: Synchronized 7-Language Narrated Caption + Studio Zoom & Pan Dock */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex flex-col items-center gap-1.5 sm:inset-x-3 sm:bottom-3"
      >
        {panSpec && currentBeat ? (
          <div
            data-testid="feature-pan-caption"
            dir={panLocale === 'ar' ? 'rtl' : 'ltr'}
            className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:px-4 sm:py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1">
                {panSpec.beats.map((_, idx) => {
                  const isCurrent = idx === beatIndex
                  return (
                    <button
                      key={idx}
                      type="button"
                      title={`${panUi.beatPrefix} ${idx + 1} / ${panSpec.beats.length}`}
                      aria-pressed={isCurrent}
                      onClick={() => {
                        setBeatIndex(idx)
                        setBeatProgress(0)
                        setIsTourPlaying(true)
                      }}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold transition-all',
                        isCurrent
                          ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      0{idx + 1}
                    </button>
                  )
                })}
              </div>

              <span className="hidden text-[10px] text-slate-400 sm:inline">
                {panUi.manualHint}
              </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-100 sm:text-[13px]">
              {currentBeat.narration[panLocale]}
            </p>

            {isTourPlaying ? (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${Math.round(clamp(beatProgress, 0.04, 1) * 100)}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-slate-950/85 px-2.5 py-1.5 text-xs text-white shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:gap-2 sm:px-3.5 sm:py-2">
          {/* View Mode Presets */}
          <button
            type="button"
            onClick={applyFitFraming}
            className={cn(
              'rounded-lg px-2 py-1 text-xs font-medium transition',
              viewMode === 'fit'
                ? 'bg-white/15 text-white ring-1 ring-white/30'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            )}
            title="Fit full screenshot in frame (100%)"
          >
            Fit
          </button>

          {[2, 3].map((presetScale) => {
            const isActive =
              viewMode === 'custom' && Math.abs(zoom - presetScale) < 0.08
            return (
              <button
                key={presetScale}
                type="button"
                onClick={() => {
                  const bounds = computePanBounds(
                    containerSize.width,
                    containerSize.height,
                    baseWidth,
                    baseHeight,
                    presetScale
                  )
                  const nextY =
                    zoom <= 1.05
                      ? preset.anchorY * bounds.maxPanY
                      : (pan.y / Math.max(1, maxPanY)) * bounds.maxPanY
                  applyClampedTransform(presetScale, pan.x, nextY, 'custom')
                }}
                className={cn(
                  'hidden rounded-lg px-2 py-1 font-mono text-xs font-medium transition sm:inline-flex',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                )}
                title={`Zoom to ${presetScale * 100}%`}
              >
                {presetScale}×
              </button>
            )
          })}

          <span className="mx-0.5 h-4 w-px bg-white/15" aria-hidden="true" />

          {/* Precision Zoom Stepper & Scrubber */}
          <button
            type="button"
            onClick={() => {
              const next = zoom - ZOOM_STEP
              applyClampedTransform(next, pan.x, pan.y, next <= 1.01 ? 'fit' : 'custom')
            }}
            disabled={zoom <= MIN_ZOOM + 0.01}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <input
            type="range"
            min={100}
            max={400}
            step={5}
            value={zoomPercent}
            aria-label="Zoom level percentage"
            onChange={(event) => {
              const nextZoom = Number(event.currentTarget.value) / 100
              applyClampedTransform(
                nextZoom,
                pan.x,
                pan.y,
                nextZoom <= 1.01 ? 'fit' : 'custom'
              )
            }}
            className="h-1.5 w-16 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400 sm:w-28"
          />

          <button
            type="button"
            onClick={() =>
              applyClampedTransform(zoom + ZOOM_STEP, pan.x, pan.y, 'custom')
            }
            disabled={zoom >= MAX_ZOOM - 0.01}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <span className="min-w-[3rem] text-center font-mono text-xs font-semibold tabular-nums text-cyan-300">
            {zoomPercent}%
          </span>

          {/* Vertical Pan Stepper for Tall Screenshots */}
          {maxPanY > 8 ? (
            <>
              <span className="mx-0.5 h-4 w-px bg-white/15" aria-hidden="true" />
              <div className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    applyClampedTransform(zoom, pan.x, pan.y + PAN_KEY_STEP * 1.5, 'custom')
                  }
                  disabled={pan.y >= maxPanY - 1}
                  className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Pan up"
                  title="Pan up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyClampedTransform(zoom, pan.x, pan.y - PAN_KEY_STEP * 1.5, 'custom')
                  }
                  disabled={pan.y <= -maxPanY + 1}
                  className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Pan down"
                  title="Pan down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}

          <span className="mx-0.5 h-4 w-px bg-white/15" aria-hidden="true" />

          <button
            type="button"
            onClick={() => applyReadableFraming()}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Reset view"
            title="Reset to readable framing"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
