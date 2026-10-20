/**
 * Save remote media to disk without opening it in the browser.
 * Uses the File System Access API when available so the user can pick folder + filename.
 */

export interface SaveAudioFileOptions {
  url: string
  sceneNumber?: number
  track: 'narration' | 'dialogue' | 'music' | 'sfx'
  character?: string
  index?: number
  /** Override auto-generated filename (must include extension). */
  filename?: string
}

export interface SaveImageFileOptions {
  url: string
  sceneNumber?: number
  beatNumber?: number
  label?: string
  /** Override auto-generated filename (with or without extension). */
  filename?: string
}

export interface SaveVideoFileOptions {
  url: string
  sceneNumber?: number
  beatNumber?: number
  label?: string
  /** Override auto-generated filename (with or without extension). */
  filename?: string
}

export function sanitizeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return cleaned.slice(0, 120) || 'audio'
}

export function inferExtensionFromUrl(url: string, fallback = '.mp3'): string {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/(\.[a-zA-Z0-9]{2,5})(?:\?|$)/)
    if (match?.[1]) return match[1].toLowerCase()
  } catch {
    // ignore invalid URLs
  }
  return fallback
}

export function buildSuggestedAudioFilename(options: {
  sceneNumber?: number
  track: SaveAudioFileOptions['track']
  character?: string
  index?: number
  url: string
  filename?: string
}): string {
  if (options.filename) return sanitizeDownloadFilename(options.filename)

  const ext = inferExtensionFromUrl(options.url)
  const scenePrefix =
    typeof options.sceneNumber === 'number' ? `scene-${options.sceneNumber}` : 'scene'

  switch (options.track) {
    case 'narration':
      return `${scenePrefix}-narration${ext}`
    case 'music':
      return `${scenePrefix}-music${ext}`
    case 'sfx': {
      const sfxSuffix =
        typeof options.index === 'number' ? `-sfx-${options.index + 1}` : '-sfx'
      return `${scenePrefix}${sfxSuffix}${ext}`
    }
    case 'dialogue':
    default: {
      const characterPart = options.character
        ? `-${sanitizeDownloadFilename(options.character)}`
        : ''
      const indexPart =
        typeof options.index === 'number' ? `-line-${options.index + 1}` : ''
      return `${scenePrefix}${characterPart}${indexPart}${ext}`
    }
  }
}

function buildAcceptTypes(extension: string): Record<string, string[]> {
  switch (extension) {
    case '.mp3':
      return { 'audio/mpeg': ['.mp3'], 'audio/mp3': ['.mp3'] }
    case '.wav':
      return { 'audio/wav': ['.wav'], 'audio/x-wav': ['.wav'] }
    case '.m4a':
      return { 'audio/mp4': ['.m4a'], 'audio/x-m4a': ['.m4a'] }
    case '.ogg':
      return { 'audio/ogg': ['.ogg'] }
    case '.webm':
      return { 'audio/webm': ['.webm'] }
    default:
      return { 'audio/*': [extension], 'application/octet-stream': [extension] }
  }
}

function buildImageAcceptTypes(extension: string): Record<string, string[]> {
  switch (extension) {
    case '.png':
      return { 'image/png': ['.png'] }
    case '.jpg':
    case '.jpeg':
      return { 'image/jpeg': ['.jpg', '.jpeg'] }
    case '.webp':
      return { 'image/webp': ['.webp'] }
    case '.gif':
      return { 'image/gif': ['.gif'] }
    default:
      return { 'image/*': [extension], 'application/octet-stream': [extension] }
  }
}

function buildVideoAcceptTypes(extension: string): Record<string, string[]> {
  switch (extension) {
    case '.mp4':
    case '.m4v':
      return { 'video/mp4': ['.mp4', '.m4v'] }
    case '.webm':
      return { 'video/webm': ['.webm'] }
    case '.mov':
      return { 'video/quicktime': ['.mov'] }
    default:
      return { 'video/*': [extension], 'application/octet-stream': [extension] }
  }
}

