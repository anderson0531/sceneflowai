/**
 * Shared burn-in payload for POST /api/scene/[sceneId]/render.
 * Keeps Scene Production Mixer and Scene Render Dialog aligned with the FFmpeg job spec.
 */

import type { SceneProductionData, TextOverlayData } from './types'

export const SCENEFLOW_WATERMARK_STORAGE_KEY = 'sceneflow-watermark-config'

/** Mirrors DEFAULT_WATERMARK_CONFIG in SceneProductionMixer (enabled by default). */
const DEFAULT_WATERMARK_FOR_API = {
  type: 'text' as const,
  text: 'SceneFlow AI Studio',
  imageUrl: '',
  anchor: 'bottom-right' as const,
  padding: 60,
  textStyle: {
    fontFamily: 'Inter',
    fontSize: 3,
    fontWeight: 500 as const,
    color: '#FFFFFF',
    opacity: 0.6,
    textShadow: true,
  },
  imageStyle: {
    width: 10,
    opacity: 0.7,
  },
}

type StoredWatermark = {
  enabled?: boolean
  type?: 'text' | 'image'
  text?: string
  imageUrl?: string
  anchor?: string
  padding?: number
  textStyle?: {
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    color?: string
    opacity?: number
    textShadow?: boolean
  }
  imageStyle?: {
    width?: number
    opacity?: number
  }
}

export function mapTextOverlaysForSceneRenderApi(overlays: TextOverlayData[] | undefined) {
  if (!overlays?.length) return []
  return overlays.map((overlay) => ({
    id: overlay.id,
    text: overlay.text,
    subtext: overlay.subtext,
    position: overlay.position,
    style: {
      fontFamily: overlay.style.fontFamily,
      fontSize: overlay.style.fontSize,
      fontWeight: overlay.style.fontWeight,
      color: overlay.style.color,
      backgroundColor: overlay.style.backgroundColor,
      backgroundOpacity: overlay.style.backgroundOpacity,
      textShadow: overlay.style.textShadow,
    },
    timing: overlay.timing,
  }))
}

/**
 * Watermark object for the render API (enabled only), or null when disabled / unavailable.
 * Reads the same localStorage key as the Production Mixer.
 */
export function readWatermarkForSceneRenderApi(): typeof DEFAULT_WATERMARK_FOR_API | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(SCENEFLOW_WATERMARK_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_WATERMARK_FOR_API, textStyle: { ...DEFAULT_WATERMARK_FOR_API.textStyle }, imageStyle: { ...DEFAULT_WATERMARK_FOR_API.imageStyle } }
    }
    const parsed = JSON.parse(raw) as StoredWatermark
    if (parsed.enabled === false) return null
    if (!parsed.type) return null
    return {
      type: parsed.type,
      text: parsed.text ?? DEFAULT_WATERMARK_FOR_API.text,
      imageUrl: parsed.imageUrl ?? '',
      anchor: (parsed.anchor as typeof DEFAULT_WATERMARK_FOR_API.anchor) || DEFAULT_WATERMARK_FOR_API.anchor,
      padding: parsed.padding ?? DEFAULT_WATERMARK_FOR_API.padding,
      textStyle: {
        fontFamily: parsed.textStyle?.fontFamily ?? DEFAULT_WATERMARK_FOR_API.textStyle.fontFamily,
        fontSize: parsed.textStyle?.fontSize ?? DEFAULT_WATERMARK_FOR_API.textStyle.fontSize,
        fontWeight: (parsed.textStyle?.fontWeight ?? DEFAULT_WATERMARK_FOR_API.textStyle.fontWeight) as 400 | 500 | 600 | 700 | 800,
        color: parsed.textStyle?.color ?? DEFAULT_WATERMARK_FOR_API.textStyle.color,
        opacity: parsed.textStyle?.opacity ?? DEFAULT_WATERMARK_FOR_API.textStyle.opacity,
        textShadow: parsed.textStyle?.textShadow ?? DEFAULT_WATERMARK_FOR_API.textStyle.textShadow,
      },
      imageStyle: {
        width: parsed.imageStyle?.width ?? DEFAULT_WATERMARK_FOR_API.imageStyle.width,
        opacity: parsed.imageStyle?.opacity ?? DEFAULT_WATERMARK_FOR_API.imageStyle.opacity,
      },
    }
  } catch {
    return { ...DEFAULT_WATERMARK_FOR_API, textStyle: { ...DEFAULT_WATERMARK_FOR_API.textStyle }, imageStyle: { ...DEFAULT_WATERMARK_FOR_API.imageStyle } }
  }
}

export function getBurnInPayloadForSceneRenderApi(productionData: SceneProductionData | null) {
  const textOverlays = mapTextOverlaysForSceneRenderApi(productionData?.textOverlays)
  const wm = readWatermarkForSceneRenderApi()
  return {
    textOverlays,
    watermark: wm,
  }
}
