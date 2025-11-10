const path = require('path')
const fs = require('fs/promises')
const ffmpeg = require('fluent-ffmpeg')
const { captureFfmpegError } = require('../utils/ffmpegErrors')

const writeManifest = async (clips, manifestPath) => {
  const lines = clips.map((clip) => `file '${clip.clipPath.replace(/'/g, "'\\''")}'`).join('\n')
  await fs.writeFile(manifestPath, lines, 'utf8')
}

const concatSceneClips = async ({
  clips,
  workspace,
  videoOptions,
  onProgress
}) => {
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error('No clips provided for concatenation')
  }

  const videoDir = await workspace.ensureDir('video')
  const manifestPath = path.join(videoDir, 'concat.txt')
  await writeManifest(clips, manifestPath)
  workspace.track(manifestPath)

  const outputPath = path.join(videoDir, 'silent-master.mp4')

  await new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(manifestPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c copy',
        `-bsf:a aac_adtstoasc`
      ])
      .on('progress', (progress) => {
        if (typeof onProgress === 'function') {
          const ratio = progress.percent ? Math.min(100, Math.max(0, progress.percent)) / 100 : null
          onProgress({
            progress: ratio,
            detail: progress.timemark ? `Concatenating… ${progress.timemark}` : 'Concatenating scenes'
          })
        }
      })
      .on('end', resolve)
      .on('error', captureFfmpegError('concat', reject))
      .output(outputPath)

    command.run()
  })

  workspace.track(outputPath)

  const totalDuration = clips.reduce((sum, clip) => sum + (clip.duration || 0), 0)

  return {
    filePath: outputPath,
    duration: totalDuration,
    manifestPath
  }
}

module.exports = {
  concatSceneClips
}
