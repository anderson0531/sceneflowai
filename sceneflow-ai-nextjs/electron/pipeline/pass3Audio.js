const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const { downloadAssetTo, getSuggestedExtension } = require('../utils/download')
const { captureFfmpegError } = require('../utils/ffmpegErrors')

const MS_PER_SECOND = 1000

const toMilliseconds = (seconds) => Math.max(0, Number(seconds || 0) * MS_PER_SECOND)

const clampDurationMs = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }
  return Math.max(250, Math.round(numeric))
}

const createAudioCache = (workspace) => {
  const cache = new Map()

  const ensureAudioDir = async () => {
    if (!cache.has('__dir__')) {
      const dirPromise = workspace.ensureDir('audio/raw').then((dir) => {
        cache.set('__dir__', dir)
        return dir
      })
      cache.set('__dir__', dirPromise)
      return dirPromise
    }

    const existing = cache.get('__dir__')
    return existing instanceof Promise ? existing : Promise.resolve(existing)
  }

  const resolve = async (source, label) => {
    if (!source) {
      throw new Error(`Missing audio source for ${label}`)
    }

    if (cache.has(source)) {
      const cached = cache.get(source)
      return cached instanceof Promise ? cached : Promise.resolve(cached)
    }

    const promise = (async () => {
      const audioDir = await ensureAudioDir()
      const extension = getSuggestedExtension(source, '.wav')
      const filename = `${label.replace(/[^a-z0-9-_]/gi, '-')}-${cache.size}${extension}`
      const destination = path.join(audioDir, filename)
      await downloadAssetTo(source, destination)
      workspace.track(destination)
      return destination
    })()

    cache.set(source, promise)
    return promise
  }

  return { resolve }
}

const collectTimeline = (scenes) => {
  const timeline = []
  let cursor = 0

  scenes.forEach((scene, index) => {
    const duration = Math.max(0.5, Number(scene.duration || 0))
    timeline.push({
      scene,
      index,
      startMs: Math.round(cursor * MS_PER_SECOND),
      durationMs: Math.round(duration * MS_PER_SECOND)
    })
    cursor += duration
  })

  return timeline
}

const buildClipsForTrack = async ({
  track,
  timeline,
  audioMix,
  cache
}) => {
  const clips = []
  const volume = Math.max(0, Number(audioMix?.[track] ?? 1))

  for (const item of timeline) {
    const { scene, startMs, durationMs, index } = item
    const audio = scene.audio || {}

    if (track === 'narration' && audio.narration) {
      const filePath = await cache.resolve(audio.narration, `narration-${index + 1}`)
      clips.push({
        filePath,
        startMs,
        volume
      })
    }

    if (track === 'dialogue' && Array.isArray(audio.dialogue)) {
      for (let i = 0; i < audio.dialogue.length; i += 1) {
        const entry = audio.dialogue[i]
        if (!entry?.url) continue
        const filePath = await cache.resolve(entry.url, `dialogue-${index + 1}-${i + 1}`)
        const clipStart = startMs + Math.round((entry.startTime || 0) * MS_PER_SECOND)
        const clipDuration = clampDurationMs((entry.duration || 0) * MS_PER_SECOND)
        clips.push({
          filePath,
          startMs: clipStart,
          durationMs: clipDuration,
          volume
        })
      }
    }

    if (track === 'sfx' && Array.isArray(audio.sfx)) {
      for (let i = 0; i < audio.sfx.length; i += 1) {
        const entry = audio.sfx[i]
        if (!entry?.url) continue
        const filePath = await cache.resolve(entry.url, `sfx-${index + 1}-${i + 1}`)
        const clipStart = startMs + Math.round((entry.startTime || 0) * MS_PER_SECOND)
        const clipDuration = clampDurationMs((entry.duration || durationMs - (entry.startTime || 0) * MS_PER_SECOND))
        clips.push({
          filePath,
          startMs: clipStart,
          durationMs: clipDuration,
          volume
        })
      }
    }

    if (track === 'music' && audio.music) {
      const filePath = await cache.resolve(audio.music, `music-${index + 1}`)
      clips.push({
        filePath,
        startMs,
        durationMs,
        loop: true,
        volume
      })
    }
  }

  return clips
}

const renderTrack = async ({
  track,
  clips,
  workspace,
  totalDurationSeconds
}) => {
  if (!clips.length) {
    return null
  }

  const totalDuration = Math.max(0.5, Number(totalDurationSeconds || 0))
  const audioDir = await workspace.ensureDir('audio')
  const outputPath = path.join(audioDir, `${track}.m4a`)

  await new Promise((resolve, reject) => {
    const command = ffmpeg()
    const filterParts = []
    const outputLabel = 'mixout'

    clips.forEach((clip, index) => {
      if (clip.loop) {
        command.inputOption('-stream_loop -1')
      }
      command.input(clip.filePath)

      const inputLabel = `${index}:a`
      const filterLabel = `clip${index}`
      const operators = []

      if (clip.loop) {
        operators.push('aloop=loop=-1')
      }

      if (clip.durationMs) {
        operators.push(`atrim=0:${(clip.durationMs / MS_PER_SECOND).toFixed(3)}`)
      }

      const delayMs = Math.max(0, Math.round(clip.startMs || 0))
      operators.push(`adelay=${delayMs}|${delayMs}`)

      if (clip.volume !== null && clip.volume !== undefined && clip.volume !== 1) {
        operators.push(`volume=${clip.volume}`)
      }

      filterParts.push(`[${inputLabel}]${operators.join(',')}[${filterLabel}]`)
    })

    const inputRefs = clips.map((_, index) => `[clip${index}]`).join('')
    const mixOps = `${inputRefs}amix=inputs=${clips.length}:normalize=0,apad,atrim=0:${totalDuration.toFixed(3)},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[${outputLabel}]`
    filterParts.push(mixOps)

    command
      .complexFilter(filterParts, outputLabel)
      .outputOptions(['-map', `[${outputLabel}]`, '-c:a', 'aac', '-b:a', '192k'])
      .on('end', resolve)
      .on('error', captureFfmpegError(`audio-${track}`, reject))
      .save(outputPath)
  })

  workspace.track(outputPath)

  return {
    track,
    filePath: outputPath,
    duration: totalDuration
  }
}

const renderAudioTracks = async ({
  scenes,
  audioMix,
  workspace,
  totalDurationSeconds,
  onTrackProgress
}) => {
  const timeline = collectTimeline(scenes)
  const cache = createAudioCache(workspace)

  const trackOrder = ['narration', 'dialogue', 'music', 'sfx']
  const results = {}

  for (let i = 0; i < trackOrder.length; i += 1) {
    const track = trackOrder[i]
    const clips = await buildClipsForTrack({
      track,
      timeline,
      audioMix,
      cache
    })

    if (typeof onTrackProgress === 'function') {
      onTrackProgress({
        track,
        index: i,
        total: trackOrder.length,
        clips: clips.length
      })
    }

    const artifact = await renderTrack({
      track,
      clips,
      workspace,
      totalDurationSeconds
    })

    results[track] = artifact

    if (typeof onTrackProgress === 'function') {
      onTrackProgress({
        track,
        index: i + 0.5,
        total: trackOrder.length,
        detail: artifact ? 'completed' : 'skipped'
      })
    }
  }

  return results
}

module.exports = {
  renderAudioTracks
}
