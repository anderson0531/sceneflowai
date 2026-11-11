import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { runFfmpegMock, inspectMediaMock, putMock } = vi.hoisted(() => ({
  runFfmpegMock: vi.fn(),
  inspectMediaMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/lib/ffmpeg/runFfmpeg', () => ({
  runFfmpeg: runFfmpegMock,
  inspectMediaWithFfmpeg: inspectMediaMock,
}))

vi.mock('@vercel/blob', () => ({
  put: putMock,
}))

import {
  buildConcatFilterGraph,
  buildFfmpegConcatManifest,
  inferPreVisStitchPlan,
  isTrustedPreVisStitchUrl,
  parseFfmpegStreamProbe,
  resolveStitchCanvasDimensions,
  stitchPreVisClipsServer,
} from '@/lib/ffmpeg/stitchPreVisServer'

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

describe('stitchPreVisServer & normalized multi-scene FFmpeg stitch', () => {
  beforeEach(() => {
    runFfmpegMock.mockReset()
    inspectMediaMock.mockReset()
    putMock.mockReset()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        return new Response(Buffer.from(`mock-video-bytes-for-${url}`), {
          status: 200,
          headers: { 'Content-Type': 'video/mp4' },
        })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates trusted HTTPS media storage URLs and blocks SSRF / injection vectors', () => {
    expect(
      isTrustedPreVisStitchUrl(
        'https://store123.public.blob.vercel-storage.com/renders/previs/s1.mp4'
      )
    ).toBe(true)
    expect(
      isTrustedPreVisStitchUrl('https://storage.googleapis.com/sceneflow-bucket/s2.mp4')
    ).toBe(true)

    // Disallow non-HTTPS, local files, metadata IPs, untrusted domains, and CRLF injection
    expect(
      isTrustedPreVisStitchUrl(
        'http://store123.public.blob.vercel-storage.com/renders/previs/s1.mp4'
      )
    ).toBe(false)
    expect(isTrustedPreVisStitchUrl('file:///etc/passwd')).toBe(false)
    expect(isTrustedPreVisStitchUrl('https://169.254.169.254/latest/meta-data')).toBe(false)
    expect(isTrustedPreVisStitchUrl('https://attacker.example.com/s1.mp4')).toBe(false)
    expect(
      isTrustedPreVisStitchUrl(
        "https://store123.public.blob.vercel-storage.com/s1.mp4'\nfile '/etc/passwd"
      )
    ).toBe(false)
  })

  it('builds escaped FFmpeg concat manifests for 16 scenes', () => {
    const urls = Array.from(
      { length: 16 },
      (_, i) =>
        `https://store123.public.blob.vercel-storage.com/renders/previs/scene-${i + 1}-it's.mp4`
    )
    const manifest = buildFfmpegConcatManifest(urls)
    const lines = manifest.trim().split('\n')
    expect(lines).toHaveLength(16)
    expect(lines[0]).toBe(
      "file 'https://store123.public.blob.vercel-storage.com/renders/previs/scene-1-it'\\''s.mp4'"
    )
    expect(lines[15]).toContain('scene-16-')
  })

  it('infers container and mixed-container transcode requirement accurately', () => {
    expect(
      inferPreVisStitchPlan([
        'https://a.public.blob.vercel-storage.com/1.mp4',
        'https://a.public.blob.vercel-storage.com/2.mp4',
      ])
    ).toEqual({ container: 'mp4', mixedContainers: false })

    expect(
      inferPreVisStitchPlan([
        'https://a.public.blob.vercel-storage.com/1.webm',
        'https://a.public.blob.vercel-storage.com/2.webm',
      ])
    ).toEqual({ container: 'webm', mixedContainers: false })

    expect(
      inferPreVisStitchPlan([
        'https://a.public.blob.vercel-storage.com/1.mp4',
        'https://a.public.blob.vercel-storage.com/2.webm',
      ])
    ).toEqual({ container: 'mp4', mixedContainers: true })
  })

  it('parses FFmpeg stream probe output for swapped streams, missing video, and portrait dimensions', () => {
    const swappedProbe = parseFfmpegStreamProbe(`
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/tmp/scene2.mp4':
  Duration: 00:00:14.50, start: 0.000000, bitrate: 1450 kb/s
  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706d), 44100 Hz, stereo, fltp, 128 kb/s
  Stream #0:1[0x2](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1080x1920 [SAR 1:1 DAR 9:16], 30 fps
`)
    expect(swappedProbe).toEqual({
      probed: true,
      hasVideo: true,
      hasAudio: true,
      width: 1080,
      height: 1920,
      durationSeconds: 14.5,
    })
    expect(resolveStitchCanvasDimensions('1080p', swappedProbe)).toEqual({
      width: 1080,
      height: 1920,
    })

    const audioOnlyProbe = parseFfmpegStreamProbe(`
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/tmp/broken-scene2.mp4':
  Duration: 00:00:10.00, start: 0.000000, bitrate: 128 kb/s
  Stream #0:0[0x1](und): Audio: aac (LC), 44100 Hz, stereo, fltp, 128 kb/s
`)
    expect(audioOnlyProbe.probed).toBe(true)
    expect(audioOnlyProbe.hasVideo).toBe(false)
    expect(audioOnlyProbe.hasAudio).toBe(true)
  })

  it('builds stream-type-explicit filter_complex graphs and synthesizes silence when a clip has no audio', () => {
    const graph = buildConcatFilterGraph(
      [
        { hasAudio: true, fallbackDurationSec: 8 },
        { hasAudio: false, fallbackDurationSec: 6.5 },
      ],
      { width: 1280, height: 720 }
    )
    expect(graph).toContain('[0:v:0]setpts=PTS-STARTPTS,fps=30,scale=1280:720')
    expect(graph).toContain('[0:a:0]asetpts=PTS-STARTPTS,aresample=44100:async=1')
    expect(graph).toContain('[1:v:0]setpts=PTS-STARTPTS,fps=30,scale=1280:720')
    expect(graph).toContain('anullsrc=channel_layout=stereo:sample_rate=44100:d=6.500')
    expect(graph).toContain('[v0][a0][v1][a1]concat=n=2:v=1:a=1[vout][aout]')
  })

  it('downloads clips locally, batches 16 scenes in <=6-decoder stages, and uploads seekable MP4', async () => {
    inspectMediaMock.mockResolvedValue('')
    runFfmpegMock.mockImplementation(async (args: string[]) => {
      const outPath = args[args.length - 1]
      await fs.writeFile(outPath, Buffer.from('normalized-mp4-output'))
    })
    putMock.mockImplementation(async (_pathname: string, stream: Readable) => {
      await streamToBuffer(stream)
      return {
        url: 'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-en.mp4',
        downloadUrl:
          'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-en.mp4?download=1',
      }
    })

    const urls = Array.from(
      { length: 16 },
      (_, i) => `https://store123.public.blob.vercel-storage.com/renders/s-${i + 1}.mp4`
    )

    const res = await stitchPreVisClipsServer({
      urls,
      projectId: 'proj-123',
      language: 'en',
      resolution: '1080p',
    })

    // 16 scenes -> Round 1 batches [6, 6, 4] (3 encodes) + Round 2 final [3] (1 encode) = 4 FFmpeg passes
    expect(runFfmpegMock).toHaveBeenCalledTimes(4)
    for (const [callArgs] of runFfmpegMock.mock.calls as [string[]][]) {
      // Never pass https:// URLs directly to Linux ffmpeg-static (which lacks OpenSSL/TLS)
      expect(callArgs).not.toContain('-protocol_whitelist')
      expect(callArgs).toContain('-filter_complex')
      expect(callArgs).toContain('libx264')
      expect(callArgs).toContain('aac')
      const inputCount = callArgs.filter((arg) => arg === '-i').length
      expect(inputCount).toBeLessThanOrEqual(6)
    }

    const finalArgs = runFfmpegMock.mock.calls[3][0] as string[]
    expect(finalArgs).toContain('+faststart')

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock.mock.calls[0][2]).toMatchObject({
      access: 'public',
      contentType: 'video/mp4',
      multipart: true,
    })

    expect(res).toEqual({
      url: 'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-en.mp4',
      downloadUrl:
        'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-en.mp4?download=1',
      mimeType: 'video/mp4',
      container: 'mp4',
      transcoded: true,
    })
  })

  it('rejects clearly when a scene clip is audio-only (missing visual video stream)', async () => {
    inspectMediaMock
      .mockResolvedValueOnce(`
Input #0, mov,mp4, from '/tmp/s1.mp4':
  Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps
  Stream #0:1: Audio: aac, 44100 Hz, stereo, fltp
`)
      .mockResolvedValueOnce(`
Input #0, mov,mp4, from '/tmp/s2.mp4':
  Stream #0:0: Audio: aac, 44100 Hz, stereo, fltp
`)

    await expect(
      stitchPreVisClipsServer({
        urls: [
          'https://store123.public.blob.vercel-storage.com/renders/s-1.mp4',
          'https://store123.public.blob.vercel-storage.com/renders/s-2.mp4',
        ],
      })
    ).rejects.toThrow(/Scene 2 video clip contains audio only \(missing visual video stream\)/)
    expect(runFfmpegMock).not.toHaveBeenCalled()
  })

  it('preserves Scene 1 AND Scene 2 visual frames + audio end-to-end with real ffmpeg-static when stream order & H.264 SPS/PPS differ', async () => {
    const actualFfmpeg = await vi.importActual<typeof import('@/lib/ffmpeg/runFfmpeg')>(
      '@/lib/ffmpeg/runFfmpeg'
    )
    runFfmpegMock.mockImplementation(actualFfmpeg.runFfmpeg)
    inspectMediaMock.mockImplementation(actualFfmpeg.inspectMediaWithFfmpeg)

    const tmpDir = os.tmpdir()
    const tag = `vitest-previs-real-${Date.now()}`
    const scene1Path = path.join(tmpDir, `${tag}-scene1.mp4`)
    const scene2Path = path.join(tmpDir, `${tag}-scene2.mp4`)
    const stitchedPath = path.join(tmpDir, `${tag}-stitched.mp4`)
    const frame1RgbPath = path.join(tmpDir, `${tag}-f1.rgb`)
    const frame2RgbPath = path.join(tmpDir, `${tag}-f2.rgb`)

    try {
      // Scene 1: Pure RED (255,0,0), Baseline H.264, stream 0 = video, stream 1 = audio, fragmented MP4
      await actualFfmpeg.runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=red:s=320x180:r=30:d=1',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100:duration=1',
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'libx264',
        '-profile:v',
        'baseline',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        scene1Path,
      ])

      // Scene 2: Pure BLUE (0,0,255), High H.264 profile, SWAPPED stream order (stream 0 = audio, stream 1 = video!)
      // (This exact layout caused `-f concat -c copy` to exit 0 while dropping 100% of Scene 2 visuals!)
      await actualFfmpeg.runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=880:sample_rate=48000:duration=1',
        '-f',
        'lavfi',
        '-i',
        'color=c=blue:s=320x180:r=24:d=1',
        '-map',
        '0:a:0',
        '-map',
        '1:v:0',
        '-c:a',
        'aac',
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        scene2Path,
      ])

      const [scene1Bytes, scene2Bytes] = await Promise.all([
        fs.readFile(scene1Path),
        fs.readFile(scene2Path),
      ])

      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input)
          const body = url.includes('scene-1') ? scene1Bytes : scene2Bytes
          return new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'video/mp4' },
          })
        })
      )

      let uploadedBuffer: Buffer | null = null
      putMock.mockImplementation(async (_pathname: string, stream: Readable) => {
        uploadedBuffer = await streamToBuffer(stream)
        return {
          url: 'https://store123.public.blob.vercel-storage.com/renders/previs/real-combined.mp4',
          downloadUrl:
            'https://store123.public.blob.vercel-storage.com/renders/previs/real-combined.mp4?download=1',
        }
      })

      const result = await stitchPreVisClipsServer({
        urls: [
          'https://store123.public.blob.vercel-storage.com/renders/scene-1.mp4',
          'https://store123.public.blob.vercel-storage.com/renders/scene-2.mp4',
        ],
        projectId: 'real-test',
        language: 'en',
      })

      expect(result.container).toBe('mp4')
      expect(uploadedBuffer).not.toBeNull()
      expect(uploadedBuffer!.byteLength).toBeGreaterThan(1000)

      await fs.writeFile(stitchedPath, uploadedBuffer!)

      const stitchedProbe = parseFfmpegStreamProbe(
        await actualFfmpeg.inspectMediaWithFfmpeg(stitchedPath)
      )
      expect(stitchedProbe.hasVideo).toBe(true)
      expect(stitchedProbe.hasAudio).toBe(true)
      expect(stitchedProbe.durationSeconds).toBeGreaterThanOrEqual(1.8)

      // Decode 1x1 center RGB pixel from Scene 1 (t = 0.4s -> RED) and Scene 2 (t = 1.4s -> BLUE)
      await actualFfmpeg.runFfmpeg([
        '-y',
        '-ss',
        '0.4',
        '-i',
        stitchedPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=1:1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        frame1RgbPath,
      ])
      await actualFfmpeg.runFfmpeg([
        '-y',
        '-ss',
        '1.4',
        '-i',
        stitchedPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=1:1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        frame2RgbPath,
      ])

      const rgbScene1 = await fs.readFile(frame1RgbPath)
      const rgbScene2 = await fs.readFile(frame2RgbPath)

      expect(rgbScene1.byteLength).toBe(3)
      expect(rgbScene2.byteLength).toBe(3)

      // Scene 1 must be dominantly RED (R > 200, B < 50)
      expect(rgbScene1[0]).toBeGreaterThan(200)
      expect(rgbScene1[2]).toBeLessThan(50)

      // Scene 2 must be dominantly BLUE (B > 200, R < 50) — proving Scene 2 visuals are intact!
      expect(rgbScene2[2]).toBeGreaterThan(200)
      expect(rgbScene2[0]).toBeLessThan(50)
    } finally {
      await Promise.all(
        [scene1Path, scene2Path, stitchedPath, frame1RgbPath, frame2RgbPath].map((p) =>
          fs.unlink(p).catch(() => {})
        )
      )
    }
  }, 20_000)

  it('registers /api/export/previs-stitch in next.config.mjs outputFileTracingIncludes', async () => {
    const configPath = path.resolve(process.cwd(), 'next.config.mjs')
    const content = await fs.readFile(configPath, 'utf8')
    expect(content).toContain('"/api/export/previs-stitch"')
    expect(content).toContain('./node_modules/ffmpeg-static/ffmpeg')
  })
})
