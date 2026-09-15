/**
 * Client image uploads go to Vercel Blob via a token route so the file never
 * transits a Function body (Vercel 413s anything over 4.5MB).
 */

export const IMAGE_CLIENT_UPLOAD_PATH = '/api/upload/image-url'

export const IMAGE_CLIENT_MAX_BYTES = 25 * 1024 * 1024

export const IMAGE_CLIENT_MAX_MB = 25

export const IMAGE_CLIENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const

export function formatImageUploadError(err: unknown, fileSize?: number): string {
  const msg = String((err as { message?: unknown })?.message || err || '').trim()
  const overCap =
    typeof fileSize === 'number' && fileSize > IMAGE_CLIENT_MAX_BYTES
  const looksLikeSizeLimit =
    /too large|maximum size|maximumsizeinbytes|413|payload too large|entity too large/i.test(
      msg
    )

  if (overCap || looksLikeSizeLimit) {
    const sizeBit =
      typeof fileSize === 'number'
        ? ` (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
        : ''
    return `Image is too large${sizeBit}. Maximum size is ${IMAGE_CLIENT_MAX_MB}MB.`
  }

  return msg || 'Upload failed'
}
