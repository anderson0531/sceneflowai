import { randomUUID } from 'node:crypto'
import { createReadStream, promises as fs, type ReadStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { put } from '@vercel/blob'
import { runFfmpeg } from '@/lib/ffmpeg/runFfmpeg'

const TRUSTED_STITCH_DOMAINS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
  '.public.blob.vercel-storage.com',
  '.vercel-storage.com',
] as const

const MAX_STITCH_CLIPS = 200

/**
 * Validate that a clip URL is a safe HTTPS URL on a trusted SceneFlow media host
 * (Vercel Blob or Google Cloud Storage) to prevent SSRF or local file inclusion via FFmpeg.
 */
export function isTrustedPreVisStitchUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string') return false
  const trimmed = rawUrl.trim()
  if (!trimmed || /[\r\n\0]/.test(trimmed)) return false

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return TRUSTED_STITCH_DOMAINS.some((domain) =>
      domain.startsWith('.') ? host.endsWith(domain) : host === domain
    )
  } catch {
    return false
  }
}

/**
 * Escape a validated HTTPS URL for FFmpeg's concat demuxer (`file '...'` syntax).
 */
export function escapeConcatDemuxerUrl(url: string): string {
  return url.replace(/'/g, "'\\''")
}

/**
 * Build a validated FFmpeg `-f concat` manifest from an ordered list of clip URLs.
 */
export function buildFfmpegConcatManifest(urls: readonly string[]): string {
  if (!Array.isArray(urls) || urls.length < 2) {
    throw new Error('At least 2 scene video URLs are required to stitch a combined Pre-Vis video')
  }
  if (urls.length > MAX_STITCH_CLIPS) {
    throw new Error(`Cannot stitch more than ${MAX_STITCH_CLIPS} scenes in a single request`)
  }

  const lines: string[] = []
  for (let i = 0; i < urls.length; i++) {
    const candidate = typeof urls[i] === 'string' ? urls[i].trim() : ''
    if (!isTrustedPreVisStitchUrl(candidate)) {
      throw new Error(`Untrusted or invalid scene video URL at index ${i}`)
    }
    lines.push(`file '${escapeConcatDemuxerUrl(candidate)}'`)
  }

  return `${lines.join('\n')}\n`
}

function detectUrlExtension(url: string): 'mp4' | 'webm' | 'unknown' {
  try {
    const pathname = new URL(url.trim()).pathname.toLowerCase()
    if (pathname.endsWith('.mp4')) return 'mp4'
    if (pathname.endsWith('.webm')) return 'webm'
  } catch {
    // ignore
  }
  return 'unknown'
}

export function inferPreVisStitchPlan(
  urls: readonly string[],
  requestedContainer?: 'mp4' | 'webm'
): { container: 'mp4' | 'webm'; mixedContainers: boolean } {
  const exts = urls.map(detectUrlExtension).filter((e) => e !== 'unknown')
  const hasMp4 = exts.includes('mp4')
  const hasWebm = exts.includes('webm')
  const mixedContainers = hasMp4 && hasWebm

  if (mixedContainers) {
    return { container: 'mp4', mixedContainers: true }
  }
  if (hasWebm && !hasMp4) {
    return {
      container: requestedContainer === 'mp4' ? 'mp4' : 'webm',
      mixedContainers: requestedContainer === 'mp4',
    }
  }
  if (requestedContainer === 'webm' && !hasMp4) {
    return { container: 'webm', mixedContainers: false }
  }
  return { container: 'mp4', mixedContainers: false }
}

export interface StitchPreVisServerParams {
  urls: string[]
  projectId?: string
  language?: string
  container?: 'mp4' | 'webm'
}

export interface StitchPreVisServerResult {
  url: string
  downloadUrl: string
  mimeType: string
  container: 'mp4' | 'webm'
  transcoded: boolean
}

/**
 * Losslessly stitch per-scene Pre-Vis video URLs on the server using FFmpeg's concat
 * demuxer reading inputs directly over HTTPS (0 MB input disk footprint in `/tmp`) and
 * streaming the resulting seekable master to Vercel Blob.
 */
export async function stitchPreVisClipsServer(
  params: StitchPreVisServerParams
): Promise<StitchPreVisServerResult> {
  const manifest = buildFfmpegConcatManifest(params.urls)
  const { container: initialContainer, mixedContainers } = inferPreVisStitchPlan(
    params.urls,
    params.container
  )

  const jobId = randomUUID()
  const tmpDir = os.tmpdir()
  const listPath = path.join(tmpDir, `sceneflow-previs-concat-${jobId}.txt`)
  const copyOutPath = path.join(tmpDir, `sceneflow-previs-copy-${jobId}.${initialContainer}`)
  const transcodeOutPath = path.join(tmpDir, `sceneflow-previs-transcode-${jobId}.mp4`)

  let finalOutPath = copyOutPath
  let finalContainer: 'mp4' | 'webm' = initialContainer
  let transcoded = false
  let uploadStream: ReadStream | null = null

  try {
    await fs.writeFile(listPath, manifest, 'utf8')

    if (!mixedContainers) {
      try {
        const copyArgs = [
          '-y',
          '-protocol_whitelist',
          'file,http,https,tcp,tls,crypto',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listPath,
          '-c',
          'copy',
          ...(initialContainer === 'mp4' ? ['-movflags', '+faststart'] : []),
          copyOutPath,
        ]
        await runFfmpeg(copyArgs)
        const stat = await fs.stat(copyOutPath)
        if (stat.size <= 0) {
          throw new Error('FFmpeg stream copy produced an empty output file')
        }
      } catch (copyErr) {
        console.warn(
          '[stitchPreVisClipsServer] Stream-copy concat failed, falling back to fast H.264/AAC transcode:',
          copyErr instanceof Error ? copyErr.message : copyErr
        )
        finalOutPath = transcodeOutPath
        finalContainer = 'mp4'
        transcoded = true
      }
    } else {
      finalOutPath = transcodeOutPath
      finalContainer = 'mp4'
      transcoded = true
    }

    if (transcoded) {
      const transcodeArgs = [
        '-y',
        '-protocol_whitelist',
        'file,http,https,tcp,tls,crypto',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        transcodeOutPath,
      ]
      await runFfmpeg(transcodeArgs)
      const stat = await fs.stat(transcodeOutPath)
      if (stat.size <= 0) {
        throw new Error('FFmpeg transcode concat produced an empty output file')
      }
    }

    const safeProject = (params.projectId || 'project')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 64)
    const safeLang = (params.language || 'en')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 16)
    const mimeType = finalContainer === 'mp4' ? 'video/mp4' : 'video/webm'
    const pathname = `renders/previs/${safeProject}/combined-${safeLang}-${Date.now()}.${finalContainer}`

    uploadStream = createReadStream(finalOutPath)
    uploadStream.on('error', () => {
      // Prevent unhandled stream error if upload aborts before async open completes
    })

    const uploaded = await put(pathname, uploadStream, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: true,
      multipart: true,
    })

    return {
      url: uploaded.url,
      downloadUrl: uploaded.downloadUrl || uploaded.url,
      mimeType,
      container: finalContainer,
      transcoded,
    }
  } finally {
    if (uploadStream) {
      uploadStream.destroy()
    }
    await Promise.all([
      fs.unlink(listPath).catch(() => {}),
      fs.unlink(copyOutPath).catch(() => {}),
      fs.unlink(transcodeOutPath).catch(() => {}),
    ])
  }
}
