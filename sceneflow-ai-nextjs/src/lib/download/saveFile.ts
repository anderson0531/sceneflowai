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

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file (HTTP ${response.status})`)
  }
  return response.blob()
}

async function writeBlobWithSavePicker(blob: Blob, suggestedName: string, extension: string): Promise<boolean> {
  if (typeof window.showSaveFilePicker !== 'function') {
    return false
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Audio file',
          accept: buildAcceptTypes(extension),
        },
      ],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false
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

  const savedWithPicker = await writeBlobWithSavePicker(blob, suggestedName, extension)
  if (savedWithPicker) return true

  triggerBlobDownload(blob, suggestedName)
  return true
}