export function buildSuggestedImageFilename(options: SaveImageFileOptions): string {
  const ext = inferExtensionFromUrl(options.url, '.png')
  if (options.filename) {
    const cleaned = sanitizeDownloadFilename(options.filename)
    return /\.(png|jpe?g|webp|gif|avif)$/i.test(cleaned) ? cleaned : `${cleaned}${ext}`
  }

  const parts: string[] = []
  if (typeof options.sceneNumber === 'number') parts.push(`scene-${options.sceneNumber}`)
  if (typeof options.beatNumber === 'number') parts.push(`shot-${options.beatNumber}`)
  if (options.label) parts.push(sanitizeDownloadFilename(options.label))
  const stem = parts.length > 0 ? parts.join('-') : 'still'
  return `${stem}${ext}`
}

export function buildSuggestedVideoFilename(options: SaveVideoFileOptions): string {
  const ext = inferExtensionFromUrl(options.url, '.mp4')
  if (options.filename) {
    const cleaned = sanitizeDownloadFilename(options.filename)
    return /\.(mp4|webm|mov|m4v)$/i.test(cleaned) ? cleaned : `${cleaned}${ext}`
  }

  const parts: string[] = []
  if (typeof options.sceneNumber === 'number') parts.push(`scene-${options.sceneNumber}`)
  if (typeof options.beatNumber === 'number') parts.push(`shot-${options.beatNumber}`)
  if (options.label) parts.push(sanitizeDownloadFilename(options.label))
  else parts.push('clip')
  const stem = parts.length > 0 ? parts.join('-') : 'clip'
  return `${stem}${ext}`
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file (HTTP ${response.status})`)
  }
  return response.blob()
}

async function writeBlobWithSavePicker(
  blob: Blob,
  suggestedName: string,
  description: string,
  accept: Record<string, string[]>
): Promise<'saved' | 'cancelled' | 'unsupported'> {
  if (typeof window.showSaveFilePicker !== 'function') {
    return 'unsupported'
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description,
          accept,
        },
      ],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'saved'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }
    throw error
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
}

/** Save audio to disk; returns false when the user cancels the save dialog. */
export async function saveAudioFile(options: SaveAudioFileOptions): Promise<boolean> {
  const suggestedName = buildSuggestedAudioFilename(options)
  const blob = await fetchBlob(options.url)
  const extension = inferExtensionFromUrl(options.url, '.mp3')

  const pickerResult = await writeBlobWithSavePicker(
    blob,
    suggestedName,
    'Audio file',
    buildAcceptTypes(extension)
  )
  if (pickerResult === 'saved') return true
  if (pickerResult === 'cancelled') return false

  triggerBlobDownload(blob, suggestedName)
  return true
}

/** Save still or reference image to disk; returns false when the user cancels the save dialog. */
export async function saveImageFile(options: SaveImageFileOptions): Promise<boolean> {
  const suggestedName = buildSuggestedImageFilename(options)
  const blob = await fetchBlob(options.url)
  const extension = inferExtensionFromUrl(options.url, '.png')

  const pickerResult = await writeBlobWithSavePicker(
    blob,
    suggestedName,
    'Image file',
    buildImageAcceptTypes(extension)
  )
  if (pickerResult === 'saved') return true
  if (pickerResult === 'cancelled') return false

  triggerBlobDownload(blob, suggestedName)
  return true
}

/** Save video clip to disk; returns false when the user cancels the save dialog. */
export async function saveVideoFile(options: SaveVideoFileOptions): Promise<boolean> {
  const suggestedName = buildSuggestedVideoFilename(options)
  const blob = await fetchBlob(options.url)
  const extension = inferExtensionFromUrl(options.url, '.mp4')

  const pickerResult = await writeBlobWithSavePicker(
    blob,
    suggestedName,
    'Video file',
    buildVideoAcceptTypes(extension)
  )
  if (pickerResult === 'saved') return true
  if (pickerResult === 'cancelled') return false

  triggerBlobDownload(blob, suggestedName)
  return true
}
