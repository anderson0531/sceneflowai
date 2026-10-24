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
  Maximize,
  Minimize,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export type FeatureScreenshotFrameProps = {
  src: string
  label: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
}

type ScreenshotFramingPreset = {
  width: number
  height: number
  /** Fraction of horizontal canvas occupied by the active UI column or modal (0..1). */
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
    preset: { width: 5120, height: 5648, contentWidthFraction: 0.58, anchorY: 0.94 },
  },
  {
    match: 'series-resonance.webp',
    preset: { width: 5120, height: 6008, contentWidthFraction: 0.55, anchorY: 0.94 },
  },
  {
    match: 'series-director.webp',
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.35 },
  },
  {
    match: 'episode-director.webp',
    preset: { width: 5120, height: 4407, contentWidthFraction: 0.58, anchorY: 0.55 },
  },
  {
    match: 'series-start-project.webp',
    preset: { width: 1534, height: 2425, contentWidthFraction: 0.95, anchorY: 0.95 },
  },
  {
    match: 'start-blueprint.webp',
    preset: { width: 5120, height: 2804, contentWidthFraction: 0.48, anchorY: 0.85 },
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
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.85 },
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
    preset: { width: 5120, height: 3088, contentWidthFraction: 0.62, anchorY: 0.85 },
  },
  {
    match: 'scene-director.webp',
    preset: { width: 5120, height: 3389, contentWidthFraction: 0.56, anchorY: 0.88 },
  },
  {
    match: 'continuity-library.webp',
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.85 },
  },
  {
    match: 'script-resonance.webp',
    preset: { width: 5120, height: 2804, contentWidthFraction: 0.48, anchorY: 0.85 },
  },
  {
    match: 'production-planner.webp',
    preset: { width: 5120, height: 4487, contentWidthFraction: 0.42, anchorY: 0.92 },
  },
  {
    match: 'production-script.webp',
    preset: { width: 5120, height: 2804, contentWidthFraction: 0.56, anchorY: 0.85 },
  },
  {
    match: 'audio-agent.webp',
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.35 },
  },
  {
    match: 'stills-agent.webp',
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.25 },
  },
  {
    match: 'pre-vis-animatic.webp',
    preset: {
      width: 5120,
      height: 2805,
      contentWidthFraction: 0.68,
      anchorX: -1,
      anchorY: -0.5,
    },
  },
  {
    match: 'clips-agent.webp',
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.25 },
  },
  {
    match: 'production-mixer.webp',
    preset: { width: 5120, height: 4896, contentWidthFraction: 0.92, anchorY: -0.88 },
  },
  {
    match: 'streams-multilanguage.webp',
    preset: {
      width: 5120,
      height: 2902,
      contentWidthFraction: 0.68,
      anchorX: 1,
      anchorY: -1,
    },
  },
  {
    match: 'promo-trailers.webp',
    preset: { width: 5120, height: 5148, contentWidthFraction: 0.45, anchorY: 0.92 },
  },
  {
    match: 'direct-publishing.webp',
    preset: { width: 5120, height: 2805, contentWidthFraction: 0.48, anchorY: 0.5 },
  },
  {
    match: 'screening-player.webp',
    preset: {
      width: 5120,
      height: 2805,
      contentWidthFraction: 0.72,
      anchorX: -1,
      anchorY: 0.5,
    },
  },
  {
    match: 'screening-collab.webp',
    preset: {
      width: 5100,
      height: 2536,
      contentWidthFraction: 0.78,
      anchorX: -1,
      anchorY: 0.5,
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
  return /\.(webp|png|jpe?g)(?:$|[?#])/i.test(src)
}

export function FeatureScreenshotFrame({
  src,
  label,
  enterFullscreenLabel,
  exitFullscreenLabel,
}: FeatureScreenshotFrameProps) {
  const preset = useMemo(() => getFramingPreset(src), [src])
  const frameRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 880, height: 620 })
  const [naturalSize, setNaturalSize] = useState({
    width: preset.width,
    height: preset.height,
  })
  const [viewMode, setViewMode] = useState<'readable' | 'fit' | 'custom'>('readable')

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

  const image = isImageScreenshot(src)

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

  const applyClampedTransform = useCallback(
    (
      nextZoom: number,
      targetPanX: number,
      targetPanY: number,
      nextMode: 'readable' | 'fit' | 'custom' = 'custom'
    ) => {
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
    [containerSize.width, containerSize.height, baseWidth, baseHeight]
  )

  const applyReadableFraming = useCallback(
    (
      cw = containerSize.width,
      ch = containerSize.height,
      mw = naturalSize.width,
      mh = naturalSize.height
    ) => {
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
    ]
  )

  const applyFitFraming = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setViewMode('fit')
  }, [])

  // Reset to preset dimensions and readable framing whenever screenshot src changes
  useEffect(() => {
    const nextPreset = getFramingPreset(src)
    setNaturalSize({ width: nextPreset.width, height: nextPreset.height })
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
  }, [src])

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
    if (viewMode === 'readable') {
      applyReadableFraming(
        containerSize.width,
        containerSize.height,
        naturalSize.width,
        naturalSize.height
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

      // Trackpad pinch or Ctrl/Cmd + wheel zooms toward cursor
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

      // When zoomed in, allow natural wheel panning within screenshot bounds
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
      const pts = Array.from(activePointersRef.current.values())
      pinchDistanceRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      dragStateRef.current = null
      setIsDragging(false)
      return
    }

    if (zoom <= 1.01) return

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

      {/* Interactive Pan & Zoom Canvas */}
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
            !isDragging && 'transition-transform duration-150 ease-out'
          )}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {image ? (
            <img
              key={src}
              src={src}
              alt={label}
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
              key={src}
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
              <source src={`${src}#t=0.1`} type="video/webm" />
            </video>
          )}
        </div>
      </div>

      {/* Top-Left Studio Viewport Telemetry Pill */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 hidden items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-lg backdrop-blur-md sm:flex">
        <Move className="h-3 w-3 text-cyan-400" />
        <span>Drag or scroll to pan · Double-click to zoom</span>
      </div>

      {/* Top-Right Fullscreen Action */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/75 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-900"
        aria-label={isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
        aria-pressed={isFullscreen}
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        {isFullscreen ? exitFullscreenLabel : enterFullscreenLabel}
      </button>

      {/* Corner Interactive Minimap (when zoomed in) */}
      {zoom > 1.08 ? (
        <div className="hidden sm:flex flex-col gap-1 absolute right-3 bottom-16 z-20 rounded-xl border border-cyan-500/30 bg-slate-950/90 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] backdrop-blur-xl">
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
                src={src}
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

      {/* Bottom Floating Glassmorphic Studio Zoom & Pan Dock */}
      <div className="absolute inset-x-3 bottom-3 z-20 flex justify-center pointer-events-none">
        <div
          onClick={(event) => event.stopPropagation()}
          className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-950/85 px-2.5 py-1.5 text-xs text-white shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:gap-2 sm:px-3.5 sm:py-2"
        >
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
            className="h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400 sm:w-28"
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

          <span className="min-w-[3.25rem] text-center font-mono text-xs font-semibold tabular-nums text-cyan-300">
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
