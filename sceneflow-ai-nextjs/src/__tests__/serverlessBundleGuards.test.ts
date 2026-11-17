import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { parseMp4DurationSeconds, getVideoDurationFromBuffer } from '@/lib/video/serverVideoDuration'
import { getAudioDurationFromBuffer } from '@/lib/audio/serverAudioDuration'

const ROOT = process.cwd()

function readSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8')
}

function buildSyntheticMp4WithMvhdV0(timescale: number, durationUnits: number): Buffer {
  // ftyp box (16 bytes) + moov box containing mvhd v0 box (36 bytes -> moov = 44 bytes)
  const ftyp = Buffer.alloc(16)
  ftyp.writeUInt32BE(16, 0)
  ftyp.write('ftyp', 4, 4, 'ascii')
  ftyp.write('isom', 8, 4, 'ascii')

  const mvhd = Buffer.alloc(36)
  mvhd.writeUInt32BE(36, 0)
  mvhd.write('mvhd', 4, 4, 'ascii')
  mvhd.writeUInt8(0, 8) // version 0
  mvhd.writeUInt32BE(timescale, 20) // payloadOffset (8) + 12 = 20
  mvhd.writeUInt32BE(durationUnits, 24) // payloadOffset (8) + 16 = 24

  const moovHeader = Buffer.alloc(8)
  moovHeader.writeUInt32BE(8 + mvhd.length, 0)
  moovHeader.write('moov', 4, 4, 'ascii')

  return Buffer.concat([ftyp, moovHeader, mvhd])
}

describe('Vercel serverless 250MB bundle & Turbopack NFT guards', () => {
  it('excludes static public/, docs/, scripts/, tests, and ffmpeg-static from video/audio serverless functions in next.config.mjs', () => {
    const nextConfig = readSource('next.config.mjs')

    expect(nextConfig).toContain('"public/**"')
    expect(nextConfig).toContain('"sceneflow-ai-nextjs/public/**"')
    expect(nextConfig).toContain('"docs/**"')
    expect(nextConfig).toContain('"sceneflow-ai-nextjs/docs/**"')
    expect(nextConfig).toContain('"scripts/**"')
    expect(nextConfig).toContain('"**/*.mov"')
    expect(nextConfig).toContain('"**/*.pdf"')
    expect(nextConfig).toContain('"/api/scenes/[sceneId]/beats/[beatId]/generate-continuous"')
    expect(nextConfig).toContain('"/api/segments/[segmentId]/generate-asset"')
    expect(nextConfig).toContain('"**/ffmpeg-static/**"')
  })

  it('removes eval("require") from serverAudioDuration and serverVideoDuration so Turbopack never traces the whole repo', () => {
    const audioSrc = readSource('src/lib/audio/serverAudioDuration.ts')
    const videoSrc = readSource('src/lib/video/serverVideoDuration.ts')
    const migrateSrc = readSource('src/lib/database/migrateTargetAudienceToText.ts')

    expect(audioSrc).not.toContain("eval('require')")
    expect(videoSrc).not.toContain("eval('require')")
    expect(migrateSrc).not.toContain('process.cwd()')
  })

  it('parses MP4 mvhd container duration in memory without ffprobe or temp files on Vercel', async () => {
    const mp4 = buildSyntheticMp4WithMvhdV0(1000, 8000) // 8.0s
    expect(parseMp4DurationSeconds(mp4)).toBe(8)

    const prevVercel = process.env.VERCEL
    process.env.VERCEL = '1'
    try {
      await expect(getVideoDurationFromBuffer(mp4)).resolves.toBe(8)
      await expect(getVideoDurationFromBuffer(Buffer.from('not-an-mp4'))).resolves.toBeNull()
      const audioEst = await getAudioDurationFromBuffer(Buffer.alloc(32_000), 10, 'en')
      expect(audioEst).toBeGreaterThan(1)
    } finally {
      if (prevVercel === undefined) {
        delete process.env.VERCEL
      } else {
        process.env.VERCEL = prevVercel
      }
    }
  })

  it('removes deprecated Active CPU memory overrides from vercel.json while preserving maxDuration rules', () => {
    const raw = readSource('vercel.json')
    const parsed = JSON.parse(raw) as {
      functions?: Record<string, Record<string, unknown>>
    }

    expect(parsed.functions).toBeDefined()
    for (const [route, cfg] of Object.entries(parsed.functions ?? {})) {
      expect(cfg.memory, `${route} should not define deprecated memory key`).toBeUndefined()
    }
  })
})
