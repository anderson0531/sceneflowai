const path = require('path')
const fs = require('fs/promises')
const ffmpeg = require('fluent-ffmpeg')
const { downloadAssetTo, getSuggestedExtension } = require('../utils/download')

const clampDuration = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1
  }
  return Math.max(0.5, numeric)
}

const renderSceneClip = (imagePath, outputPath, duration, options) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()

    if (options.useHardwareAcceleration) {
      command.inputOptions(['-hwaccel', 'auto'])
    }

    command
      .input(imagePath)
      .inputOptions(['-loop 1'])
      .outputOptions([
        '-c:v libx264',
        `-t ${duration}`,
        `-r ${options.fps}`,
        '-pix_fmt yuv420p',
        `-vf scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`
      ])
      .outputOptions(['-f mpegts'])
      .on('end', resolve)
      .on('error', reject)
      .output(outputPath)

    command.run()
  })
}

const prepareSceneImage = async (scene, index, workspace) => {
  const imagesDir = await workspace.ensureDir('images')
  const source = scene.imagePath
  if (!source) {
    throw new Error(`Scene ${scene.number} missing image source`)
  }

  const extension = getSuggestedExtension(source, '.png')
  const filename = `scene-${index + 1}${extension}`
  const destination = path.join(imagesDir, filename)
  const resolved = await downloadAssetTo(source, destination)
  workspace.track(resolved)
  return resolved
}

const renderSceneClips = async ({
  scenes,
  videoOptions,
  workspace,
  onSceneProgress,
  useHardwareAcceleration = false
}) => {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('No scenes provided to renderSceneClips')
  }

  const videoDir = await workspace.ensureDir('video')
  const results = []

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index]
    const duration = clampDuration(scene.duration)
    const imagePath = await prepareSceneImage(scene, index, workspace)
    const clipPath = path.join(videoDir, `scene-${index + 1}.ts`)

    await renderSceneClip(imagePath, clipPath, duration, {
      ...videoOptions,
      useHardwareAcceleration
    })

    const record = {
      clipPath,
      duration,
      sceneNumber: scene.number ?? index + 1
    }

    workspace.track(clipPath)

    results.push(record)

    if (typeof onSceneProgress === 'function') {
      onSceneProgress({
        index,
        total: scenes.length,
        scene: record
      })
    }
  }

  return results
}

module.exports = {
  renderSceneClips
}
