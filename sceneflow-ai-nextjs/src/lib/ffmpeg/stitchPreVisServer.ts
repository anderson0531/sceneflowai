import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, promises as fs, type ReadStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { put } from '@vercel/blob'
import { inspectMediaWithFfmpeg, runFfmpeg } from '@/lib/ffmpeg/runFfmpeg'

const TRUSTED_STITCH_DOMAINS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
  '.public.blob.vercel-storage.com',
  '.vercel-storage.com',
] as const

const MAX_STITCH_CLIPS = 200
const DOWNLOAD_CONCURRENCY = 4
const DOWNLOAD_TIMEOUT_MS = 60_000
const MAX_TOTAL_INPUT_BYTES = 400 * 1024 * 1024 // Stay safely within Vercel Function /tmp limits
const FILTER_BATCH_SIZE = 6
const DEFAULT_SILENT_CLIP_DURATION_SEC = 5

export type PreVisStitchResolution = '720p' | '1080p' | '4K'

/**
 * Validate that a clip URL is a safe HTTPS URL on a trusted SceneFlow media host
 * (Vercel Blob or Google Cloud Storage) to prevent SSRF or local file inclusion.
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
 * Escape a validated URL or file path for FFmpeg's concat demuxer (`file '...'` syntax).
 */
