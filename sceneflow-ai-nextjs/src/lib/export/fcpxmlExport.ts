/**
 * FCPXML v1.10 Non-Linear Editor (NLE) Timeline Exporter
 *
 * Exports a SceneFlow AI scene or 45m–60m episode timeline into standard
 * Final Cut Pro / DaVinci Resolve / Premiere Pro `.fcpxml` format with:
 * - Primary Spine (Track V1): Active 10s video clips with non-destructive
 *   trim-in (`start`) and narrative duration (`duration`).
 * - Connected Alternate Takes (Lanes +1..+N, disabled by default): Alternate
 *   generated video takes stacked above each shot for 1-click editor auditioning.
 * - Multi-Lane Separated Audio Stems (Lanes -1..-4):
 *     Lane -1: Dialogue (`role="dialogue"`)
 *     Lane -2: Narration (`role="dialogue.narration"`)
 *     Lane -3: Sound Effects & Room Tone (`role="effects"`)
 *     Lane -4: Musical Score (`role="music"`)
 */

export interface FcpxmlVideoClipInput {
  segmentId: string
  name?: string
  assetUrl: string
  assetType?: 'video' | 'image'
  /** Raw source clip duration (e.g. 10s). */
  sourceDurationSec?: number
  /** Non-destructive trim-in offset inside the source clip. */
  trimInSec?: number
  /** Effective duration on the timeline after trimming. */
  timelineDurationSec: number
  /** Alternate takes for this shot (stacked on disabled upper video lanes). */
  alternateTakeUrls?: string[]
  /** Beat ID or shot metadata note for NLE markers. */
  beatId?: string
  shotNote?: string
}

export interface FcpxmlAudioClipInput {
  id: string
  name?: string
  url: string
  type: 'dialogue' | 'narration' | 'sfx' | 'music'
  /** Timeline start offset in seconds. */
  startTimeSec: number
  /** Playback duration on the timeline in seconds. */
  durationSec: number
  /** Source offset in seconds (e.g. for music cue continuation). */
  trimStartSec?: number
  /** Linear gain (0.0 to 1.5, converted to dB in FCPXML). */
  volume?: number
}

