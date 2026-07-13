/**
 * Shared burn-in payload for POST /api/scene/[sceneId]/render.
 * Keeps Scene Production Mixer and Scene Render Dialog aligned with the FFmpeg job spec.
 */

import type { SceneProductionData, TextOverlayData, WatermarkConfig } from './types'
import {
  DEFAULT_WATERMARK_CONFIG,
  SCENEFLOW_WATERMARK_STORAGE_KEY,
} from '@/lib/scene/mixerSettings'

export { SCENEFLOW_WATERMARK_STORAGE_KEY }

/** Mirrors DEFAULT_WATERMARK_CONFIG (enabled by default). */
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

type StoredWatermark = Partial<WatermarkConfig>

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

function watermarkConfigToApiPayload(
  parsed: WatermarkConfig
): typeof DEFAULT_WATERMARK_FOR_API | null {
  if (parsed.enabled === false) return null
  if (!parsed.type) return null
  return {
    type: parsed.type,
    text: parsed.text ?? DEFAULT_WATERMARK_FOR_API.text,
    imageUrl: parsed.imageUrl ?? '',
    anchor: parsed.anchor || DEFAULT_WATERMARK_FOR_API.anchor,
    padding: parsed.padding ?? DEFAULT_WATERMARK_FOR_API.padding,
    textStyle: {
      fontFamily: parsed.textStyle?.fontFamily ?? DEFAULT_WATERMARK_FOR_API.textStyle.fontFamily,
      fontSize: parsed.textStyle?.fontSize ?? DEFAULT_WATERMARK_FOR_API.textStyle.fontSize,
      fontWeight: (parsed.textStyle?.fontWeight ??
        DEFAULT_WATERMARK_FOR_API.textStyle.fontWeight) as 400 | 500 | 600 | 700 | 800,
      color: parsed.textStyle?.color ?? DEFAULT_WATERMARK_FOR_API.textStyle.color,
      opacity: parsed.textStyle?.opacity ?? DEFAULT_WATERMARK_FOR_API.textStyle.opacity,
      textShadow: parsed.textStyle?.textShadow ?? DEFAULT_WATERMARK_FOR_API.textStyle.textShadow,
    },
    imageStyle: {
      width: parsed.imageStyle?.width ?? DEFAULT_WATERMARK_FOR_API.imageStyle.width,
      opacity: parsed.imageStyle?.opacity ?? DEFAULT_WATERMARK_FOR_API.imageStyle.opacity,
    },
  }
}

/**
 * Watermark object for the render API (enabled only), or null when disabled / unavailable.
 * Prefers per-scene productionData.mixerSettings; falls back to legacy localStorage.
 */
export function readWatermarkForSceneRenderApi(
  productionData?: SceneProductionData | null
): typeof DEFAULT_WATERMARK_FOR_API | null {
  const saved = productionData?.mixerSettings?.watermarkConfig
  if (saved) {
    const merged: WatermarkConfig = {
      ...DEFAULT_WATERMARK_CONFIG,
      ...saved,
      textStyle: { ...DEFAULT_WATERMARK_CONFIG.textStyle, ...saved.textStyle },
      imageStyle: { ...DEFAULT_WATERMARK_CONFIG.imageStyle, ...saved.imageStyle },
    }
    return watermarkConfigToApiPayload(merged)
  }

  if (typeof window === 'undefined') {
    return watermarkConfigToApiPayload(DEFAULT_WATERMARK_CONFIG)
  }
  try {
    const raw = localStorage.getItem(SCENEFLOW_WATERMARK_STORAGE_KEY)
    if (!raw) {
      return watermarkConfigToApiPayload(DEFAULT_WATERMARK_CONFIG)
    }
    const parsed = JSON.parse(raw) as StoredWatermark
    const merged: WatermarkConfig = {
      ...DEFAULT_WATERMARK_CONFIG,
      ...parsed,
      textStyle: { ...DEFAULT_WATERMARK_CONFIG.textStyle, ...parsed.textStyle },
      imageStyle: { ...DEFAULT_WATERMARK_CONFIG.imageStyle, ...parsed.imageStyle },
    }
    return watermarkConfigToApiPayload(merged)
  } catch {
    return watermarkConfigToApiPayload(DEFAULT_WATERMARK_CONFIG)
  }
}

export function getBurnInPayloadForSceneRenderApi(productionData: SceneProductionData | null) {
  const textOverlays = mapTextOverlaysForSceneRenderApi(productionData?.textOverlays)
  const wm = readWatermarkForSceneRenderApi(productionData)
  return {
    textOverlays,
    watermark: wm,
  }
}
