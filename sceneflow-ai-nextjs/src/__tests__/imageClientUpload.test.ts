import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  IMAGE_CLIENT_CONTENT_TYPES,
  IMAGE_CLIENT_MAX_BYTES,
  IMAGE_CLIENT_MAX_MB,
  IMAGE_CLIENT_UPLOAD_PATH,
  formatImageUploadError,
} from '@/lib/vision/imageUploadLimits'
import { getAudioUploadEndpoint } from '@/lib/vision/uploads'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('formatImageUploadError', () => {
  it('names the 25MB cap when the file is over the Blob limit', () => {
    expect(formatImageUploadError(new Error('too large'), 30 * 1024 * 1024)).toBe(
      'Image is too large (30.0MB). Maximum size is 25MB.'
    )
  })

  it('maps a 413 / payload-too-large body to the size message', () => {
    expect(formatImageUploadError('Payload Too Large', 6 * 1024 * 1024)).toBe(
      'Image is too large (6.0MB). Maximum size is 25MB.'
    )
  })

  it('rejects an oversize still before posting through a Function', async () => {
    const { uploadAssetViaAPI } = await import('@/lib/vision/uploads')
    const file = new File(['still'], 'frame.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 })
    await expect(uploadAssetViaAPI(file, 'proj_1')).rejects.toThrow(
      /Image is too large \(26\.0MB\)\. Maximum size is 25MB/
    )
  })
})

describe('image client upload wiring', () => {
  it('token route allows listed MIME types at 25MB', () => {
    expect(IMAGE_CLIENT_UPLOAD_PATH).toBe('/api/upload/image-url')
    expect(IMAGE_CLIENT_MAX_BYTES).toBe(25 * 1024 * 1024)
    expect(IMAGE_CLIENT_MAX_MB).toBe(25)
    expect([...IMAGE_CLIENT_CONTENT_TYPES]).toEqual([
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif',
    ])

    const route = readSource('src/app/api/upload/image-url/route.ts')
    expect(route).toContain("from '@vercel/blob/client'")
    expect(route).toContain('IMAGE_CLIENT_CONTENT_TYPES')
    expect(route).toContain('IMAGE_CLIENT_MAX_BYTES')
    expect(route).toContain("export const runtime = 'edge'")
  })

  it('browser image uploads use the Blob client token; audio stays on the audio endpoint', () => {
    const src = readSource('src/lib/vision/uploads.ts')
    expect(src).toContain("await import('@vercel/blob/client')")
    expect(src).toContain('IMAGE_CLIENT_UPLOAD_PATH')
    expect(src).toContain('handleUploadUrl: IMAGE_CLIENT_UPLOAD_PATH')
    expect(src).toContain("file.type.startsWith('audio/')")
    expect(src).toContain("isAudio ? getAudioUploadEndpoint() : '/api/upload/image'")
    expect(getAudioUploadEndpoint()).toBe('/api/audio/upload')
  })

  it('beat-frame and leftover vision/studio callers go through uploadAssetViaAPI', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('uploadAssetViaAPI(file, projectId)')
    expect(page).toContain("toast.error(error instanceof Error ? error.message : 'Failed to upload beat frame')")
    expect(page).not.toContain("fetch('/api/upload/image'")

    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('uploadAssetViaAPI(file, projectId)')
    expect(studio).not.toContain("fetch('/api/upload/image'")
  })
})
