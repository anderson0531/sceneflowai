import { get } from '@vercel/blob'

export interface FetchReferenceImageOptions {
  label?: string
}

export interface FetchReferenceImageResult {
  base64: string
  mimeType: string
}

function parseDataUrl(source: string): FetchReferenceImageResult | null {
  const match = source.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    base64: match[2],
  }
}

function isVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('vercel-storage.com')
  } catch {
    return false
  }
}

function isPublicVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

function isGcsHttpUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname.includes('storage.googleapis.com') || hostname.includes('storage.cloud.google.com')
  } catch {
    return false
  }
}

function gcsHttpToGsUri(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('storage.googleapis.com')) return null
    const pathname = parsed.pathname.replace(/^\/+/, '')
    const slashIndex = pathname.indexOf('/')
    if (slashIndex <= 0) return null
    const bucket = pathname.slice(0, slashIndex)
    const objectPath = pathname.slice(slashIndex + 1)
    if (!bucket || !objectPath) return null
    return `gs://${bucket}/${decodeURIComponent(objectPath)}`
  } catch {
    return null
  }
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}

async function fetchViaHttp(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url, {
    headers: { Accept: 'image/*' },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const mimeType = response.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg'
  const buffer = Buffer.from(await response.arrayBuffer())
  return { buffer, mimeType }
}

async function fetchVercelBlob(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  const access = isPublicVercelBlobUrl(url) ? 'public' : 'private'

  if (token) {
    const result = await get(url, { access, token })
    if (result?.statusCode === 200 && result.stream) {
      const buffer = await streamToBuffer(result.stream)
      return {
        buffer,
        mimeType: result.blob.contentType || 'image/jpeg',
      }
    }
    if (result?.statusCode === 304) {
      throw new Error('HTTP 304 (not modified)')
    }
  } else {
    console.warn('[fetchReferenceImage] BLOB_READ_WRITE_TOKEN missing — falling back to plain fetch')
  }

  return fetchViaHttp(url)
}

function formatDownloadError(url: string, label: string | undefined, reason: string): Error {
  let hostname = 'unknown-host'
  try {
    hostname = new URL(url).hostname
  } catch {
    // keep default
  }
  const refLabel = label ? `"${label}"` : 'reference image'
  return new Error(`Failed to download reference ${refLabel} (${hostname}): ${reason}`)
}

/**
 * Return a public URL suitable for Fal/Kling when possible (skip download for public Blob URLs).
 * Falls back to base64 download for gs://, private blobs, or when base64 is explicitly needed.
 */
export async function resolveReferenceUrlForFal(
  url: string,
  options: FetchReferenceImageOptions = {}
): Promise<string> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw formatDownloadError(url, options.label, 'empty URL')
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (isPublicVercelBlobUrl(trimmed)) {
      return trimmed
    }
  }

  if (trimmed.startsWith('data:')) {
    const { resolveImageUrlForFal } = await import('@/lib/fal/klingImageClient')
    return resolveImageUrlForFal(trimmed)
  }

  if (isVercelBlobUrl(trimmed)) {
    const { resolveImageUrlForFal } = await import('@/lib/fal/klingImageClient')
    const { base64, mimeType } = await fetchReferenceImageAsBase64(trimmed, options)
    return resolveImageUrlForFal(`data:${mimeType};base64,${base64}`)
  }

  if (trimmed.startsWith('gs://') || isGcsHttpUrl(trimmed)) {
    const { resolveImageUrlForFal } = await import('@/lib/fal/klingImageClient')
    const { base64, mimeType } = await fetchReferenceImageAsBase64(trimmed, options)
    return resolveImageUrlForFal(`data:${mimeType};base64,${base64}`)
  }

  return trimmed
}

/**
 * Download a reference image URL and return base64 + mime type.
 * Uses Vercel Blob SDK for blob URLs (avoids production 403 on plain fetch).
 */
export async function fetchReferenceImageAsBase64(
  url: string,
  options: FetchReferenceImageOptions = {}
): Promise<FetchReferenceImageResult> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw formatDownloadError(url, options.label, 'empty URL')
  }

  const dataUrl = parseDataUrl(trimmed)
  if (dataUrl) return dataUrl

  try {
    let buffer: Buffer
    let mimeType: string

    if (trimmed.startsWith('gs://')) {
      const { downloadImageAsBase64 } = await import('@/lib/storage/gcs')
      const base64 = await downloadImageAsBase64(trimmed)
      return { base64, mimeType: 'image/jpeg' }
    }

    if (isVercelBlobUrl(trimmed)) {
      const result = await fetchVercelBlob(trimmed)
      buffer = result.buffer
      mimeType = result.mimeType
    } else if (isGcsHttpUrl(trimmed)) {
      const gsUri = gcsHttpToGsUri(trimmed)
      if (gsUri) {
        const { downloadImageAsBase64 } = await import('@/lib/storage/gcs')
        const base64 = await downloadImageAsBase64(gsUri)
        return { base64, mimeType: 'image/jpeg' }
      }
      const result = await fetchViaHttp(trimmed)
      buffer = result.buffer
      mimeType = result.mimeType
    } else {
      const result = await fetchViaHttp(trimmed)
      buffer = result.buffer
      mimeType = result.mimeType
    }

    return {
      base64: buffer.toString('base64'),
      mimeType,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw formatDownloadError(trimmed, options.label, reason)
  }
}
