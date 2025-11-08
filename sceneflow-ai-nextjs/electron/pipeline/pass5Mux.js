const path = require('path')
const fs = require('fs/promises')
const ffmpeg = require('fluent-ffmpeg')

const muxVideoAndAudio = async ({
  videoPath,
  audioPath,
  workspace,
  durationSeconds,
  options = {}
}) => {
  if (!videoPath) {
    throw new Error('Video path is required for muxing')
  }

  const outputDir = await workspace.ensureDir('output')
  const filename = options.filename || 'final-export.mp4'
  const outputPath = path.join(outputDir, filename)

  await new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(videoPath)
      .inputOptions(['-thread_queue_size 512'])

    if (audioPath) {
      command.input(audioPath)
    }

    const outputOptions = ['-c:v copy']
    if (audioPath) {
      outputOptions.push('-c:a copy')
      outputOptions.push('-shortest')
    }

    command
      .outputOptions(outputOptions)
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })

  workspace.track(outputPath)

  const stats = await fs.stat(outputPath)
  const resolvedDuration = Math.max(Number(durationSeconds || 0), 0.1)

  return {
    filePath: outputPath,
    durationSeconds: resolvedDuration,
    fileSizeBytes: stats.size
  }
}

module.exports = {
  muxVideoAndAudio
}
