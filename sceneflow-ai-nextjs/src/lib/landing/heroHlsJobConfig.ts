/**
 * Google Transcoder job for landing-hero HLS.
 *
 * Ladder is 360p / 720p / 1080p H.264 + AAC — not 4K. The 4K Blob master stays
 * the archive; phones should never pull it. A progressive 720p MP4 is muxed
 * beside the HLS playlists so browsers that cannot play HLS still get a
 * web-sized file instead of the half-gigabyte master.
 */

export const HERO_HLS_MANIFEST_FILE = 'manifest.m3u8'
export const HERO_HLS_FALLBACK_MP4_FILE = 'fallback-720p.mp4'

/** Object prefix under the landing-video bucket (no trailing slash). */
export function heroHlsObjectPrefix(locale: string): string {
  return `hero/${locale}/hls`
}

export function heroHlsManifestObject(locale: string): string {
  return `${heroHlsObjectPrefix(locale)}/${HERO_HLS_MANIFEST_FILE}`
}

export function heroHlsFallbackMp4Object(locale: string): string {
  return `${heroHlsObjectPrefix(locale)}/${HERO_HLS_FALLBACK_MP4_FILE}`
}

const SEGMENT = {
  segmentDuration: { seconds: 4 },
  individualSegments: true,
} as const

type H264LadderRung = {
  key: string
  widthPixels: number
  heightPixels: number
  bitrateBps: number
}

/** 24 fps matches the hero masters. Bitrates are web delivery, not archive. */
export const HERO_HLS_VIDEO_RUNGS: readonly H264LadderRung[] = [
  { key: 'video-360p', widthPixels: 640, heightPixels: 360, bitrateBps: 600_000 },
  { key: 'video-720p', widthPixels: 1280, heightPixels: 720, bitrateBps: 2_500_000 },
  { key: 'video-1080p', widthPixels: 1920, heightPixels: 1080, bitrateBps: 5_500_000 },
]

export const HERO_HLS_AUDIO_KEY = 'audio-aac'

/**
 * Ad-hoc Transcoder `Job` body (input + output URIs plus config).
 *
 * Kept free of the GCP client so unit tests can assert the ladder without
 * opening a connection.
 */
export function buildHeroHlsJob(inputUri: string, outputUri: string): {
  inputUri: string
  outputUri: string
  config: Record<string, unknown>
} {
  const elementaryStreams = [
    ...HERO_HLS_VIDEO_RUNGS.map((rung) => ({
      key: rung.key,
      videoStream: {
        h264: {
          widthPixels: rung.widthPixels,
          heightPixels: rung.heightPixels,
          bitrateBps: rung.bitrateBps,
          frameRate: 24,
          gopDuration: { seconds: 2 },
          profile: 'high',
          rateControlMode: 'vbr',
        },
      },
    })),
    {
      key: HERO_HLS_AUDIO_KEY,
      audioStream: {
        codec: 'aac',
        bitrateBps: 128_000,
      },
    },
  ]

  const hlsMuxStreams = HERO_HLS_VIDEO_RUNGS.map((rung) => {
    const label = rung.key.replace('video-', '')
    return {
      key: `hls-${label}`,
      fileName: `media-${label}.ts`,
      container: 'ts',
      elementaryStreams: [rung.key, HERO_HLS_AUDIO_KEY],
      segmentSettings: SEGMENT,
    }
  })

  return {
    inputUri,
    outputUri: outputUri.endsWith('/') ? outputUri : `${outputUri}/`,
    config: {
      elementaryStreams,
      muxStreams: [
        ...hlsMuxStreams,
        {
          key: 'fallback-720p',
          fileName: HERO_HLS_FALLBACK_MP4_FILE,
          container: 'mp4',
          elementaryStreams: ['video-720p', HERO_HLS_AUDIO_KEY],
        },
      ],
      manifests: [
        {
          fileName: HERO_HLS_MANIFEST_FILE,
          type: 'HLS',
          muxStreams: hlsMuxStreams.map((mux) => mux.key),
        },
      ],
    },
  }
}
