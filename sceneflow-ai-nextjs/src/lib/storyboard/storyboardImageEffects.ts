export type KenBurnsIntensity = 'subtle' | 'medium' | 'dramatic'

export type PanIntensity = 'off' | KenBurnsIntensity

export type StoryboardImageEffectMode =
  | 'off'
  | 'kenBurns'
  | 'fit'
  | 'crossfade'
  | 'lineZoom'

export const PAN_SETTINGS: Record<
  PanIntensity,
  { scale: number; translate: number; duration: number }
> = {
  off: { scale: 1, translate: 0, duration: 0 },
  subtle: { scale: 1.05, translate: 2, duration: 20 },
  medium: { scale: 1.1, translate: 4, duration: 15 },
  dramatic: { scale: 1.15, translate: 6, duration: 10 },
}

/** Direction vectors for gallery Ken Burns (normalized -1..1). */
export const GALLERY_KEN_BURNS_DIRECTIONS = [
  { xDir: -1, yDir: -0.5 },
  { xDir: 1, yDir: -0.375 },
  { xDir: -0.75, yDir: 1 },
  { xDir: 0.875, yDir: 0.625 },
  { xDir: 0, yDir: -1 },
  { xDir: 0, yDir: 0.875 },
] as const

export const GALLERY_KEN_BURNS_CYCLE_DURATION = 40

export const CROSSFADE_DURATION_MS = 400

export const LINE_ZOOM_MAX_SCALE = 1.06

export interface ImageTransform {
  scale: number
  translateX: number
  translateY: number
}

export interface GalleryImageEffectPrefs {
  mode: StoryboardImageEffectMode
  kenBurnsIntensity: KenBurnsIntensity
}

export const DEFAULT_GALLERY_IMAGE_EFFECT_PREFS: GalleryImageEffectPrefs = {
  mode: 'kenBurns',
  kenBurnsIntensity: 'medium',
}

export const GALLERY_IMAGE_EFFECT_STORAGE_KEY = 'sceneflow-gallery-image-effect'

export const IMAGE_EFFECT_OPTIONS: {
  mode: StoryboardImageEffectMode
  label: string
  description: string
}[] = [
  { mode: 'off', label: 'Off', description: 'No motion — inspect frames as-is' },
  { mode: 'kenBurns', label: 'Ken Burns', description: 'Cinematic pan and zoom' },
  { mode: 'fit', label: 'Fit', description: 'Show the entire image without crop' },
  { mode: 'crossfade', label: 'Crossfade', description: 'Smooth fade between dialogue frames' },
  { mode: 'lineZoom', label: 'Line zoom', description: 'Subtle zoom synced to each dialogue line' },
]

export function computeKenBurnsProgress(cycleTime: number, cycleDuration = GALLERY_KEN_BURNS_CYCLE_DURATION): number {
  const cyclePhase = (cycleTime % cycleDuration) / cycleDuration
  return cyclePhase <= 0.5 ? cyclePhase * 2 : 2 - cyclePhase * 2
}

export function computeKenBurnsTransform(params: {
  intensity: KenBurnsIntensity
  progress: number
  directionIndex: number
}): ImageTransform {
  const { intensity, progress, directionIndex } = params
  const settings = PAN_SETTINGS[intensity]
  const dir = GALLERY_KEN_BURNS_DIRECTIONS[directionIndex % GALLERY_KEN_BURNS_DIRECTIONS.length]
  const scale = 1 + (settings.scale - 1) * progress
  const translateX = dir.xDir * settings.translate * progress
  const translateY = dir.yDir * settings.translate * progress
  return { scale, translateX, translateY }
}

export function computeLineZoomTransform(params: {
  frameStart: number
  frameDuration: number
  currentTime: number
  maxScale?: number
}): ImageTransform {
  const { frameStart, frameDuration, currentTime, maxScale = LINE_ZOOM_MAX_SCALE } = params
  if (!frameDuration || frameDuration <= 0) {
    return { scale: 1, translateX: 0, translateY: 0 }
  }
  const t = Math.max(0, Math.min(1, (currentTime - frameStart) / frameDuration))
  return { scale: 1 + (maxScale - 1) * t, translateX: 0, translateY: 0 }
}

export function getStaticTransform(): ImageTransform {
  return { scale: 1, translateX: 0, translateY: 0 }
}

export function transformToCss({ scale, translateX, translateY }: ImageTransform): string {
  return `scale(${scale}) translate(${translateX}%, ${translateY}%)`
}

export function getImageObjectFit(mode: StoryboardImageEffectMode): 'cover' | 'contain' {
  return mode === 'fit' ? 'contain' : 'cover'
}

export function loadGalleryImageEffectPrefs(): GalleryImageEffectPrefs {
  if (typeof window === 'undefined') return DEFAULT_GALLERY_IMAGE_EFFECT_PREFS
  try {
    const raw = sessionStorage.getItem(GALLERY_IMAGE_EFFECT_STORAGE_KEY)
    if (!raw) return DEFAULT_GALLERY_IMAGE_EFFECT_PREFS
    const parsed = JSON.parse(raw) as Partial<GalleryImageEffectPrefs>
    const mode = parsed.mode
    const kenBurnsIntensity = parsed.kenBurnsIntensity
    const validModes: StoryboardImageEffectMode[] = ['off', 'kenBurns', 'fit', 'crossfade', 'lineZoom']
    const validIntensities: KenBurnsIntensity[] = ['subtle', 'medium', 'dramatic']
    return {
      mode: mode && validModes.includes(mode) ? mode : DEFAULT_GALLERY_IMAGE_EFFECT_PREFS.mode,
      kenBurnsIntensity:
        kenBurnsIntensity && validIntensities.includes(kenBurnsIntensity)
          ? kenBurnsIntensity
          : DEFAULT_GALLERY_IMAGE_EFFECT_PREFS.kenBurnsIntensity,
    }
  } catch {
    return DEFAULT_GALLERY_IMAGE_EFFECT_PREFS
  }
}

export function saveGalleryImageEffectPrefs(prefs: GalleryImageEffectPrefs): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(GALLERY_IMAGE_EFFECT_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function getImageEffectLabel(mode: StoryboardImageEffectMode): string {
  return IMAGE_EFFECT_OPTIONS.find((o) => o.mode === mode)?.label ?? mode
}
