const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const { captureFfmpegError } = require('../utils/ffmpegErrors')

const buildFilterGraph = ({
  tracks,
  options
}) => {
  const filterLines = []
  const inputRefs = []

  let inputIndex = 0

  const addTrack = (filePath, label) => {
    const ref = `${inputIndex}:a`
    const output = `${label}`
    const filters = []

    switch (label) {
      case 'narration':
      case 'dialogue':
        filters.push('loudnorm=I=-16:TP=-1.5:LRA=11')
        break
      case 'music':
        filters.push('loudnorm=I=-20:TP=-2:LRA=12')
        break
      case 'sfx':
        filters.push('loudnorm=I=-18:TP=-2:LRA=14')
        break
      default:
        filters.push('anull')
    }

    filterLines.push(`[${ref}]${filters.join(',')}[${output}]`)
    inputRefs.push(`[${output}]`)
    inputIndex += 1
  }

  if (tracks.narration?.filePath) addTrack(tracks.narration.filePath, 'narration')
  if (tracks.dialogue?.filePath) addTrack(tracks.dialogue.filePath, 'dialogue')
  if (tracks.music?.filePath) addTrack(tracks.music.filePath, 'music')
  if (tracks.sfx?.filePath) addTrack(tracks.sfx.filePath, 'sfx')

  if (inputRefs.length === 0) {
    throw new Error('No audio tracks provided for mixing')
  }

  let musicRef = '[music]'
  if (tracks.music?.filePath && options.duckMusic && (tracks.narration || tracks.dialogue)) {
    const speechInputs = []
    if (tracks.narration?.filePath) speechInputs.push('[narration]')
    if (tracks.dialogue?.filePath) speechInputs.push('[dialogue]')

    const speechMixLabel = 'speechmix'
    filterLines.push(`${speechInputs.join('')}amix=inputs=${speechInputs.length}:normalize=0[${speechMixLabel}]`)

    const duckedLabel = 'musicducked'
    filterLines.push(`[${musicRef}][${speechMixLabel}]sidechaincompress=threshold=-24dB:ratio=8:attack=15:release=300:${options.duckingOptions}[${duckedLabel}]`)
    musicRef = `[${duckedLabel}]`
  }

  const mixInputs = []
  if (tracks.narration?.filePath) mixInputs.push('[narration]')
  if (tracks.dialogue?.filePath) mixInputs.push('[dialogue]')
  if (tracks.music?.filePath) mixInputs.push(musicRef)
  if (tracks.sfx?.filePath) mixInputs.push('[sfx]')

  const mixLabel = 'premix'
  filterLines.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:normalize=0,alimiter=limit=0.9,aresample=48000[aout]`)

  if (options.normalizeFinal) {
    filterLines.push('[aout]loudnorm=I=-16:TP=-1.5:LRA=11[finalout]')
    return { filter: filterLines, outputLabel: 'finalout' }
  }

  return { filter: filterLines, outputLabel: 'aout' }
}

const mixAudioTracks = async ({
  tracks,
  workspace,
  options = {}
}) => {
  const hasAny = ['narration', 'dialogue', 'music', 'sfx'].some((key) => tracks[key]?.filePath)
  if (!hasAny) {
    throw new Error('No audio tracks available to mix')
  }

  const mixOptions = {
    duckMusic: options.duckMusic ?? true,
    normalizeFinal: options.normalize ?? true,
    duckingOptions: 'makeup=6' // Provide gentle pump after compression
  }

  const filterGraph = buildFilterGraph({
    tracks,
    options: mixOptions
  })

  const audioDir = await workspace.ensureDir('audio')
  const outputPath = path.join(audioDir, 'final-mix.m4a')

  await new Promise((resolve, reject) => {
    const command = ffmpeg()

    ;['narration', 'dialogue', 'music', 'sfx'].forEach((key) => {
      const track = tracks[key]
      if (track?.filePath) {
        command.input(track.filePath)
      }
    })

    command
      .complexFilter(filterGraph.filter, filterGraph.outputLabel)
      .outputOptions(['-map', `[${filterGraph.outputLabel}]`, '-c:a', 'aac', '-b:a', '192k'])
      .on('end', resolve)
      .on('error', captureFfmpegError('audio-mix', reject))
      .save(outputPath)
  })

  workspace.track(outputPath)

  return {
    filePath: outputPath,
    duration: Object.values(tracks).reduce((max, track) => Math.max(max, Number(track?.duration || 0)), 0)
  }
}

module.exports = {
  mixAudioTracks
}