export interface BuildFcpxmlTimelineInput {
  projectTitle: string
  eventName?: string
  resolution?: '720p' | '1080p' | '4K'
  fps?: number
  videoClips: FcpxmlVideoClipInput[]
  audioClips?: FcpxmlAudioClipInput[]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convert floating-point seconds into frame-quantized FCPXML rational time (`N/Ds`).
 */
export function toFcpxmlRationalTime(seconds: number, fps: number = 24): string {
  const safeFps = Math.max(1, Math.round(fps))
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const frames = Math.round(safeSec * safeFps)
  if (frames === 0) return '0s'
  return `${frames}/${safeFps}s`
}

function linearGainToDbString(volume: number | undefined): string {
  if (volume == null || !Number.isFinite(volume) || Math.abs(volume - 1) < 0.01) {
    return '0dB'
  }
  if (volume <= 0.001) return '-96dB'
  const db = 20 * Math.log10(volume)
  return `${db.toFixed(1)}dB`
}

function resolveDimensions(resolution: '720p' | '1080p' | '4K' = '1080p'): {
  width: number
  height: number
  formatName: string
} {
  switch (resolution) {
    case '720p':
      return { width: 1280, height: 720, formatName: 'FFVideoFormat720p24' }
    case '4K':
      return { width: 3840, height: 2160, formatName: 'FFVideoFormat3840x2160p24' }
    default:
      return { width: 1920, height: 1080, formatName: 'FFVideoFormat1080p24' }
  }
}

function audioRoleAndLane(type: FcpxmlAudioClipInput['type']): {
  role: string
  lane: number
} {
  switch (type) {
    case 'dialogue':
      return { role: 'dialogue', lane: -1 }
    case 'narration':
      return { role: 'dialogue.narration', lane: -2 }
    case 'sfx':
      return { role: 'effects', lane: -3 }
    case 'music':
      return { role: 'music', lane: -4 }
  }
}

/**
 * Build a complete FCPXML v1.10 document string from SceneFlow timeline clips.
 */
export function buildFcpxmlDocument(input: BuildFcpxmlTimelineInput): string {
  const fps = input.fps ?? 24
  const { width, height, formatName } = resolveDimensions(input.resolution)
  const frameDuration = `1/${fps}s`
  const projectTitle = escapeXml(input.projectTitle || 'SceneFlow AI Episode')
  const eventName = escapeXml(input.eventName || 'SceneFlow Production')

  const assetDeclarations: string[] = []
  const assetIdByUrl = new Map<string, string>()
  let assetCounter = 1

  const registerAsset = (
    url: string,
    name: string,
    durationSec: number,
    kind: 'video' | 'image' | 'audio'
  ): string => {
    const cleanUrl = url.trim()
    const existing = assetIdByUrl.get(cleanUrl)
    if (existing) return existing

    const id = `r${assetCounter + 1}` // r1 is reserved for <format>
    assetCounter++
    assetIdByUrl.set(cleanUrl, id)

    const durAttr =
      kind === 'image' ? '0s' : toFcpxmlRationalTime(Math.max(durationSec, 10), fps)
    const hasVideo = kind === 'audio' ? '0' : '1'
    const hasAudio = kind === 'image' ? '0' : '1'

    assetDeclarations.push(
      `    <asset id="${id}" name="${escapeXml(name)}" start="0s" duration="${durAttr}" hasVideo="${hasVideo}" hasAudio="${hasAudio}" format="r1">\n` +
        `      <media-rep kind="original-media" src="${escapeXml(cleanUrl)}"/>\n` +
        `    </asset>`
    )
    return id
  }

  // Register video & alternate take assets
  for (let i = 0; i < input.videoClips.length; i++) {
    const clip = input.videoClips[i]
    const clipLabel = clip.name || `Shot_${String(i + 1).padStart(3, '0')}_${clip.segmentId}`
    const sourceDur = Math.max(
      clip.sourceDurationSec ?? 10,
      (clip.trimInSec ?? 0) + clip.timelineDurationSec
    )
    registerAsset(
      clip.assetUrl,
      clipLabel,
      sourceDur,
      clip.assetType === 'image' ? 'image' : 'video'
    )

    for (let t = 0; t < (clip.alternateTakeUrls?.length ?? 0); t++) {
      const altUrl = clip.alternateTakeUrls![t]
      if (altUrl?.trim()) {
        registerAsset(altUrl, `${clipLabel}_AltTake_${t + 2}`, sourceDur, 'video')
      }
    }
  }

  // Register audio stem assets
  const audioClips = input.audioClips ?? []
  for (let i = 0; i < audioClips.length; i++) {
    const audio = audioClips[i]
    const audioLabel = audio.name || `${audio.type.toUpperCase()}_${String(i + 1).padStart(3, '0')}`
    const sourceDur = (audio.trimStartSec ?? 0) + audio.durationSec
    registerAsset(audio.url, audioLabel, sourceDur, 'audio')
  }

  // Build spine clips + connected audio/alt-takes
  const spineElements: string[] = []
  let timelineOffsetSec = 0

  for (let i = 0; i < input.videoClips.length; i++) {
    const clip = input.videoClips[i]
    const refId = assetIdByUrl.get(clip.assetUrl.trim())!
    const clipName = escapeXml(
      clip.name || `Shot ${i + 1} (${clip.beatId || clip.segmentId})`
    )
    const offsetStr = toFcpxmlRationalTime(timelineOffsetSec, fps)
    const startStr = toFcpxmlRationalTime(clip.trimInSec ?? 0, fps)
    const durationStr = toFcpxmlRationalTime(clip.timelineDurationSec, fps)

    const innerElements: string[] = []

    if (clip.shotNote) {
      innerElements.push(
        `            <marker start="${startStr}" duration="${frameDuration}" value="${escapeXml(clip.shotNote)}"/>`
      )
    }

    // Attach alternate video takes on positive lanes (disabled so editor can audition)
    for (let t = 0; t < (clip.alternateTakeUrls?.length ?? 0); t++) {
      const altUrl = clip.alternateTakeUrls![t]?.trim()
      const altRef = altUrl ? assetIdByUrl.get(altUrl) : undefined
      if (!altRef) continue
      innerElements.push(
        `            <asset-clip name="${clipName} (Alt Take ${t + 2})" lane="${t + 1}" offset="${startStr}" ref="${altRef}" start="${startStr}" duration="${durationStr}" enabled="0"/>`
      )
    }

    // Attach all audio stems onto the first spine clip (anchored to sequence timeline)
    if (i === 0 && audioClips.length > 0) {
      const firstClipStartSec = clip.trimInSec ?? 0
      for (let a = 0; a < audioClips.length; a++) {
        const audio = audioClips[a]
        const audioRef = assetIdByUrl.get(audio.url.trim())
        if (!audioRef) continue
        const { role, lane } = audioRoleAndLane(audio.type)
        const audioName = escapeXml(
          audio.name || `${audio.type.toUpperCase()} ${a + 1}`
        )
        const anchoredOffsetStr = toFcpxmlRationalTime(
          firstClipStartSec + Math.max(0, audio.startTimeSec),
          fps
        )
        const audioStartStr = toFcpxmlRationalTime(audio.trimStartSec ?? 0, fps)
        const audioDurStr = toFcpxmlRationalTime(audio.durationSec, fps)
        const dbStr = linearGainToDbString(audio.volume)

        if (dbStr !== '0dB') {
          innerElements.push(
            `            <asset-clip name="${audioName}" lane="${lane}" offset="${anchoredOffsetStr}" ref="${audioRef}" start="${audioStartStr}" duration="${audioDurStr}" role="${role}">\n` +
              `              <adjust-volume amount="${dbStr}"/>\n` +
              `            </asset-clip>`
          )
        } else {
          innerElements.push(
            `            <asset-clip name="${audioName}" lane="${lane}" offset="${anchoredOffsetStr}" ref="${audioRef}" start="${audioStartStr}" duration="${audioDurStr}" role="${role}"/>`
          )
        }
      }
    }

    if (innerElements.length > 0) {
      spineElements.push(
        `          <asset-clip name="${clipName}" offset="${offsetStr}" ref="${refId}" start="${startStr}" duration="${durationStr}">\n` +
          innerElements.join('\n') +
          `\n          </asset-clip>`
      )
    } else {
      spineElements.push(
        `          <asset-clip name="${clipName}" offset="${offsetStr}" ref="${refId}" start="${startStr}" duration="${durationStr}"/>`
      )
    }

    timelineOffsetSec += clip.timelineDurationSec
  }

  const totalSequenceDurationStr = toFcpxmlRationalTime(timelineOffsetSec, fps)

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE fcpxml>`,
    `<fcpxml version="1.10">`,
    `  <resources>`,
    `    <format id="r1" name="${formatName}" frameDuration="${frameDuration}" width="${width}" height="${height}" colorSpace="1-1-1 (Rec. 709)"/>`,
    ...assetDeclarations,
    `  </resources>`,
    `  <library>`,
    `    <event name="${eventName}">`,
    `      <project name="${projectTitle}">`,
    `        <sequence format="r1" duration="${totalSequenceDurationStr}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">`,
    `          <spine>`,
    ...spineElements,
    `          </spine>`,
    `        </sequence>`,
    `      </project>`,
    `    </event>`,
    `  </library>`,
    `</fcpxml>`,
  ].join('\n')
}
