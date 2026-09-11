import { describe, expect, it } from 'vitest'
import {
  HERO_HLS_FALLBACK_MP4_FILE,
  HERO_HLS_MANIFEST_FILE,
  HERO_HLS_VIDEO_RUNGS,
  buildHeroHlsJob,
  heroHlsFallbackMp4Object,
  heroHlsManifestObject,
} from '@/lib/landing/heroHlsJobConfig'
import { LOCALE_SOURCE_PATHS, WEB_ENCODE_PATHS } from '../../scripts/encode-hero-web-mp4.mjs'
import { HERO_VIDEO_BLOB_PATHS, HERO_VIDEO_WEB_720P_PATHS } from '@/config/landing/heroVideoLocales'

describe('hero HLS Transcoder job', () => {
  it('builds a 360/720/1080 ladder plus a 720p progressive fallback', () => {
    const job = buildHeroHlsJob(
      'gs://bucket/hero/en/master.mp4',
      'gs://bucket/hero/en/hls'
    )

    expect(job.outputUri).toBe('gs://bucket/hero/en/hls/')
    expect(HERO_HLS_VIDEO_RUNGS.map((rung) => rung.heightPixels)).toEqual([360, 720, 1080])
    expect(HERO_HLS_FALLBACK_MP4_FILE).toBe('fallback-720p.mp4')
    expect(HERO_HLS_MANIFEST_FILE).toBe('manifest.m3u8')
    expect(heroHlsManifestObject('en')).toBe('hero/en/hls/manifest.m3u8')
    expect(heroHlsFallbackMp4Object('en')).toBe('hero/en/hls/fallback-720p.mp4')

    const muxKeys = (job.config.muxStreams as Array<{ key: string; fileName?: string }>).map(
      (mux) => mux.key
    )
    expect(muxKeys).toEqual(['hls-360p', 'hls-720p', 'hls-1080p', 'fallback-720p'])

    const manifest = (job.config.manifests as Array<{ fileName: string; muxStreams: string[] }>)[0]
    expect(manifest.fileName).toBe('manifest.m3u8')
    expect(manifest.muxStreams).toEqual(['hls-360p', 'hls-720p', 'hls-1080p'])
  })
})

describe('hero web-encode script paths', () => {
  it('downloads the live 4K Blob masters, not the unused English 720p cut', () => {
    expect(LOCALE_SOURCE_PATHS).toEqual(HERO_VIDEO_BLOB_PATHS)
    expect(LOCALE_SOURCE_PATHS.en).toBe('SceneFlow Hero Video.mp4')
    expect(WEB_ENCODE_PATHS[720]).toEqual(HERO_VIDEO_WEB_720P_PATHS)
  })
})
