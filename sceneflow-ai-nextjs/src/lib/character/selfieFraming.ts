/**
 * Pure 9:16 portrait framing math, luminance readiness checks, optional browser
 * face-box auto-centering, and WYSIWYG HTMLCanvas export for Continuity Library
 * desktop webcam selfies.
 */

export const SELFIE_TARGET_ASPECT = 9 / 16
export const SELFIE_EXPORT_WIDTH = 1080
export const SELFIE_EXPORT_HEIGHT = 1920
export const SELFIE_MIN_ZOOM = 1
export const SELFIE_MAX_ZOOM = 2.5
export const SELFIE_MAX_ROTATION_DEG = 15

export interface SelfieCropTransform {
  /** Normalized horizontal pan within available source slack [-1, 1]. */
  panX: number
  /** Normalized vertical pan within available source slack [-1, 1]. */
  panY: number
  /** Zoom factor [1, 2.5] relative to largest inscribed 9:16 crop. */
  zoom: number
  /** Straighten tilt in degrees [-15, 15]. */
  rotationDeg: number
  /** Optional horizontal mirror override (false = true un-mirrored likeness). */
  flipHorizontal: boolean
}

export const DEFAULT_SELFIE_CROP_TRANSFORM: SelfieCropTransform = {
  panX: 0,
  panY: 0,
  zoom: 1,
  rotationDeg: 0,
  flipHorizontal: false,
}

export interface SelfieSourceCropRect {
  centerX: number
  centerY: number
  cropWidth: number
  cropHeight: number
  slackX: number
  slackY: number
  transform: SelfieCropTransform
}

export interface SelfieFaceBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type SelfieLightingStatus = 'good' | 'low_light' | 'backlit' | 'overexposed'

