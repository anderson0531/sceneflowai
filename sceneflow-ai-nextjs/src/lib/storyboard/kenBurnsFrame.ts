import type { ImageTransform } from '@/lib/storyboard/storyboardImageEffects'
import type { KenBurnsSettings } from '@/lib/video/renderTypes'

/** Normalized viewport rectangle in object-cover space (0..1). */
export interface FrameViewportRect {
  x: number
  y: number
  width: number
  height: number
}

export type BeatKenBurnsEasing = 'linear' | 'smooth' | 'drift' | 'push' | 'dramatic'

export interface BeatKenBurnsSettings {
  enabled: boolean
  start: FrameViewportRect
  end: FrameViewportRect
  easing: BeatKenBurnsEasing
}

export const FULL_FRAME_VIEWPORT: FrameViewportRect = { x: 0, y: 0, width: 1, height: 1 }

export const DEFAULT_BEAT_KEN_BURNS: BeatKenBurnsSettings = {
  enabled: false,
  start: FULL_FRAME_VIEWPORT,
  end: { x: 0.15, y: 0.15, width: 0.7, height: 0.7 },
  easing: 'smooth',
}

export type KenBurnsPresetId =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'static'

export const KEN_BURNS_PRESET_LABELS: Record<KenBurnsPresetId, string> = {
  'zoom-in': 'Zoom in',
  'zoom-out': 'Zoom out',
  'pan-left': 'Pan left',
  'pan-right': 'Pan right',
  'pan-up': 'Pan up',
  'pan-down': 'Pan down',
  static: 'Static',
}

export const KEN_BURNS_PRESETS: Record<
  KenBurnsPresetId,
  { start: FrameViewportRect; end: FrameViewportRect }
> = {
  'zoom-in': {
    start: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    end: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
  },
  'zoom-out': {
    start: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    end: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
  },
  'pan-left': {
    start: { x: 0.5, y: 0.15, width: 0.45, height: 0.7 },
    end: { x: 0.05, y: 0.15, width: 0.45, height: 0.7 },
  },
  'pan-right': {
    start: { x: 0.05, y: 0.15, width: 0.45, height: 0.7 },
    end: { x: 0.5, y: 0.15, width: 0.45, height: 0.7 },
  },
  'pan-up': {
    start: { x: 0.15, y: 0.5, width: 0.7, height: 0.45 },
    end: { x: 0.15, y: 0.05, width: 0.7, height: 0.45 },
  },
  'pan-down': {
    start: { x: 0.15, y: 0.05, width: 0.7, height: 0.45 },
    end: { x: 0.15, y: 0.5, width: 0.7, height: 0.45 },
  },
  static: {
    start: FULL_FRAME_VIEWPORT,
    end: FULL_FRAME_VIEWPORT,
  },
}

const MIN_RECT_SIZE = 0.05

export function clampRect(rect: FrameViewportRect): FrameViewportRect {
  const width = Math.max(MIN_RECT_SIZE, Math.min(1, rect.width))
  const height = Math.max(MIN_RECT_SIZE, Math.min(1, rect.height))
  const x = Math.max(0, Math.min(1 - width, rect.x))
  const y = Math.max(0, Math.min(1 - height, rect.y))
  return { x, y, width, height }
}

/** Monotonic 0→1 progress within a frame window (directed A→B). */
export function computeFrameProgress(
  frameStart: number,
  frameDuration: number,
  currentTime: number
): number {
  if (!frameDuration || frameDuration <= 0) return 0
  return Math.max(0, Math.min(1, (currentTime - frameStart) / frameDuration))
}

export function applyEasing(progress: number, easing: BeatKenBurnsEasing): number {
  const t = Math.max(0, Math.min(1, progress))
  switch (easing) {
    case 'linear':
      return t
    case 'smooth':
      return t * t * (3 - 2 * t)
    case 'drift':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    case 'push':
      return 1 - Math.pow(1 - t, 2)
    case 'dramatic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    default:
      return t
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpRect(a: FrameViewportRect, b: FrameViewportRect, t: number): FrameViewportRect {
  return clampRect({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    width: lerp(a.width, b.width, t),
    height: lerp(a.height, b.height, t),
  })
}

/** Map a viewport rect to CSS scale/translate for object-cover images. */
export function rectToImageTransform(rect: FrameViewportRect): ImageTransform {
  const safe = clampRect(rect)
  const scale = Math.max(1 / safe.width, 1 / safe.height)
  const cx = safe.x + safe.width / 2
  const cy = safe.y + safe.height / 2
  return {
    scale,
    translateX: (0.5 - cx) * scale * 100,
    translateY: (0.5 - cy) * scale * 100,
  }
}

export function computeFrameKenBurnsTransform(
  settings: BeatKenBurnsSettings,
  progress: number
): ImageTransform {
  const eased = applyEasing(progress, settings.easing)
  const rect = lerpRect(settings.start, settings.end, eased)
  return rectToImageTransform(rect)
}

function rectZoomLevel(rect: FrameViewportRect): number {
  const safe = clampRect(rect)
  return Math.max(1 / safe.width, 1 / safe.height)
}

function rectPanOffset(rect: FrameViewportRect): { panX: number; panY: number } {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return {
    panX: (cx - 0.5) * 2,
    panY: (cy - 0.5) * 2,
  }
}

/** Convert beat settings to FFmpeg-friendly scalars + optional viewport rects. */
export function rectToRenderKenBurns(settings: BeatKenBurnsSettings): KenBurnsSettings {
  const startPan = rectPanOffset(settings.start)
  const endPan = rectPanOffset(settings.end)
  return {
    zoomStart: rectZoomLevel(settings.start),
    zoomEnd: rectZoomLevel(settings.end),
    panX: endPan.panX - startPan.panX,
    panY: endPan.panY - startPan.panY,
    startRect: clampRect(settings.start),
    endRect: clampRect(settings.end),
    easing: settings.easing,
  }
}

export function resolveBeatKenBurnsSettings(
  raw: BeatKenBurnsSettings | undefined | null
): BeatKenBurnsSettings | undefined {
  if (!raw?.enabled) return undefined
  return {
    enabled: true,
    start: clampRect(raw.start ?? DEFAULT_BEAT_KEN_BURNS.start),
    end: clampRect(raw.end ?? DEFAULT_BEAT_KEN_BURNS.end),
    easing: raw.easing ?? 'smooth',
  }
}

export function applyKenBurnsPreset(
  preset: KenBurnsPresetId,
  current?: BeatKenBurnsSettings
): BeatKenBurnsSettings {
  const presetRects = KEN_BURNS_PRESETS[preset]
  return {
    enabled: preset === 'static' ? false : (current?.enabled ?? true),
    start: { ...presetRects.start },
    end: { ...presetRects.end },
    easing: current?.easing ?? 'smooth',
  }
}
