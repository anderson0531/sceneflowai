const ffmpeg = require('fluent-ffmpeg')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
const ffprobeInstaller = require('@ffprobe-installer/ffprobe')

const normalizePath = (installerPath, isPackaged) => {
  if (!installerPath || typeof installerPath !== 'string') {
    return installerPath
  }

  if (!isPackaged) {
    return installerPath
  }

  return installerPath.replace('app.asar', 'app.asar.unpacked')
}

function configureFfmpegPaths(app) {
  const isPackaged = Boolean(app && app.isPackaged)
  const resolve = (path) => normalizePath(path, isPackaged)

  const ffmpegPath = resolve(ffmpegInstaller.path)
  const ffprobePath = resolve(ffprobeInstaller.path)

  ffmpeg.setFfmpegPath(ffmpegPath)
  ffmpeg.setFfprobePath(ffprobePath)

  return {
    ffmpegPath,
    ffprobePath
  }
}

module.exports = {
  configureFfmpegPaths,
  normalizePath
}