export function escapeConcatDemuxerUrl(url: string): string {
  return url.replace(/'/g, "'\\''")
}

/**
 * Validate an ordered list of clip URLs and return trimmed URLs.
 */
function validateStitchUrls(urls: readonly string[]): string[] {
  if (!Array.isArray(urls) || urls.length < 2) {
    throw new Error('At least 2 scene video URLs are required to stitch a combined Pre-Vis video')
  }
  if (urls.length > MAX_STITCH_CLIPS) {
    throw new Error(`Cannot stitch more than ${MAX_STITCH_CLIPS} scenes in a single request`)
  }

  const validated: string[] = []
  for (let i = 0; i < urls.length; i++) {
    const candidate = typeof urls[i] === 'string' ? urls[i].trim() : ''
    if (!isTrustedPreVisStitchUrl(candidate)) {
      throw new Error(`Untrusted or invalid scene video URL at index ${i}`)
    }
    validated.push(candidate)
  }
  return validated
}

/**
 * Build a validated FFmpeg `-f concat` manifest from an ordered list of clip URLs.
 */
export function buildFfmpegConcatManifest(urls: readonly string[]): string {
  const validated = validateStitchUrls(urls)
  const lines = validated.map((u) => `file '${escapeConcatDemuxerUrl(u)}'`)
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

export interface ProbedMediaStreams {
  probed: boolean
  hasVideo: boolean
  hasAudio: boolean
  width: number | null
  height: number | null
  durationSeconds: number | null
}

/**
 * Parse `ffmpeg -hide_banner -i <file>` stderr to inspect stream presence, dimensions,
 * and header duration without needing a separate `ffprobe` binary.
 */
export function parseFfmpegStreamProbe(stderr: string): ProbedMediaStreams {
  if (typeof stderr !== 'string' || !/Input #0\b/i.test(stderr)) {
    return {
      probed: false,
      hasVideo: true,
      hasAudio: true,
      width: null,
      height: null,
      durationSeconds: null,
    }
  }

  const videoLineMatch = stderr.match(/Stream #0:\d+[^\r\n]*?:\s*Video:[^\r\n]*/i)
  const audioLineMatch = stderr.match(/Stream #0:\d+[^\r\n]*?:\s*Audio:[^\r\n]*/i)

  let width: number | null = null
  let height: number | null = null
  if (videoLineMatch) {
    const dimMatch = videoLineMatch[0].match(/(?:,|\s)([1-9]\d{1,4})x([1-9]\d{1,4})(?=[\s,\[])/i)
    if (dimMatch) {
      width = Number.parseInt(dimMatch[1], 10)
      height = Number.parseInt(dimMatch[2], 10)
    }
  }

  let durationSeconds: number | null = null
  const durMatch = stderr.match(/Duration:\s*(\d{2,}):(\d{2}):(\d{2}(?:\.\d+)?)/i)
  if (durMatch) {
    const hours = Number.parseInt(durMatch[1], 10)
    const minutes = Number.parseInt(durMatch[2], 10)
    const seconds = Number.parseFloat(durMatch[3])
    const total = hours * 3600 + minutes * 60 + seconds
    if (Number.isFinite(total) && total > 0) {
      durationSeconds = total
    }
  }

  return {
    probed: true,
    hasVideo: Boolean(videoLineMatch),
    hasAudio: Boolean(audioLineMatch),
    width,
    height,
    durationSeconds,
  }
}

export interface ConcatFilterInputSpec {
  hasAudio: boolean
  fallbackDurationSec?: number
}

export function resolveStitchCanvasDimensions(
  resolution?: PreVisStitchResolution,
  firstProbe?: Pick<ProbedMediaStreams, 'width' | 'height'>
): { width: number; height: number } {
  const probedW = firstProbe?.width && firstProbe.width >= 16 ? firstProbe.width : null
  const probedH = firstProbe?.height && firstProbe.height >= 16 ? firstProbe.height : null

  if (!resolution) {
    if (probedW && probedH) {
      return {
        width: Math.max(2, Math.round(probedW / 2) * 2),
        height: Math.max(2, Math.round(probedH / 2) * 2),
      }
    }
    return { width: 1920, height: 1080 }
  }

  const preset: Record<PreVisStitchResolution, [number, number]> = {
    '720p': [1280, 720],
    '1080p': [1920, 1080],
    '4K': [3840, 2160],
  }
  const [longEdge, shortEdge] = preset[resolution] || preset['1080p']

  if (probedW && probedH) {
    if (probedW === probedH) {
      return { width: shortEdge, height: shortEdge }
    }
    if (probedH > probedW) {
      return { width: shortEdge, height: longEdge }
    }
  }
  return { width: longEdge, height: shortEdge }
}

/**
 * Build a stream-type-explicit FFmpeg `-filter_complex` concat graph (`[k:v:0]` / `[k:a:0]`).
 *
 * Why never `-f concat -c copy` on browser `MediaRecorder` outputs:
 * 1. Chromium's `Mp4MuxerDelegate` / `WebmMuxer` orders `Stream #0:0` vs `#0:1` dynamically by
 *    whichever encoder emits its first packet first. When Scene 1 is `(0:v, 1:a)` and Scene 2 is
 *    `(0:a, 1:v)`, `-f concat -c copy` matches by stream index, exits 0, and drops Scene 2 video!
 * 2. Separate hardware `VTCompressionSession` / MediaFoundation H.264 encodes emit distinct
 *    `avcC` SPS/PPS parameter sets with no in-band headers; MP4 `-c copy` retains only Scene 1's
 *    `avcC`, causing hardware decoders to drop Scene 2+ frames while playing AAC audio normally.
 * 3. `MediaRecorder` emits VFR fragmented MP4 (`empty_moov`, `mvhd.duration=0`) or unindexed WebM
 *    with wall-clock jitter. Normalizing PTS + CFR 30fps + 44.1kHz stereo guarantees frame-accurate
 *    playback and seeking across all scenes.
 */
export function buildConcatFilterGraph(
  inputs: readonly ConcatFilterInputSpec[],
  dimensions: { width: number; height: number } = { width: 1920, height: 1080 }
): string {
  if (inputs.length < 2) {
    throw new Error('At least 2 clips are required to build a concat filter graph')
  }

  const width = Math.max(2, Math.round(dimensions.width / 2) * 2)
  const height = Math.max(2, Math.round(dimensions.height / 2) * 2)

  const chains: string[] = []
  const concatInputs: string[] = []

  for (let k = 0; k < inputs.length; k++) {
    const spec = inputs[k]
    chains.push(
      `[${k}:v:0]setpts=PTS-STARTPTS,fps=30,` +
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,` +
        `setsar=1,format=yuv420p[v${k}]`
    )

    if (spec.hasAudio) {
      chains.push(
        `[${k}:a:0]asetpts=PTS-STARTPTS,` +
          `aresample=44100:async=1,` +
          `aformat=sample_fmts=fltp:channel_layouts=stereo[a${k}]`
      )
    } else {
      const safeDur = Math.max(
        0.25,
        Number.isFinite(spec.fallbackDurationSec) && (spec.fallbackDurationSec ?? 0) > 0
          ? (spec.fallbackDurationSec as number)
          : DEFAULT_SILENT_CLIP_DURATION_SEC
      )
      chains.push(
        `anullsrc=channel_layout=stereo:sample_rate=44100:d=${safeDur.toFixed(3)},` +
          `aformat=sample_fmts=fltp:channel_layouts=stereo,` +
          `asetpts=PTS-STARTPTS[a${k}]`
      )
    }

    concatInputs.push(`[v${k}][a${k}]`)
  }

  chains.push(`${concatInputs.join('')}concat=n=${inputs.length}:v=1:a=1[vout][aout]`)
  return chains.join(';')
}

export interface StitchPreVisServerParams {
  urls: string[]
  projectId?: string
  language?: string
  container?: 'mp4' | 'webm'
  durations?: number[]
  resolution?: PreVisStitchResolution
}

export interface StitchPreVisServerResult {
  url: string
  downloadUrl: string
  mimeType: string
  container: 'mp4' | 'webm'
  transcoded: boolean
}

interface StagedStitchClip {
  filePath: string
  hasAudio: boolean
  fallbackDurationSec: number
}

async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = nextIndex++
      if (idx >= items.length) break
      results[idx] = await worker(items[idx], idx)
    }
  })

  await Promise.all(runners)
  return results
}

async function downloadClipToFile(
  url: string,
  destPath: string,
  sceneNumber: number,
  byteTracker: { totalBytes: number }
): Promise<void> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch scene ${sceneNumber} video clip: HTTP ${res.status}`)
    }

    if (res.url && !isTrustedPreVisStitchUrl(res.url)) {
      throw new Error(`Untrusted redirect URL while fetching scene ${sceneNumber} video`)
    }

    let clipBytes = 0

    if (res.body && typeof res.body.getReader === 'function') {
      const fileStream = createWriteStream(destPath)
      const reader = res.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value && value.byteLength > 0) {
            clipBytes += value.byteLength
            byteTracker.totalBytes += value.byteLength
            if (byteTracker.totalBytes > MAX_TOTAL_INPUT_BYTES) {
              throw new Error(
                `Combined Pre-Vis scene clips exceed the ${Math.round(MAX_TOTAL_INPUT_BYTES / (1024 * 1024))}MB server stitch limit`
              )
            }
            const canContinue = fileStream.write(Buffer.from(value.buffer, value.byteOffset, value.byteLength))
            if (!canContinue) {
              await new Promise<void>((resolve, reject) => {
                const onDrain = () => {
                  fileStream.off('error', onErr)
                  resolve()
                }
                const onErr = (err: Error) => {
                  fileStream.off('drain', onDrain)
                  reject(err)
                }
                fileStream.once('drain', onDrain)
                fileStream.once('error', onErr)
              })
            }
          }
        }
        await new Promise<void>((resolve, reject) => {
          fileStream.end((err?: Error | null) => (err ? reject(err) : resolve()))
        })
      } catch (err) {
        fileStream.destroy()
        await reader.cancel().catch(() => {})
        throw err
      }
    } else {
      const arrayBuf = await res.arrayBuffer()
      clipBytes = arrayBuf.byteLength
      byteTracker.totalBytes += clipBytes
      if (byteTracker.totalBytes > MAX_TOTAL_INPUT_BYTES) {
        throw new Error(
          `Combined Pre-Vis scene clips exceed the ${Math.round(MAX_TOTAL_INPUT_BYTES / (1024 * 1024))}MB server stitch limit`
        )
      }
      await fs.writeFile(destPath, Buffer.from(arrayBuf))
    }

    if (clipBytes <= 0) {
      throw new Error(`Scene ${sceneNumber} video clip download was empty (0 bytes)`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function runNormalizedBatchEncode(args: {
  batch: readonly StagedStitchClip[]
  outPath: string
  dimensions: { width: number; height: number }
  outputContainer: 'mp4' | 'webm'
  isIntermediate: boolean
}): Promise<void> {
  const { batch, outPath, dimensions, outputContainer, isIntermediate } = args
  const ffmpegArgs: string[] = ['-y']

  for (const clip of batch) {
    ffmpegArgs.push('-threads', '2', '-i', clip.filePath)
  }

  const filterGraph = buildConcatFilterGraph(batch, dimensions)
  ffmpegArgs.push('-filter_complex', filterGraph, '-map', '[vout]', '-map', '[aout]')

  if (outputContainer === 'webm' && !isIntermediate) {
    ffmpegArgs.push(
      '-c:v',
      'libvpx',
      '-deadline',
      'realtime',
      '-cpu-used',
      '6',
      '-crf',
      '10',
      '-b:v',
      '4M',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'libopus',
      '-b:a',
      '128k',
      outPath
    )
  } else {
    ffmpegArgs.push(
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      isIntermediate ? '19' : '21',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-b:a',
      '160k',
      ...(isIntermediate ? [] : ['-movflags', '+faststart']),
      outPath
    )
  }

  await runFfmpeg(ffmpegArgs)
  const stat = await fs.stat(outPath)
  if (stat.size <= 0) {
    throw new Error('FFmpeg normalized Pre-Vis stitch produced an empty output file')
  }
}

/**
 * Download per-scene Pre-Vis video clips to `/tmp` via Node `fetch` (because Linux `ffmpeg-static`
 * builds omit OpenSSL/HTTPS), inspect their streams, stitch via a stream-normalized `-filter_complex`
 * `concat=n=K:v=1:a=1` pipeline in memory-bounded batches, and upload a seekable MP4 master.
 */
export async function stitchPreVisClipsServer(
  params: StitchPreVisServerParams
): Promise<StitchPreVisServerResult> {
  const validatedUrls = validateStitchUrls(params.urls)
  const finalContainer: 'mp4' | 'webm' = params.container === 'webm' ? 'webm' : 'mp4'

  const jobId = randomUUID()
  const tmpDir = os.tmpdir()
  const tempFiles = new Set<string>()
  let uploadStream: ReadStream | null = null

  const registerTemp = (filePath: string): string => {
    tempFiles.add(filePath)
    return filePath
  }

  const removeTemp = async (filePath: string): Promise<void> => {
    tempFiles.delete(filePath)
    await fs.unlink(filePath).catch(() => {})
  }

  try {
    // 1. Download all clips via Node HTTPS fetch (works identically on Vercel Linux & macOS)
    const byteTracker = { totalBytes: 0 }
    const inputPaths = await runWithConcurrency(
      validatedUrls,
      DOWNLOAD_CONCURRENCY,
      async (url, idx) => {
        const ext = detectUrlExtension(url)
        const safeExt = ext === 'webm' ? 'webm' : 'mp4'
        const localPath = registerTemp(
          path.join(tmpDir, `sceneflow-previs-in-${jobId}-${idx}.${safeExt}`)
        )
        await downloadClipToFile(url, localPath, idx + 1, byteTracker)
        return localPath
      }
    )

    // 2. Probe stream layout of each downloaded clip so stream-order swaps, missing audio,
    //    or corrupt video-less uploads are caught/handled deterministically.
    const probes = await runWithConcurrency(inputPaths, DOWNLOAD_CONCURRENCY, async (localPath) => {
      if (typeof inspectMediaWithFfmpeg !== 'function') {
        return parseFfmpegStreamProbe('')
      }
      const stderr = await inspectMediaWithFfmpeg(localPath).catch(() => '')
      return parseFfmpegStreamProbe(stderr)
    })

    for (let i = 0; i < probes.length; i++) {
      if (probes[i].probed && !probes[i].hasVideo) {
        throw new Error(
          `Scene ${i + 1} video clip contains audio only (missing visual video stream). Re-render Scene ${i + 1} before stitching.`
        )
      }
    }

    const targetDimensions = resolveStitchCanvasDimensions(params.resolution, probes[0])

    let currentStage: StagedStitchClip[] = inputPaths.map((filePath, idx) => {
      const callerDur = params.durations?.[idx]
      const probedDur = probes[idx].durationSeconds
      const fallbackDurationSec =
        typeof callerDur === 'number' && Number.isFinite(callerDur) && callerDur > 0.2
          ? callerDur
          : probedDur && probedDur > 0.2
            ? probedDur
            : DEFAULT_SILENT_CLIP_DURATION_SEC

      return {
        filePath,
        hasAudio: probes[idx].hasAudio,
        fallbackDurationSec,
      }
    })

    // 3. Hierarchical batch stitching (`<= 6` open decoders per FFmpeg invocation) to bound RAM
    //    and `/tmp` usage even for 16–50+ scene feature animatics.
    let round = 0
    while (currentStage.length > FILTER_BATCH_SIZE) {
      const nextStage: StagedStitchClip[] = []
      for (let offset = 0; offset < currentStage.length; offset += FILTER_BATCH_SIZE) {
        const chunk = currentStage.slice(offset, offset + FILTER_BATCH_SIZE)
        if (chunk.length === 1) {
          nextStage.push(chunk[0])
          continue
        }

        const interPath = registerTemp(
          path.join(tmpDir, `sceneflow-previs-inter-${jobId}-r${round}-${offset}.mp4`)
        )
        await runNormalizedBatchEncode({
          batch: chunk,
          outPath: interPath,
          dimensions: targetDimensions,
          outputContainer: 'mp4',
          isIntermediate: true,
        })

        await Promise.all(chunk.map((c) => removeTemp(c.filePath)))
        nextStage.push({
          filePath: interPath,
          hasAudio: true,
          fallbackDurationSec: chunk.reduce((sum, c) => sum + c.fallbackDurationSec, 0),
        })
      }
      currentStage = nextStage
      round += 1
    }

    const finalOutPath = registerTemp(
      path.join(tmpDir, `sceneflow-previs-out-${jobId}.${finalContainer}`)
    )

    await runNormalizedBatchEncode({
      batch: currentStage,
      outPath: finalOutPath,
      dimensions: targetDimensions,
      outputContainer: finalContainer,
      isIntermediate: false,
    })

    await Promise.all(currentStage.map((c) => removeTemp(c.filePath)))

    // 4. Sanity-probe output file when FFmpeg inspection is active
    if (typeof inspectMediaWithFfmpeg === 'function') {
      const outStderr = await inspectMediaWithFfmpeg(finalOutPath).catch(() => '')
      const outProbe = parseFfmpegStreamProbe(outStderr)
      if (outProbe.probed && !outProbe.hasVideo) {
        throw new Error('Stitched Pre-Vis output failed verification: missing visual video stream')
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
      transcoded: true,
    }
  } finally {
    if (uploadStream) {
      uploadStream.destroy()
    }
    await Promise.all(Array.from(tempFiles).map((f) => fs.unlink(f).catch(() => {})))
  }
}
