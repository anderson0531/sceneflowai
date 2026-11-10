import { promises as fs } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runFfmpegMock, putMock } = vi.hoisted(() => ({
  runFfmpegMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/lib/ffmpeg/runFfmpeg', () => ({
  runFfmpeg: runFfmpegMock,
}))

vi.mock('@vercel/blob', () => ({
  put: putMock,
}))

import {
  buildFfmpegConcatManifest,
  inferPreVisStitchPlan,
  isTrustedPreVisStitchUrl,
  stitchPreVisClipsServer,
} from '@/lib/ffmpeg/stitchPreVisServer'

describe('stitchPreVisServer & FFmpeg tracing', () => {
  beforeEach(() => {
    runFfmpegMock.mockReset()
    putMock.mockReset()
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

  it('runs lossless -c copy +faststart and uploads stitched MP4 via multipart Vercel Blob put', async () => {
    runFfmpegMock.mockImplementation(async (args: string[]) => {
      const outPath = args[args.length - 1]
      await fs.writeFile(outPath, Buffer.from('fake-mp4-output'))
    })
    putMock.mockResolvedValue({
      url: 'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-en.mp4',
      downloadUrl:
        'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-en.mp4?download=1',
    })

    const urls = Array.from(
      { length: 16 },
      (_, i) => `https://store123.public.blob.vercel-storage.com/renders/s-${i + 1}.mp4`
    )

    const res = await stitchPreVisClipsServer({
      urls,
      projectId: 'proj-123',
      language: 'en',
    })

    expect(runFfmpegMock).toHaveBeenCalledTimes(1)
    const ffmpegArgs = runFfmpegMock.mock.calls[0][0] as string[]
    expect(ffmpegArgs).toContain('-c')
    expect(ffmpegArgs).toContain('copy')
    expect(ffmpegArgs).toContain('+faststart')

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
      transcoded: false,
    })
  })

  it('falls back to ultrafast H.264/AAC transcode if stream-copy concat fails', async () => {
    let attempt = 0
    runFfmpegMock.mockImplementation(async (args: string[]) => {
      attempt += 1
      if (attempt === 1) {
        throw new Error('ffmpeg failed with code 1: codec mismatch')
      }
      const outPath = args[args.length - 1]
      await fs.writeFile(outPath, Buffer.from('transcoded-mp4-output'))
    })
    putMock.mockResolvedValue({
      url: 'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-transcoded.mp4',
      downloadUrl:
        'https://store123.public.blob.vercel-storage.com/renders/previs/proj/combined-transcoded.mp4?download=1',
    })

    const res = await stitchPreVisClipsServer({
      urls: [
        'https://store123.public.blob.vercel-storage.com/renders/s-1.mp4',
        'https://store123.public.blob.vercel-storage.com/renders/s-2.mp4',
      ],
      projectId: 'proj-123',
      language: 'en',
    })

    expect(runFfmpegMock).toHaveBeenCalledTimes(2)
    const secondArgs = runFfmpegMock.mock.calls[1][0] as string[]
    expect(secondArgs).toContain('libx264')
    expect(secondArgs).toContain('aac')
    expect(res.transcoded).toBe(true)
    expect(res.container).toBe('mp4')
  })

  it('registers /api/export/previs-stitch in next.config.mjs outputFileTracingIncludes', async () => {
    const configPath = path.resolve(process.cwd(), 'next.config.mjs')
    const content = await fs.readFile(configPath, 'utf8')
    expect(content).toContain('"/api/export/previs-stitch"')
    expect(content).toContain('./node_modules/ffmpeg-static/ffmpeg')
  })
})
