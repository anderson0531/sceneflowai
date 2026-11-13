import sharp from 'sharp'

export type QuarantineResult = {
  status: 'clean' | 'flagged'
  reason?: string
}

export const ALLOWED_CLIENT_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

export const MAX_CLIENT_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

const HIGH_RISK_TEXT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(csam|child\s+sexual|underage\s+nude|minor\s+explicit)\b/i,
    reason: 'Prohibited child exploitation keywords detected',
  },
  {
    pattern: /\b(bomb\s+making|terrorist\s+manifesto|mass\s+shooting\s+plan)\b/i,
    reason: 'Violent extremism or weapon instruction content detected',
  },
  {
    pattern: /\b(wire\s+transfer\s+scam|phishing\s+script|impersonate\s+bank\s+ceo|deepfake\s+extortion)\b/i,
    reason: 'Fraud, extortion, or deceptive impersonation request detected',
  },
  {
    pattern: /\bclone\b.{0,40}\bvoice\b.{0,40}\bwithout\s+consent\b/i,
    reason: 'Unverified post-mortem or non-consensual voice cloning is prohibited',
  },
]

/**
 * Customer Submission Quarantine pre-check.
 *
 * Evaluates text submitted on external Customer links (Intake Chat, Blueprint
 * Feedback, Continuity Captions). Flagged inputs are rejected or quarantined at
 * the Customer link boundary and NEVER increment the Producer's
 * `User.moderation_violations_recent` strike counter.
 */
export function evaluateCustomerTextQuarantine(text: string): QuarantineResult {
  const normalized = (text || '').trim()
  if (!normalized) {
    return { status: 'clean' }
  }
  if (normalized.length > 8000) {
    return { status: 'flagged', reason: 'Submission exceeds maximum allowed text length' }
  }

  for (const rule of HIGH_RISK_TEXT_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return { status: 'flagged', reason: rule.reason }
    }
  }

  return { status: 'clean' }
}

/**
 * Validates magic bytes of an image buffer to prevent disguised executables/HTML.
 */
export function hasValidImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true
  }

  return false
}

/**
 * Sanitizes a Customer-uploaded continuity photo:
 * 1. Enforces MIME & byte-size ceilings.
 * 2. Verifies image magic bytes.
 * 3. Re-encodes via `sharp(buffer).rotate()` WITHOUT `.withMetadata()` so EXIF
 *    GPS coordinates, device serial numbers, and embedded thumbnails are stripped.
 */
export async function sanitizeCustomerImageUpload(input: {
  buffer: Buffer
  mimeType: string
  caption?: string | null
}): Promise<{
  ok: true
  sanitizedBuffer: Buffer
  outputMimeType: 'image/jpeg'
  width: number
  height: number
  quarantine: QuarantineResult
} | {
  ok: false
  status: number
  error: string
}> {
  const mime = (input.mimeType || '').toLowerCase().trim()
  if (!ALLOWED_CLIENT_IMAGE_MIMES.has(mime)) {
    return {
      ok: false,
      status: 400,
      error: 'Unsupported image format. Please upload JPEG, PNG, or WebP.',
    }
  }

  if (!input.buffer || input.buffer.length === 0) {
    return { ok: false, status: 400, error: 'Empty image file' }
  }

  if (input.buffer.length > MAX_CLIENT_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      error: 'Image exceeds 15MB maximum file size',
    }
  }

  if (!hasValidImageMagicBytes(input.buffer)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid or corrupted image file header',
    }
  }

  const captionCheck = evaluateCustomerTextQuarantine(input.caption || '')

  try {
    const pipeline = sharp(input.buffer, { limitInputPixels: 64_000_000 })
      .rotate() // Auto-orient from EXIF, then sharp strips EXIF metadata by default
      .resize({
        width: 2048,
        height: 2048,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, mozjpeg: true })

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })

    return {
      ok: true,
      sanitizedBuffer: data,
      outputMimeType: 'image/jpeg',
      width: info.width,
      height: info.height,
      quarantine: captionCheck,
    }
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'Unable to decode image file safely',
    }
  }
}