export interface SelfieLightingAssessment {
  status: SelfieLightingStatus
  subjectLuminance: number
  outerLuminance: number
  clippedRatio: number
  message: string | null
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function clampSelfieCropTransform(
  input?: Partial<SelfieCropTransform> | null
): SelfieCropTransform {
  return {
    panX: clampNumber(input?.panX ?? 0, -1, 1, 0),
    panY: clampNumber(input?.panY ?? 0, -1, 1, 0),
    zoom: clampNumber(input?.zoom ?? 1, SELFIE_MIN_ZOOM, SELFIE_MAX_ZOOM, 1),
    rotationDeg: clampNumber(
      input?.rotationDeg ?? 0,
      -SELFIE_MAX_ROTATION_DEG,
      SELFIE_MAX_ROTATION_DEG,
      0
    ),
    flipHorizontal: Boolean(input?.flipHorizontal),
  }
}

/**
 * Computes the exact inscribed 9:16 crop rectangle inside `sourceWidth x sourceHeight`
 * accounting for rotation AABB safety so ±15° tilt never exposes out-of-bounds corners.
 */
export function computeSelfieSourceCropRect(
  sourceWidth: number,
  sourceHeight: number,
  rawTransform?: Partial<SelfieCropTransform> | null
): SelfieSourceCropRect {
  const safeW = Math.max(1, sourceWidth)
  const safeH = Math.max(1, sourceHeight)
  const transform = clampSelfieCropTransform(rawTransform)

  const theta = (Math.abs(transform.rotationDeg) * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)

  const widthFactor = SELFIE_TARGET_ASPECT * cos + sin
  const heightFactor = SELFIE_TARGET_ASPECT * sin + cos

  const maxCropHeight = Math.min(safeW / widthFactor, safeH / heightFactor)
  const cropHeight = maxCropHeight / transform.zoom
  const cropWidth = cropHeight * SELFIE_TARGET_ASPECT

  const aabbWidth = cropHeight * widthFactor
  const aabbHeight = cropHeight * heightFactor

  const slackX = Math.max(0, (safeW - aabbWidth) / 2)
  const slackY = Math.max(0, (safeH - aabbHeight) / 2)

  const centerX = safeW / 2 + transform.panX * slackX
  const centerY = safeH / 2 + transform.panY * slackY

  return {
    centerX,
    centerY,
    cropWidth,
    cropHeight,
    slackX,
    slackY,
    transform,
  }
}

/**
 * Translates a pointer drag `(deltaViewX, deltaViewY)` on the preview viewport
 * into updated normalized `(panX, panY)` coordinates.
 */
export function applyPixelDragToSelfieTransform(
  sourceWidth: number,
  sourceHeight: number,
  viewWidth: number,
  viewHeight: number,
  deltaViewX: number,
  deltaViewY: number,
  currentTransform: SelfieCropTransform
): SelfieCropTransform {
  if (viewWidth <= 0 || viewHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return clampSelfieCropTransform(currentTransform)
  }

  const rect = computeSelfieSourceCropRect(sourceWidth, sourceHeight, currentTransform)
  const flipSign = rect.transform.flipHorizontal ? -1 : 1

  const dxCrop = -deltaViewX * (rect.cropWidth / viewWidth) * flipSign
  const dyCrop = -deltaViewY * (rect.cropHeight / viewHeight)

  const rad = (rect.transform.rotationDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const dxSource = dxCrop * cos - dyCrop * sin
  const dySource = dxCrop * sin + dyCrop * cos

  const nextPanX =
    rect.slackX > 0.5 ? rect.transform.panX + dxSource / rect.slackX : rect.transform.panX
  const nextPanY =
    rect.slackY > 0.5 ? rect.transform.panY + dySource / rect.slackY : rect.transform.panY

  return clampSelfieCropTransform({
    ...rect.transform,
    panX: nextPanX,
    panY: nextPanY,
  })
}

/**
 * Computes a head-and-shoulders 9:16 crop transform from a detected face bounding box,
 * aligning the eye line (~38% down the face box) onto the upper-third line (~36% of frame).
 */
export function computeAutoCenterTransformFromFaceBox(
  sourceWidth: number,
  sourceHeight: number,
  faceBox: SelfieFaceBoundingBox,
  existing?: Partial<SelfieCropTransform>
): SelfieCropTransform {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    faceBox.width <= 0 ||
    faceBox.height <= 0
  ) {
    return clampSelfieCropTransform(existing)
  }

  const baseRect = computeSelfieSourceCropRect(sourceWidth, sourceHeight, {
    panX: 0,
    panY: 0,
    zoom: 1,
    rotationDeg: 0,
    flipHorizontal: existing?.flipHorizontal ?? false,
  })

  // Ideal head-and-shoulders face height is ~33% of total 9:16 portrait height.
  const targetFaceHeightRatio = 0.33
  const desiredCropHeight = faceBox.height / targetFaceHeightRatio
  const rawZoom = baseRect.cropHeight / Math.max(1, desiredCropHeight)
  const zoom = clampNumber(rawZoom, 1, 2.2, 1)

  const zoomedRect = computeSelfieSourceCropRect(sourceWidth, sourceHeight, {
    panX: 0,
    panY: 0,
    zoom,
    rotationDeg: 0,
    flipHorizontal: existing?.flipHorizontal ?? false,
  })

  const faceCenterX = faceBox.x + faceBox.width / 2
  const eyeLineY = faceBox.y + faceBox.height * 0.38
  // Place eye line at 36% from the top of the 9:16 crop (offset -0.14 from vertical center).
  const desiredCenterY = eyeLineY + zoomedRect.cropHeight * (0.5 - 0.36)

  const panX =
    zoomedRect.slackX > 0.5 ? (faceCenterX - sourceWidth / 2) / zoomedRect.slackX : 0
  const panY =
    zoomedRect.slackY > 0.5 ? (desiredCenterY - sourceHeight / 2) / zoomedRect.slackY : 0

  return clampSelfieCropTransform({
    panX,
    panY,
    zoom,
    rotationDeg: 0,
    flipHorizontal: existing?.flipHorizontal ?? false,
  })
}

/**
 * Evaluates RGBA pixel buffer lighting quality for live webcam pre-flight feedback.
 * Compares central 9:16 subject exposure against outer background luminance & clipping.
 */
export function evaluateSelfieLighting(
  rgba: ArrayLike<number>,
  width: number,
  height: number
): SelfieLightingAssessment {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return {
      status: 'good',
      subjectLuminance: 128,
      outerLuminance: 128,
      clippedRatio: 0,
      message: null,
    }
  }

  const portraitHalfW = Math.min(width / 2, (height * SELFIE_TARGET_ASPECT) / 2)
  const centerX = width / 2
  const subjectMinX = centerX - portraitHalfW * 0.75
  const subjectMaxX = centerX + portraitHalfW * 0.75
  const subjectMinY = height * 0.12
  const subjectMaxY = height * 0.88

  let subjectSum = 0
  let subjectCount = 0
  let outerSum = 0
  let outerCount = 0
  let clippedCount = 0
  let totalSampled = 0

  const step = Math.max(1, Math.floor(Math.min(width, height) / 64))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4
      const r = rgba[idx] ?? 0
      const g = rgba[idx + 1] ?? 0
      const b = rgba[idx + 2] ?? 0
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

      totalSampled++
      if (lum >= 242) clippedCount++

      if (
        x >= subjectMinX &&
        x <= subjectMaxX &&
        y >= subjectMinY &&
        y <= subjectMaxY
      ) {
        subjectSum += lum
        subjectCount++
      } else {
        outerSum += lum
        outerCount++
      }
    }
  }

  const subjectLuminance = subjectCount > 0 ? subjectSum / subjectCount : 128
  const outerLuminance = outerCount > 0 ? outerSum / outerCount : subjectLuminance
  const clippedRatio = totalSampled > 0 ? clippedCount / totalSampled : 0

  if (subjectLuminance < 48) {
    return {
      status: 'low_light',
      subjectLuminance,
      outerLuminance,
      clippedRatio,
      message: 'Dim lighting — face a window or lamp for sharper facial detail',
    }
  }

  if (
    outerLuminance - subjectLuminance > 62 &&
    subjectLuminance < 105 &&
    clippedRatio > 0.08
  ) {
    return {
      status: 'backlit',
      subjectLuminance,
      outerLuminance,
      clippedRatio,
      message: 'Strong backlight — avoid bright windows directly behind you',
    }
  }

  if (subjectLuminance > 228) {
    return {
      status: 'overexposed',
      subjectLuminance,
      outerLuminance,
      clippedRatio,
      message: 'Bright overexposure — step slightly back from direct light',
    }
  }

  return {
    status: 'good',
    subjectLuminance,
    outerLuminance,
    clippedRatio,
    message: null,
  }
}

