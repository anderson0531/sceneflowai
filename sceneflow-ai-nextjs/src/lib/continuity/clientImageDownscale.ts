/**
 * Client-side image preparation before uploading to `/api/share/continuity/[token]/upload`.
 *
 * Why this matters on mobile:
 * - Modern phones (iPhone 15/16, Samsung Galaxy S23/S24) capture 12MP–48MP photos (5–14 MB)
 *   often in HEIC/HEIF or uncompressed JPEG, which exceed Vercel's 4.5 MB serverless request
 *   gateway limit (`413 Payload Too Large`) before server-side `sharp` ever executes.
 * - Downscaling in browser `<canvas>` to `max 2048x2048` JPEG (`q = 0.88`) reduces typical
 *   camera uploads to ~350–700 KB AND decodes HEIC on iOS Safari automatically, while
 *   server-side `sanitizeCustomerImageUpload` (`sharp`) still strips EXIF GPS & checks magic bytes.
 */

export const MAX_CONTINUITY_CLIENT_DIMENSION = 2048
export const PASSTHROUGH_MAX_BYTES = 1_800_000

const SAFE_PASSTHROUGH_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension = MAX_CONTINUITY_CLIENT_DIMENSION
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension }
  }
  const longest = Math.max(width, height)
  if (longest <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const ratio = maxDimension / longest
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

export async function prepareImageForContinuityUpload(file: File): Promise<File> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    (file.size <= PASSTHROUGH_MAX_BYTES && SAFE_PASSTHROUGH_MIMES.has(file.type))
  ) {
    return file
  }

  try {
    const objectUrl = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Image decode failed'))
        el.src = objectUrl
      })

      const { width, height } = computeScaledDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height
      )
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return file

      ctx.drawImage(img, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
      )
      if (!blob) return file

      const baseName = (file.name || 'continuity-photo').replace(/\.[^.]+$/, '')
      return new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    // Fallback to raw file if browser cannot decode in canvas
    return file
  }
}