/**
 * Progressive-enhancement face detection using the browser Shape Detection API (`FaceDetector`)
 * when supported (e.g. Chromium on macOS/Windows). Safely returns `null` when unavailable.
 */
export async function detectPrimaryFaceBox(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap
): Promise<SelfieFaceBoundingBox | null> {
  if (typeof window === 'undefined') return null
  const FaceDetectorCtor = (
    window as unknown as {
      FaceDetector?: new (opts?: {
        fastMode?: boolean
        maxDetectedFaces?: number
      }) => {
        detect: (
          img: HTMLCanvasElement | HTMLImageElement | ImageBitmap
        ) => Promise<Array<{ boundingBox?: DOMRectReadOnly }>>
      }
    }
  ).FaceDetector

  if (!FaceDetectorCtor) return null

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 3 })
    const faces = await detector.detect(source)
    if (!Array.isArray(faces) || faces.length === 0) return null

    // Pick the largest face bounding box in frame.
    let best: SelfieFaceBoundingBox | null = null
    let bestArea = 0
    for (const face of faces) {
      const box = face?.boundingBox
      if (!box || box.width <= 0 || box.height <= 0) continue
      const area = box.width * box.height
      if (area > bestArea) {
        bestArea = area
        best = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }
      }
    }
    return best
  } catch {
    return null
  }
}

/**
 * Shared WYSIWYG renderer used for both the live interactive crop canvas and
 * final 1080x1920 portrait export.
 */
export function drawFramedSelfieToCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  targetCanvas: HTMLCanvasElement,
  transform: Partial<SelfieCropTransform> | null | undefined,
  outputWidth: number = SELFIE_EXPORT_WIDTH,
  outputHeight: number = SELFIE_EXPORT_HEIGHT
): void {
  const sourceW =
    source instanceof HTMLCanvasElement ? source.width : source.naturalWidth || source.width
  const sourceH =
    source instanceof HTMLCanvasElement ? source.height : source.naturalHeight || source.height
  if (sourceW <= 0 || sourceH <= 0) return

  if (targetCanvas.width !== outputWidth) targetCanvas.width = outputWidth
  if (targetCanvas.height !== outputHeight) targetCanvas.height = outputHeight

  const ctx = targetCanvas.getContext('2d')
  if (!ctx) return

  const rect = computeSelfieSourceCropRect(sourceW, sourceH, transform)
  const scale = outputHeight / rect.cropHeight

  ctx.save()
  ctx.clearRect(0, 0, outputWidth, outputHeight)
  ctx.fillStyle = '#18181b'
  ctx.fillRect(0, 0, outputWidth, outputHeight)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.translate(outputWidth / 2, outputHeight / 2)
  if (rect.transform.flipHorizontal) {
    ctx.scale(-1, 1)
  }
  if (rect.transform.rotationDeg !== 0) {
    ctx.rotate((-rect.transform.rotationDeg * Math.PI) / 180)
  }
  ctx.scale(scale, scale)
  ctx.drawImage(source, -rect.centerX, -rect.centerY, sourceW, sourceH)
  ctx.restore()
}

export interface FramedSelfieExport {
  dataUrl: string
  blob: Blob
  file: File
  width: number
  height: number
}

/**
 * Exports the framed 9:16 portrait as both a compact JPEG data URL (for pre-save AI enhance)
 * and a `File` (for direct zero-credit Vercel Blob upload).
 */
export async function exportFramedSelfie(
  source: HTMLCanvasElement | HTMLImageElement,
  transform: Partial<SelfieCropTransform> | null | undefined,
  fileBaseName: string = 'character-selfie',
  quality: number = 0.9
): Promise<FramedSelfieExport> {
  const exportCanvas = document.createElement('canvas')
  drawFramedSelfieToCanvas(
    source,
    exportCanvas,
    transform,
    SELFIE_EXPORT_WIDTH,
    SELFIE_EXPORT_HEIGHT
  )

  const dataUrl = exportCanvas.toDataURL('image/jpeg', quality)
  const blob = await new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Failed to encode selfie JPEG'))
      },
      'image/jpeg',
      quality
    )
  })

  const safeSlug =
    fileBaseName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'character-selfie'

  const file = new File([blob], `${safeSlug}-${Date.now()}.jpg`, {
    type: 'image/jpeg',
  })

  return {
    dataUrl,
    blob,
    file,
    width: SELFIE_EXPORT_WIDTH,
    height: SELFIE_EXPORT_HEIGHT,
  }
}
